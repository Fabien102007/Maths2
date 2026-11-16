const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const visualLayout = document.querySelector(".visual-layout");
const storeKey = "demosmaths1_progress_v1";
let state;
try {
  state = JSON.parse(localStorage.getItem(storeKey) || '{"mastered":[],"sessions":0,"seen":[]}');
} catch (error) {
  console.warn("Progression locale illisible, réinitialisation des données locales.", error);
  state = { mastered: [], sessions: 0, seen: [] };
}
if (!state || !Array.isArray(state.mastered) || !Array.isArray(state.seen) || !Number.isFinite(state.sessions)) {
  state = { mastered: [], sessions: 0, seen: [], reviews: {} };
}
if (!state.reviews || typeof state.reviews !== "object") state.reviews = {};
let activeLevel="Tous", activeRefLevel="Tous", activeCategory="Toutes", currentCard=0, flipped=false, dueOnly=false, activeVisual="convergence", visualTimer=null;
function save(){localStorage.setItem(storeKey,JSON.stringify(state));updateStats();}
function reviewInfo(card){return state.reviews[card.q]||{due:0,interval:0,repetitions:0};}
function dueCards(cards=MATH_CARDS){const now=Date.now();return cards.filter(card=>!reviewInfo(card).due||reviewInfo(card).due<=now);}
function scheduleCard(card,rating){const old=reviewInfo(card);const days=rating==="again"?1:rating==="difficult"?Math.max(2,Math.round((old.interval||1)*1.5)):rating==="good"?[1,3,7,14,30][Math.min(old.repetitions||0,4)]:Math.max(7,Math.round((old.interval||3)*2));state.reviews[card.q]={interval:days,repetitions:rating==="again"?0:(old.repetitions||0)+1,due:Date.now()+days*86400000,last:Date.now(),rating};save();}
function dueCount(){return dueCards().length;}
function updateStats(){
 const total=MATH_TOPICS.length, done=state.mastered.length;
 $("#statTopics").textContent=total;$("#statCards").textContent=MATH_CARDS.length;$("#statMastered").textContent=done;$("#statSessions").textContent=state.sessions;
 $("#masteredSub").textContent=done?`${Math.round(done/total*100)} % du référentiel`:"À construire progressivement";
 $("#progressPercent").textContent=Math.round(done/total*100)+"%";$("#progressCount").textContent=`${done} sur ${total} notions`;$(" #bigProgressBar".trim()).style.width=(done/total*100)+"%";
 $("#sessionCount").textContent=state.sessions;
 const a=MATH_TOPICS.filter(t=>t.category==="Analyse"),b=MATH_TOPICS.filter(t=>t.category==="Algèbre");
 $("#analysisBar").style.width=(a.filter(t=>state.mastered.includes(t.id)).length/a.length*100)+"%";
 $("#algebraBar").style.width=(b.filter(t=>state.mastered.includes(t.id)).length/b.length*100)+"%";
}
function go(view){
 $$(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+view));
 $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view || (view==="topic"&&b.dataset.view==="learn")));
 const names={home:"VUE D'ENSEMBLE",learn:"APPRENDRE",topic:"NOTION",cards:"FLASHCARDS",visuals:"VISUALISATIONS",exercises:"EXERCICES",reference:"RÉFÉRENTIEL",progress:"PROGRESSION"};
 $("#currentSection").textContent=names[view]||view.toUpperCase();$("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
 if(view==="progress")renderProgress();
}
$$("[data-view]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.view)));
$$("[data-goto]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.goto)));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#todayLabel").textContent=new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short"}).format(new Date()).toUpperCase();

function renderTopics(){
 const q=$("#topicSearch").value.toLocaleLowerCase("fr");
 const items=MATH_TOPICS.filter(t=>(activeLevel==="Tous"||t.level===activeLevel)&&((t.title+" "+t.desc+" "+t.category+" "+(t.chapter||"")).toLocaleLowerCase("fr").includes(q)));
 const groups=[...new Set(items.map(t=>t.chapter||t.category+" — notions"))];
 $("#topicGrid").innerHTML=groups.map(chapter=>{
  const group=items.filter(t=>(t.chapter||t.category+" — notions")===chapter);
  return '<section class="chapter-group"><div class="chapter-heading"><span class="eyebrow">'+group[0].category.toUpperCase()+'</span><h2>'+chapter+'</h2><small>'+group.length+' notion(s)</small></div><div class="chapter-cards">'+group.map(t=>'<article class="topic-card" data-topic="'+t.id+'" tabindex="0"><div class="topic-meta"><span class="level-pill">'+t.level+'</span><span class="category-pill">'+t.category+'</span></div><h3>'+t.title+'</h3><p>'+t.desc+'</p><div class="topic-card-foot"><span>'+t.duration+' · '+(state.mastered.includes(t.id)?"Maîtrisée":"À découvrir")+'</span><b>↗</b></div></article>').join("")+'</div></section>';
 }).join("")||'<p class="muted">Aucune notion ne correspond à cette recherche.</p>';
 $$(".topic-card").forEach(el=>{const open=()=>showTopic(el.dataset.topic);el.addEventListener("click",open);el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})});
}
$$("[data-level]").forEach(b=>b.addEventListener("click",()=>{$$(".filter",$("#levelFilters")).forEach(x=>x.classList.remove("active"));b.classList.add("active");activeLevel=b.dataset.level;renderTopics()}));
$("#topicSearch").addEventListener("input",renderTopics);

let activeDifficulty="Tous";
function texFormula(value){const raw=String(value??"");if(!raw)return "";if(raw.includes("\\(")||raw.includes("\\["))return raw;return "\\("+raw+"\\)";}
function mathText(value){
 const symbols={"ℝ":"\\mathbb{R}","ℕ":"\\mathbb{N}","ℤ":"\\mathbb{Z}","ℚ":"\\mathbb{Q}","ℂ":"\\mathbb{C}","ε":"\\varepsilon","δ":"\\delta","λ":"\\lambda","μ":"\\mu","π":"\\pi","θ":"\\theta","∀":"\\forall","∃":"\\exists","∈":"\\in","∉":"\\notin","≤":"\\leq","≥":"\\geq","≠":"\\ne","⇒":"\\Rightarrow","⇔":"\\Leftrightarrow","→":"\\to","∑":"\\sum","∫":"\\int","∞":"\\infty","∩":"\\cap","∪":"\\cup","⊂":"\\subset","⊕":"\\oplus","×":"\\times","·":"\\cdot"};
 let s=String(value??"");
 const sub={"₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9","ₙ":"n","ₚ":"p","ₖ":"k","ₘ":"m"};
 const sup={"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","ⁿ":"n"};
 s=s.replace(/([A-Za-z])([₀₁₂₃₄₅₆₇₈₉ₙₚₖₘ])/g,(_,a,b)=>"\\("+a+"_{"+sub[b]+"}\\)");
 s=s.replace(/([A-Za-z0-9])([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ])/g,(_,a,b)=>"\\("+a+"^{"+sup[b]+"}\\)");
 s=s.replace(/([A-Za-z])′/g,(_,a)=>"\\("+a+"'\\)");
 return s.replace(/[ℝℕℤℚℂεδλμπθ∀∃∈∉≤≥≠⇒⇔→∑∫∞∩∪⊂⊕×·]/g,ch=>"\\("+symbols[ch]+"\\)");
}
function typesetMath(root){if(!window.MathJax||!window.MathJax.typesetPromise)return;try{window.MathJax.typesetClear?.([root]);window.MathJax.typesetPromise([root]).catch(()=>{});}catch(e){console.warn("MathJax:",e);}}
function renderExercises(){
 const q=$("#exerciseSearch").value.toLocaleLowerCase("fr"),topics=new Map(MATH_TOPICS.map(t=>[t.id,t])),rank={"Facile":0,"Intermédiaire":1,"Avancé":2};
 const items=(window.MATH_EXERCISES||[]).filter(ex=>(activeDifficulty==="Tous"||ex.difficulty===activeDifficulty)).filter(ex=>{const t=topics.get(ex.topic);return (ex.question+" "+(t?.title||ex.topic)+" "+(t?.chapter||"")).toLocaleLowerCase("fr").includes(q);}).sort((a,b)=>(rank[a.difficulty]??9)-(rank[b.difficulty]??9)||a.id-b.id);
 const groups=[...new Set(items.map(ex=>topics.get(ex.topic)?.chapter||"Exercices complémentaires"))];
 $("#exerciseList").innerHTML=groups.map(chapter=>{
  const group=items.filter(ex=>(topics.get(ex.topic)?.chapter||"Exercices complémentaires")===chapter);
  const cards=group.map(ex=>{const t=topics.get(ex.topic);return '<article class="panel exercise-item"><div class="exercise-meta"><span class="level-pill">'+(t?.level||"L1")+'</span><span class="category-pill">'+(t?.category||"Mathématiques")+'</span><span class="difficulty-pill difficulty-'+(rank[ex.difficulty]??0)+'">'+ex.difficulty+'</span></div><h3>'+(t?.title||"Exercice")+'</h3><p class="exercise-prompt">'+mathText(ex.question)+'</p><div class="exercise-actions"><button class="secondary-btn" data-hint="'+ex.id+'">Afficher un indice</button><button class="secondary-btn" data-answer="'+ex.id+'">Voir la correction</button>'+(t?'<button class="text-action" data-open-topic="'+t.id+'">Ouvrir le cours ↗</button>':"")+'</div><div class="exercise-hint" data-hint-panel="'+ex.id+'" hidden>'+mathText(ex.hint)+'</div><div class="exercise-answer" data-answer-panel="'+ex.id+'" hidden>'+mathText(ex.answer)+'</div></article>';}).join("");
  return '<section class="exercise-chapter"><div class="chapter-heading"><span class="eyebrow">ENTRAÎNEMENT PAR CHAPITRE</span><h2>'+chapter+'</h2><small>'+group.length+' exercice(s)</small></div><div class="exercise-cards">'+cards+'</div></section>';
 }).join("")||'<p class="muted">Aucun exercice ne correspond à ces filtres.</p>';
 $$("#exerciseList [data-hint]").forEach(b=>b.addEventListener("click",()=>{const el=$('[data-hint-panel="'+b.dataset.hint+'"]');el.hidden=!el.hidden;b.textContent=el.hidden?"Afficher un indice":"Masquer l'indice";if(!el.hidden)typesetMath(el);}));
 $$("#exerciseList [data-answer]").forEach(b=>b.addEventListener("click",()=>{const el=$('[data-answer-panel="'+b.dataset.answer+'"]');el.hidden=!el.hidden;b.textContent=el.hidden?"Voir la correction":"Masquer la correction";if(!el.hidden)typesetMath(el);}));
 // Délégation robuste : le lien reste fonctionnel après chaque nouveau rendu.
 document.addEventListener("click",event=>{
  const button=event.target.closest("#exerciseList [data-open-topic]");
  if(!button)return;
  event.preventDefault();
  showTopic(button.dataset.openTopic);
 });
 typesetMath($("#exerciseList"));
}
$$("[data-difficulty]").filter(b=>b.closest("#exerciseDifficulty")).forEach(b=>b.addEventListener("click",()=>{$$("#exerciseDifficulty .filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeDifficulty=b.dataset.difficulty;renderExercises();}));
$("#exerciseSearch").addEventListener("input",renderExercises);

const EXERCISES={
 schmidt:{q:"Dans ℝ², prends v₁=(1,0) et v₂=(1,1). Quelle est la projection de v₂ sur v₁, puis le vecteur orthogonal obtenu ?",a:"⟨v₂,v₁⟩/‖v₁‖²=1, donc projᵥ₁(v₂)=(1,0). Le résidu vaut w₂=(1,1)−(1,0)=(0,1). Les deux vecteurs sont déjà unitaires et orthogonaux."},
 fourier:{q:"Quelle est l'idée de l'approximation de Fourier quand on augmente le nombre d'harmoniques ?",a:"On ajoute des sinus et cosinus de fréquences multiples. La somme partielle contient davantage d'information sur la forme périodique et approche la fonction selon les hypothèses de convergence."},
 "developpements-limites":{q:"Écris le développement limité de eˣ à l'ordre 3 en 0.",a:"eˣ=1+x+x²/2+x³/6+o(x³), lorsque x tend vers 0."},
 determinant:{q:"Une matrice 2×2 a un déterminant égal à −3. Que devient l'aire d'une figure après transformation ?",a:"L'aire est multipliée par |det(A)|=3. Le signe négatif indique que l'orientation est inversée."},
 "fonctions-deux-variables":{q:"Pour f(x,y)=x²+y², décris les lignes de niveau f(x,y)=c.",a:"Pour c≥0, ce sont les cercles de centre O et de rayon √c. Pour c<0, il n'y a aucun point réel."},
 "somme-directe":{q:"Dans ℝ², F est l'axe horizontal et G l'axe vertical. Pourquoi ℝ²=F⊕G ?",a:"Tout (x,y) s'écrit de manière unique (x,0)+(0,y), et F∩G={(0,0)}."},
 "groupes-anneaux-corps":{q:"Pourquoi ℤ est-il un anneau mais pas un corps ?",a:"ℤ possède l'addition et la multiplication avec les axiomes d'anneau. Mais 2, par exemple, n'a pas d'inverse multiplicatif dans ℤ : 1/2 n'est pas entier."},
 hyperplan:{q:"Dans ℝ³, quelle est la dimension de H={(x,y,z):x+2y−z=0} ?",a:"La forme linéaire (x,y,z)↦x+2y−z est non nulle, donc son noyau est un hyperplan de dimension 3−1=2."},
 "integrales-generalisees":{q:"Pour quelles valeurs de p l'intégrale ∫₁⁺∞ 1/xᵖ dx converge-t-elle ?",a:"Elle converge si et seulement si p>1. Pour p=1, on obtient la divergence logarithmique ; pour p<1, la limite est également infinie."},
 "ev-normes":{q:"Quelle propriété de la norme permet de majorer ‖x+y‖ ?",a:"L'inégalité triangulaire : ‖x+y‖≤‖x‖+‖y‖."},
 legendre:{q:"Pourquoi P₀(x)=1 et P₁(x)=x sont-ils orthogonaux sur [−1,1] ?",a:"Leur produit scalaire vaut ∫₋₁¹1·x dx=0, car x est impaire et l'intervalle est symétrique."}
};
const QUIZZES={
"suite-limite":{q:"Dans la définition de uₙ → ℓ, le rang N dépend de…",options:["ε, mais pas de n","n, mais pas de ε","ni de ε ni de n"],correct:0,why:"On fixe ε, puis on choisit N(ε). Ensuite l'inégalité doit être vraie pour tout n ≥ N."},
continuite:{q:"Quelle condition caractérise la continuité de f en a ?",options:["La limite en a existe et vaut f(a)","f est dérivable en a","f(a)=0"],correct:0,why:"La continuité en a équivaut à lim(x→a) f(x)=f(a)."},
derivee:{q:"Que représente géométriquement f′(a) ?",options:["L'ordonnée à l'origine","La pente de la tangente en a","L'aire sous la courbe"],correct:1,why:"Le nombre dérivé est la limite du taux d'accroissement, donc la pente de la tangente."},
"theoreme-valeurs-intermediaires":{q:"Le TVI garantit…",options:["Une solution unique","Au moins une solution pour une valeur intermédiaire","Que f est strictement croissante"],correct:1,why:"La continuité garantit l'existence d'un antécédent, pas son unicité."},
integrale:{q:"Si f est négative sur [a,b], alors son intégrale est…",options:["Négative ou nulle","Toujours positive","Nécessairement nulle"],correct:0,why:"L'intégrale est une aire algébrique : les contributions sous l'axe sont négatives."},
"espaces-vectoriels":{q:"Pour montrer qu'une partie non vide F est un sous-espace, on vérifie…",options:["La stabilité par combinaison linéaire","Que tous ses vecteurs sont unitaires","Qu'elle est bornée"],correct:0,why:"La stabilité par λu+μv suffit avec la non-vacuité."},
"familles-liberes":{q:"Une famille est libre si…",options:["Elle contient le vecteur nul","La seule combinaison linéaire nulle est triviale","Elle engendre toujours E"],correct:1,why:"La relation λ₁e₁+…+λₚeₚ=0 impose tous les coefficients nuls."},
"applications-lineaires":{q:"Toute application linéaire f vérifie…",options:["f(0)=0","f(0)=1","f est injective"],correct:0,why:"La linéarité impose f(0)=0, mais pas nécessairement l'injectivité."},
diagonalisation:{q:"Une matrice est diagonalisable si…",options:["Elle est toujours inversible","Elle possède une base de vecteurs propres","Son déterminant vaut 1"],correct:1,why:"Il existe une base dans laquelle sa matrice est diagonale."},
determinant:{q:"En dimension 2, |det(A)| représente…",options:["Le facteur de multiplication des aires","La longueur de chaque vecteur","La trace de A"],correct:0,why:"L'aire du parallélogramme image du carré unité vaut |det(A)|."},
"developpements-limites":{q:"Un développement limité en 0 décrit principalement…",options:["Le comportement local près de 0","La fonction pour tout réel","Uniquement les valeurs en +∞"],correct:0,why:"Le reste o(xⁿ) est défini lorsque x tend vers 0."},
"somme-directe":{q:"Pour avoir E=F⊕G, il faut notamment…",options:["F=G","F∩G={0} et F+G=E","F et G de même dimension"],correct:1,why:"L'intersection triviale assure l'unicité et F+G=E l'existence."}
};

function showTopic(id){
 const t=MATH_TOPICS.find(x=>x.id===id);if(!t)return;
 $("#topicDetail").innerHTML=`<div class="detail-header"><div class="topic-meta"><span class="level-pill">${t.level}</span><span class="category-pill">${t.category}</span></div><h1>${t.title}</h1><p>${t.desc}</p></div><div class="detail-content"><article class="panel detail-block"><h3>Définition essentielle</h3><p>${mathText(t.definition)}</p><div class="math-formula">${texFormula(t.formula)}</div><div id="topicVisualHost" class="topic-visual-host"></div><h3>Comment raisonner ?</h3><p>${mathText(t.proof)}</p><h3>Points de vigilance</h3><ul>${t.points.map(p=>`<li>${mathText(p)}</li>`).join("")}</ul></article><aside class="panel detail-block"><h3>Exemple</h3><p>${mathText(t.example)}</p><div class="callout"><b>Conseil de méthode</b><br>Essaie de reformuler la définition sans regarder, puis démontre un résultat simple qui l'utilise.</div><button class="primary-btn" id="topicCards" style="margin-top:18px;width:100%">Réviser avec les cartes →</button><button class="secondary-btn" id="toggleMastery" style="margin-top:9px;width:100%">${state.mastered.includes(t.id)?"Retirer des notions maîtrisées":"Marquer comme maîtrisée ✓"}</button></aside></div><section class="panel course-expansion" id="courseExpansion"></section><article class="panel exercise-panel"><span class="eyebrow">PASSER À LA PRATIQUE</span><h2>Vérifie que tu as compris.</h2><p class="muted">Réponds sans regarder le cours, puis affiche la correction détaillée.</p><div class="exercise-question"><b>${(EXERCISES[t.id]||{q:"Reformule la définition avec tes propres mots et donne un exemple."}).q}</b></div><button class="secondary-btn" id="showHint">Voir un indice</button><div class="exercise-hint" id="exerciseHint" hidden>Repars de la définition et identifie les hypothèses à utiliser avant de chercher le résultat.</div><button class="secondary-btn" id="showExercise" style="margin-top:9px">Afficher la correction détaillée</button><div class="exercise-answer" id="exerciseAnswer" hidden>${mathText((EXERCISES[t.id]||{a:"Une bonne réponse doit reprendre les hypothèses, la définition précise et un exemple pertinent."}).a)}</div></article><article class="panel exercise-panel quiz-panel"><span class="eyebrow">TEST RAPIDE</span><h2>Vérifie ton raisonnement.</h2><div id="topicQuiz"></div></article>`;
 typesetMath($("#topicDetail"));
 const courseHost=$("#courseExpansion"),sections=t.courseSections||[];
 if(courseHost){
  courseHost.innerHTML=sections.length
   ? '<span class="eyebrow">COURS COMPLET · À MAÎTRISER</span><h2>Comprendre en profondeur</h2>'+sections.map(section=>'<article class="course-section"><h3>'+section.title+'</h3><p>'+mathText(section.body||"")+'</p>'+(section.formula?'<div class="math-formula">'+texFormula(section.formula)+'</div>':'')+(section.example?'<div class="course-example"><b>Exemple détaillé</b><p>'+mathText(section.example)+'</p></div>':'')+'</article>').join('')
   : '<span class="eyebrow">COURS</span><h2>Fiche de révision</h2><p>Reprends la définition, les hypothèses et la démonstration. Essaie ensuite de refaire un exercice sans regarder la correction.</p>';
  typesetMath(courseHost);
 }

 const visualMap={
  "suite-limite":["convergence"],
  "continuite":["continuity","limit"],
  "derivee":["derivative"],
  "theoreme-valeurs-intermediaires":["ivt"],
  "integrale":["integral"],
  "series":["fourier"],
  "uniforme":["convergence"],
  "espaces-vectoriels":["directsum"],
  "familles-liberes":["basis"],
  "applications-lineaires":["injectivity","surjectivity","linear"],
  "diagonalisation":["eigen"],
  "schmidt":["schmidt"],
  "fourier":["fourier"],
  "developpements-limites":["taylor"],
  "determinant":["determinant"],
  "fonctions-deux-variables":["surface"],
  "somme-directe":["directsum"]
 };
 const availableVisuals=visualMap[t.id]||[];
 if(availableVisuals.length&&visualLayout){
  const host=$("#topicVisualHost");
  host.innerHTML='<div class="topic-visual-heading"><span class="eyebrow">VISUALISER POUR COMPRENDRE</span><label class="visual-picker-label">Animation associée <select id="topicVisualPicker">'+availableVisuals.map(v=>'<option value="'+v+'">'+visualConfig[v].title+'</option>').join("")+'</select></label></div>';
  host.appendChild(visualLayout);
  setVisual(availableVisuals[0]);
  $("#topicVisualPicker").addEventListener("change",e=>setVisual(e.target.value));
 }
 $("#showHint").addEventListener("click",()=>{$("#exerciseHint").hidden=!$("#exerciseHint").hidden;});$("#showExercise").addEventListener("click",()=>{$("#exerciseAnswer").hidden=!$("#exerciseAnswer").hidden;});const quiz=QUIZZES[t.id];$("#topicQuiz").innerHTML=quiz?`<p class="quiz-question">${quiz.q}</p><div class="quiz-options">${quiz.options.map((option,i)=>`<button class="quiz-option" data-choice="${i}">${option}</button>`).join("")}</div><p class="quiz-feedback" id="quizFeedback" hidden></p>`:'<p class="muted">Pour cette notion, entraîne-toi avec la question guidée ci-dessus et vérifie chaque hypothèse de la définition.</p>';$("#topicQuiz [data-choice]").forEach(button=>button.addEventListener("click",()=>{const choice=Number(button.dataset.choice);$("#topicQuiz [data-choice]").forEach((b,i)=>{b.disabled=true;b.classList.toggle("correct",i===quiz.correct);b.classList.toggle("incorrect",i===choice&&choice!==quiz.correct)});const feedback=$("#quizFeedback");feedback.hidden=false;feedback.textContent=(choice===quiz.correct?"Bonne réponse. ":"Pas tout à fait. ")+quiz.why;}));$("#topicCards").addEventListener("click",()=>{activeCategory=t.category;currentCard=MATH_CARDS.findIndex(c=>c.cat===t.category);if(currentCard<0)currentCard=0;go("cards");renderCard()});
 $("#toggleMastery").addEventListener("click",()=>{if(state.mastered.includes(t.id))state.mastered=state.mastered.filter(x=>x!==t.id);else state.mastered.push(t.id);save();showTopic(id);renderTopics()});
 go("topic");
}

function renderCard(){
 const all=MATH_CARDS.filter(c=>activeCategory==="Toutes"||c.cat===activeCategory),cards=dueOnly?dueCards(all):all;
 if(!cards.length){$("#flashCategory").textContent="RÉVISIONS";$("#flashNumber").textContent="—";$("#flashSide").textContent="BIEN JOUÉ";$("#flashQuestion").textContent=dueOnly?"Aucune carte à revoir pour le moment.":"Aucune carte dans cette sélection.";$("#cardCounter").textContent=dueOnly?"Toutes les cartes sont à jour.":"Sélection vide.";$("#masteryActions").hidden=true;$("#flipCard").disabled=true;return;}
 $("#flipCard").disabled=false;currentCard=Math.max(0,Math.min(currentCard,cards.length-1));const c=cards[currentCard];flipped=false;
 $("#flashcard").classList.remove("flipped");$("#flashCategory").textContent=`${c.cat.toUpperCase()} · ${c.level}`;$("#flashNumber").textContent=`${String(currentCard+1).padStart(2,"0")} / ${cards.length}`;
 $("#flashSide").textContent="QUESTION";$("#flashQuestion").textContent=c.q;
 const info=reviewInfo(c),due=info.due?new Date(info.due).toLocaleDateString("fr-FR"):"À découvrir";
 $("#cardCounter").textContent=`${cards.length} cartes · ${dueCount()} à découvrir / revoir · prochaine échéance : ${due}`;
 $("#masteryActions").hidden=true;$("#flipCard").textContent="Voir la réponse ↻";
}
function flip(){
 let all=MATH_CARDS.filter(c=>activeCategory==="Toutes"||c.cat===activeCategory),cards=dueOnly?dueCards(all):all;if(!cards.length)return;
 const c=cards[currentCard];flipped=!flipped;$("#flashcard").classList.toggle("flipped",flipped);
 $("#flashSide").textContent=flipped?"RÉPONSE":"QUESTION";$("#flashQuestion").textContent=flipped?c.a:c.q;$("#flipCard").textContent=flipped?"Revoir la question ↻":"Voir la réponse ↻";$("#masteryActions").hidden=!flipped;
 if(flipped&&!state.seen.includes(c.q)){state.seen.push(c.q);save();}
}
$("#flashcard").addEventListener("click",flip);$("#flipCard").addEventListener("click",flip);
function shiftCard(d){let all=MATH_CARDS.filter(c=>activeCategory==="Toutes"||c.cat===activeCategory),cards=dueOnly?dueCards(all):all;if(!cards.length)return;currentCard=(currentCard+d+cards.length)%cards.length;renderCard()}
$("#prevCard").addEventListener("click",()=>shiftCard(-1));$("#nextCard").addEventListener("click",()=>shiftCard(1));
function rateCurrent(rating){let all=MATH_CARDS.filter(c=>activeCategory==="Toutes"||c.cat===activeCategory),cards=dueOnly?dueCards(all):all;if(!cards.length)return;scheduleCard(cards[currentCard],rating);if(dueOnly)currentCard=Math.min(currentCard,Math.max(0,dueCards(all).length-1));renderCard();}
$("#markKnown").addEventListener("click",()=>rateCurrent("good"));$("#markReview").addEventListener("click",()=>rateCurrent("again"));
$("#markDifficult").addEventListener("click",()=>rateCurrent("difficult"));$("#markEasy").addEventListener("click",()=>rateCurrent("easy"));
$("#dueOnly").addEventListener("click",()=>{dueOnly=!dueOnly;$("#dueOnly").classList.toggle("active",dueOnly);$("#dueOnly").textContent=dueOnly?"Afficher toutes les cartes":"Révisions à faire";currentCard=0;renderCard()});

function renderRefs(){
 const q=$("#refSearch").value.toLowerCase();const items=MATH_REFERENCES.filter(r=>(activeRefLevel==="Tous"||r.level===activeRefLevel)&&(`${r.title} ${r.body} ${r.cat}`).toLowerCase().includes(q));
 $("#referenceList").innerHTML=items.map((r,i)=>`<article class="ref-item"><div class="ref-head"><span class="ref-symbol">${r.cat==="Analyse"?"ƒ":"A"}</span><strong>${r.title}</strong><span class="level-pill">${r.level}</span><span class="chevron">⌄</span></div><div class="ref-body">${mathText(r.body)}<br><span class="ref-formula">${texFormula(r.formula)}</span></div></article>`).join("")||'<p class="muted">Aucun résultat.</p>';
 $$(".ref-head").forEach(h=>h.addEventListener("click",()=>{h.parentElement.classList.toggle("open");if(h.parentElement.classList.contains("open"))typesetMath(h.parentElement);}));typesetMath($("#referenceList"));
}
$$("[data-reflevel]").forEach(b=>b.addEventListener("click",()=>{$$("#refFilters .filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeRefLevel=b.dataset.reflevel;renderRefs()}));
$("#refSearch").addEventListener("input",renderRefs);

function renderProgress(){
 updateStats();const due=dueCount(),reviewed=Object.keys(state.reviews).length;$("#reviewSummary").innerHTML=`<div class="review-summary-card"><strong>${due}</strong><span>cartes à découvrir / revoir</span></div><div class="review-summary-card"><strong>${reviewed}</strong><span>cartes déjà planifiées</span></div><button class="secondary-btn" id="startDueReviews">Commencer les révisions →</button>`;$("#startDueReviews").addEventListener("click",()=>{dueOnly=true;$("#dueOnly").classList.add("active");$("#dueOnly").textContent="Afficher toutes les cartes";currentCard=0;go("cards");renderCard()});$("#progressList").innerHTML=MATH_TOPICS.map(t=>`<div class="progress-row"><span class="status-dot ${state.mastered.includes(t.id)?"done":""}"></span><span class="p-name">${t.title}</span><small>${t.level} · ${t.category}</small><button data-progress="${t.id}">${state.mastered.includes(t.id)?"Maîtrisée ✓":"Marquer maîtrisée"}</button></div>`).join("");
 $$("[data-progress]").forEach(b=>b.addEventListener("click",()=>{const id=b.dataset.progress;state.mastered=state.mastered.includes(id)?state.mastered.filter(x=>x!==id):[...state.mastered,id];save();renderProgress()}));
}
$("#addSession").addEventListener("click",()=>{state.sessions++;save();renderProgress()});
$("#resetProgress").addEventListener("click",()=>{if(confirm("Réinitialiser les notions maîtrisées et les séances enregistrées sur cet appareil ?")){state={mastered:[],sessions:0,seen:[],reviews:{}};save();renderProgress();renderCard()}});
updateStats();renderTopics();renderExercises();renderCard();renderRefs();renderProgress();
window.addEventListener("load",()=>{typesetMath($("#view-learn"));typesetMath($("#view-exercises"));typesetMath($("#view-reference"));});

/* Visualisations interactives — chaque modèle possède ses propres paramètres. */
const canvas=$("#mathCanvas"),ctx=canvas.getContext("2d");
const visualConfig={
 convergence:{eyebrow:"ANALYSE · SUITES",title:"Convergence d'une suite",control:"Faire varier ε et le rang",caption:"Les points représentent les termes uₙ = 1/(n+1). La bande bleue est le voisinage de la limite 0.",insight:"Pour tout ε > 0, on peut trouver N tel que n ≥ N implique |uₙ − 0| < ε. La ligne verticale indique un rang à partir duquel les termes entrent dans la bande."},
 limit:{eyebrow:"ANALYSE · LIMITES",title:"Limite d'une fonction",control:"Approcher le point a",caption:"Observe f(x) = (x² − 1)/(x − 1) lorsque x se rapproche de 1. La fonction vaut  x + 1 sauf au point x = 1.",insight:"La limite dépend des valeurs prises près du point, pas nécessairement de la valeur de la fonction au point. Ici la limite vaut 2, même si f(1) n'est pas définie."},
 continuity:{eyebrow:"ANALYSE · CONTINUITÉ",title:"Continuité ou rupture ?",control:"Déplacer le point x",caption:"Compare la valeur f(x) à la hauteur vers laquelle la courbe tend au point a.",insight:"Une fonction est continue en a si sa limite en a existe et vaut f(a). Le trou ou le saut rend cette égalité impossible."},
 derivative:{eyebrow:"ANALYSE · DÉRIVATION",title:"De la sécante à la tangente",control:"Faire tendre h vers 0",caption:"La droite orange est une sécante. Elle se rapproche de la tangente verte lorsque h tend vers 0.",insight:"Le nombre dérivé f′(a) est la limite du taux d'accroissement. Il représente la pente de la tangente à la courbe."},
 ivt:{eyebrow:"ANALYSE · TVI",title:"Théorème des valeurs intermédiaires",control:"Choisir la valeur cible",caption:"Une fonction continue sur [a,b] prend toutes les valeurs comprises entre f(a) et f(b).",insight:"Si y est entre f(a) et f(b), le TVI garantit au moins un c dans [a,b] tel que f(c)=y. Il ne garantit pas l'unicité."},
 integral:{eyebrow:"ANALYSE · INTÉGRALE",title:"L'intégrale comme aire algébrique",control:"Modifier les bornes et les rectangles",caption:"L'aire sous la courbe est approchée par des rectangles. Augmenter leur nombre affine l'approximation.",insight:"L'intégrale est une limite de sommes de Riemann. Les zones sous l'axe comptent négativement : il s'agit d'une aire algébrique."},
 trig:{eyebrow:"ANALYSE · TRIGONOMÉTRIE",title:"Le cercle trigonométrique",control:"Faire tourner l'angle",caption:"Le point M sur le cercle unité a pour coordonnées (cos θ, sin θ).",insight:"Le cosinus est l'abscisse et le sinus l'ordonnée. Un tour complet correspond à 2π radians, soit 360°."},
 injectivity:{eyebrow:"ALGÈBRE · APPLICATIONS",title:"Comprendre l'injectivité",control:"Changer la fonction",caption:"Deux éléments distincts de l'ensemble de départ ne doivent jamais avoir la même image.",insight:"f est injective si f(x₁)=f(x₂) implique x₁=x₂. Visuellement, toute droite horizontale coupe la courbe au plus une fois."},
 surjectivity:{eyebrow:"ALGÈBRE · APPLICATIONS",title:"Comprendre la surjectivité",control:"Choisir l'ensemble d'arrivée",caption:"Chaque élément de l'ensemble d'arrivée doit être atteint par au moins un élément de départ.",insight:"f est surjective de E vers F si Im(f)=F. La surjectivité dépend donc de l'ensemble d'arrivée choisi."},
 linear:{eyebrow:"ALGÈBRE · APPLICATIONS LINÉAIRES",title:"Transformer le plan",control:"Faire varier le cisaillement",caption:"La grille et les vecteurs sont transformés par une application linéaire.",insight:"Une application linéaire préserve les combinaisons linéaires et envoie l'origine sur l'origine. Ici f(x,y)=(x, y+kx)."},
 basis:{eyebrow:"ALGÈBRE · ESPACES VECTORIELS",title:"Famille libre ou liée ?",control:"Faire varier le second vecteur",caption:"Deux vecteurs du plan forment une base si et seulement s'ils ne sont pas colinéaires.",insight:"Le déterminant des deux vecteurs est non nul exactement lorsqu'ils forment une famille libre et donc une base de ℝ²."},
 eigen:{eyebrow:"ALGÈBRE · VALEURS PROPRES",title:"Visualiser les directions propres",control:"Modifier la matrice",caption:"La matrice étire les vecteurs. Les directions propres restent sur leur droite après transformation.",insight:"Un vecteur propre non nul vérifie Av=λv. Sa direction est conservée (ou inversée si λ est négatif) et λ est le facteur d'échelle."},
 schmidt:{eyebrow:"L2 · ALGÈBRE · ORTHOGONALISATION",title:"Procédé de Gram-Schmidt en dimension 2",control:"Modifier les deux vecteurs",caption:"v₁ est bleu, v₂ turquoise ; la projection de v₂ sur v₁ est orange et le résidu orthogonal est violet. La construction est limitée à deux vecteurs du plan.",insight:"On pose w₂=v₂−projᵥ₁(v₂). Alors ⟨w₂,v₁⟩=0. Les vecteurs normalisés donnent une base orthonormée."},
 fourier:{eyebrow:"L2 · ANALYSE · FOURIER",title:"Reconstruire une fonction périodique",control:"Ajouter des harmoniques",caption:"La somme partielle de Fourier approche une onde carrée par addition de sinus impairs.",insight:"Chaque harmonique ajoute une fréquence. Près des sauts, les oscillations de Gibbs persistent même quand le nombre de termes augmente."},
 taylor:{eyebrow:"L1 · ANALYSE · DÉVELOPPEMENTS LIMITÉS",title:"Approcher une fonction par ses polynômes",control:"Choisir la fonction et l'ordre",caption:"La courbe bleue est la fonction ; la courbe turquoise est son polynôme de Taylor en 0. Fais varier l'ordre pour voir l'approximation locale s'améliorer.",insight:"Le développement limité décrit le comportement local près du point de développement, ici 0. Il ne garantit pas une bonne approximation loin de 0."},
 determinant:{eyebrow:"L1 · ALGÈBRE · DÉTERMINANT",title:"Le déterminant transforme les aires",control:"Modifier la matrice",caption:"Le carré unité est transformé en parallélogramme. Son aire vaut |det(A)| et son orientation dépend du signe du déterminant.",insight:"Un déterminant nul écrase le carré sur un segment ou un point ; un déterminant négatif inverse l'orientation."},
 surface:{eyebrow:"L2 · ANALYSE · DEUX VARIABLES",title:"Surface z=f(x,y)",control:"Explorer la surface 3D",caption:"Projection 3D d'une surface z=f(x,y). Fais varier l'angle de vue et la forme pour explorer ses reliefs.",insight:"Les hauteurs donnent f(x,y). Les coupes et les lignes de niveau permettent de lire le comportement de la fonction de deux variables."},
 directsum:{eyebrow:"L1 · ALGÈBRE · SOMME DIRECTE",title:"Décomposer un vecteur",control:"Faire tourner les sous-espaces",caption:"Le vecteur v est décomposé en une composante sur F et une composante sur G. Si les deux droites sont distinctes, la décomposition est unique.",insight:"Dans le plan, deux droites vectorielles distinctes se coupent uniquement en 0 et leur somme est ℝ² : c'est une somme directe."}
};
const visualOrder=["convergence","limit","continuity","derivative","ivt","integral","trig","injectivity","surjectivity","linear","basis","determinant","directsum","schmidt","fourier","taylor","surface","eigen"];
const visualControls={
 convergence:`<div class="control-row"><label>Précision ε <output id="epsOut">0,20</output></label><input id="epsSlider" type="range" min="0.05" max="0.8" step="0.05" value="0.2"></div><div class="control-row"><label>Nombre de termes <output id="nOut">20</output></label><input id="nSlider" type="range" min="5" max="40" step="1" value="20"></div>`,
 limit:`<div class="control-row"><label>Écart |x − 1| <output id="nearOut">0,80</output></label><input id="nearSlider" type="range" min="0.08" max="1.8" step="0.04" value="0.8"></div>`,
 continuity:`<div class="control-row"><label>Position x <output id="cxOut">1,00</output></label><input id="cxSlider" type="range" min="-2" max="2" step="0.05" value="1"></div><div class="control-row"><label>Type de fonction</label><select id="continuityMode"><option value="hole">Trou en a</option><option value="jump">Saut en a</option><option value="continuous">Continue</option></select></div>`,
 derivative:`<div class="control-row"><label>Écart h <output id="hOut">1,00</output></label><input id="hSlider" type="range" min="0.08" max="2" step="0.04" value="1"></div>`,
 ivt:`<div class="control-row"><label>Valeur cible y <output id="targetOut">0,50</output></label><input id="targetSlider" type="range" min="-1.5" max="2.5" step="0.05" value="0.5"></div>`,
 integral:`<div class="control-row"><label>Borne b <output id="boundOut">3,00</output></label><input id="boundSlider" type="range" min="1" max="4" step="0.1" value="3"></div><div class="control-row"><label>Nombre de rectangles <output id="rectOut">8</output></label><input id="rectSlider" type="range" min="2" max="32" step="1" value="8"></div>`,
 trig:`<div class="control-row"><label>Angle θ <output id="angleOut">45°</output></label><input id="angleSlider" type="range" min="0" max="360" step="1" value="45"></div>`,
 injectivity:`<div class="control-row"><label>Fonction</label><select id="injectMode"><option value="square">f(x) = x² (non injective)</option><option value="cube">f(x) = x³ (injective)</option><option value="exp">f(x) = eˣ (injective)</option></select></div>`,
 surjectivity:`<div class="control-row"><label>Ensemble d'arrivée</label><select id="surjMode"><option value="all">F = ℝ</option><option value="positive">F = [0,+∞[</option><option value="interval">F = [−1,1]</option></select></div><div class="control-row"><label>Fonction</label><select id="surjFunction"><option value="square">f(x) = x², E = ℝ</option><option value="sine">f(x) = sin x, E = ℝ</option></select></div>`,
 linear:`<div class="control-row"><label>Cisaillement k <output id="kOut">0,50</output></label><input id="kSlider" type="range" min="-1.5" max="1.5" step="0.1" value="0.5"></div>`,
 basis:`<div class="control-row"><label>Angle du second vecteur <output id="basisOut">60°</output></label><input id="basisSlider" type="range" min="0" max="180" step="1" value="60"></div>`,
 eigen:`<div class="control-row"><label>Étirement horizontal λ₁ <output id="lambdaOut">2,00</output></label><input id="lambdaSlider" type="range" min="0.4" max="2.5" step="0.1" value="2"></div><div class="control-row"><label>Étirement vertical λ₂ <output id="lambda2Out">0,60</output></label><input id="lambda2Slider" type="range" min="0.3" max="2.5" step="0.1" value="0.6"></div>`,
 schmidt:`<div class="control-row"><label>Angle de v₂ avec v₁ <output id="schmidtAngleOut">55°</output></label><input id="schmidtAngleSlider" type="range" min="8" max="172" value="55"></div><div class="control-row"><label>Composante parallèle <output id="schmidtParallelOut">1,00</output></label><input id="schmidtParallelSlider" type="range" min="-2" max="2" step="0.1" value="1"></div>`,
 fourier:`<div class="control-row"><label>Nombre d'harmoniques <output id="fourierOut">5</output></label><input id="fourierSlider" type="range" min="1" max="25" step="2" value="5"></div>`,
 taylor:`<div class="control-row"><label>Fonction</label><select id="taylorFunction"><option value="exp">exp(x)</option><option value="sin">sin(x)</option><option value="cos">cos(x)</option><option value="log">ln(1+x)</option><option value="geometric">1/(1−x)</option></select></div><div class="control-row"><label>Ordre n <output id="taylorOut">3</output></label><input id="taylorSlider" type="range" min="0" max="10" value="3"></div>`,
 determinant:`<div class="control-row"><label>Échelle horizontale <output id="detAOut">1,50</output></label><input id="detASlider" type="range" min="-2" max="2" step="0.1" value="1.5"></div><div class="control-row"><label>Échelle verticale <output id="detBOut">0,80</output></label><input id="detBSlider" type="range" min="-2" max="2" step="0.1" value="0.8"></div><div class="control-row"><label>Cisaillement <output id="detCOut">0,30</output></label><input id="detCSlider" type="range" min="-1.5" max="1.5" step="0.1" value="0.3"></div>`,
 surface:`<div class="control-row"><label>Surface</label><select id="surfaceFunction"><option value="bowl">Paraboloïde x²+y²</option><option value="saddle">Selle x²−y²</option><option value="wave">Ondulation sin(x)cos(y)</option></select></div><div class="control-row"><label>Angle de vue <output id="surfaceAngleOut">35°</output></label><input id="surfaceAngleSlider" type="range" min="0" max="360" value="35"></div>`,
 directsum:`<div class="control-row"><label>Angle entre F et G <output id="directAngleOut">65°</output></label><input id="directAngleSlider" type="range" min="10" max="170" value="65"></div><div class="control-row"><label>Composante sur F <output id="directXOut">1,00</output></label><input id="directXSlider" type="range" min="-2" max="2" step="0.1" value="1"></div><div class="control-row"><label>Composante sur G <output id="directYOut">0,80</output></label><input id="directYSlider" type="range" min="-2" max="2" step="0.1" value="0.8"></div>`
};
function setVisual(type){
 activeVisual=type;$$('.visual-tab').forEach(b=>b.classList.toggle('active',b.dataset.visual===type));
 const c=visualConfig[type];$('#visualEyebrow').textContent=c.eyebrow;$('#visualTitle').textContent=c.title;$('#controlTitle').textContent=c.control;$('#visualCaption').textContent=c.caption;$('#visualInsight').textContent=c.insight;
 if(visualTimer){clearInterval(visualTimer);visualTimer=null;}
 $('#visualControls').innerHTML=visualControls[type];
 if(type==='taylor') $('#visualControls').insertAdjacentHTML('beforeend','<button class="secondary-btn visual-play" id="playTaylor" type="button">▶ Animer les ordres 0 → 10</button>');
 if(type==='fourier') $('#visualControls').insertAdjacentHTML('beforeend','<button class="secondary-btn visual-play" id="playFourier" type="button">▶ Ajouter les harmoniques</button>');
 const animated={
  convergence:{id:'nSlider',from:1,to:40,step:1,label:'▶ Animer la convergence'},
  limit:{id:'nearSlider',from:1.2,to:0.02,step:-0.02,label:'▶ Approcher le point'},
  continuity:{id:'cxSlider',from:-2.5,to:2.5,step:0.08,label:'▶ Déplacer le point'},
  derivative:{id:'hSlider',from:1.5,to:0.02,step:-0.025,label:'▶ Sécante → tangente'},
  ivt:{id:'targetSlider',from:-1,to:1,step:0.025,label:'▶ Parcourir les valeurs'},
  integral:{id:'rectSlider',from:4,to:80,step:1,label:'▶ Affiner les rectangles'},
  trig:{id:'angleSlider',from:0,to:360,step:2,label:'▶ Faire tourner le point'},
  linear:{id:'kSlider',from:-1.5,to:1.5,step:0.04,label:'▶ Animer le cisaillement'},
  basis:{id:'basisSlider',from:0,to:180,step:1,label:'▶ Faire tourner le vecteur'},
  eigen:{id:'lambdaSlider',from:-2,to:2,step:0.04,label:'▶ Faire varier λ₁'},
  schmidt:{id:'schmidtAngleSlider',from:10,to:170,step:1,label:"▶ Construire l'orthogonalité"},
  determinant:{id:'detASlider',from:0.2,to:1.8,step:0.03,label:'▶ Déformer le parallélogramme'},
  surface:{id:'surfaceAngleSlider',from:0,to:360,step:2,label:'▶ Faire tourner la surface'},
  directsum:{id:'directAngleSlider',from:10,to:170,step:1,label:"▶ Faire varier l'angle"}
 };
 if(animated[type]) $('#visualControls').insertAdjacentHTML('beforeend','<button class="secondary-btn visual-play" id="playVisual" type="button">'+animated[type].label+'</button>');

 $$( '#visualControls input[type="range"]' ).forEach(input=>input.addEventListener('input',()=>{const out=$('#'+input.id.replace('Slider','Out'));if(out){const v=Number(input.value);out.textContent=(input.id.toLowerCase().includes('angle')||input.id==='basisSlider')?v+'°':(input.id.includes('Slider')?v.toFixed(2).replace('.',','):v);}drawVisual();}));
 $$( '#visualControls select' ).forEach(select=>select.addEventListener('change',drawVisual));
 if(type==='taylor') $('#playTaylor').addEventListener('click',()=>{let n=0;$('#taylorSlider').value=0;drawVisual();if(visualTimer)clearInterval(visualTimer);visualTimer=setInterval(()=>{n++;$('#taylorSlider').value=n;drawVisual();if(n>=10){clearInterval(visualTimer);visualTimer=null;}},420);});
 if(type==='fourier') $('#playFourier').addEventListener('click',()=>{let n=1;$('#fourierSlider').value=1;drawVisual();if(visualTimer)clearInterval(visualTimer);visualTimer=setInterval(()=>{n+=2;$('#fourierSlider').value=Math.min(n,25);drawVisual();if(n>=25){clearInterval(visualTimer);visualTimer=null;}},350);});
 if(animated[type]) $('#playVisual')?.addEventListener('click',()=>{
  if(visualTimer){clearInterval(visualTimer);visualTimer=null;}
  const cfg=animated[type],input=$('#'+cfg.id);if(!input)return;
  let value=cfg.from,direction=Math.sign(cfg.to-cfg.from);
  input.value=value;drawVisual();
  visualTimer=setInterval(()=>{
   value+=cfg.step;
   const finished=direction>0?value>=cfg.to:value<=cfg.to;
   if(finished)value=cfg.to;
   input.value=String(value);drawVisual();
   if(finished){clearInterval(visualTimer);visualTimer=null;}
  },35);
 });

 drawVisual();
}
$$('[data-visual]').forEach(b=>b.addEventListener('click',()=>setVisual(b.dataset.visual)));
function base(){ctx.clearRect(0,0,900,480);ctx.fillStyle='#0c1725';ctx.fillRect(0,0,900,480);ctx.strokeStyle='#1d3045';ctx.lineWidth=1;for(let x=50;x<880;x+=40){ctx.beginPath();ctx.moveTo(x,20);ctx.lineTo(x,460);ctx.stroke()}for(let y=30;y<460;y+=40){ctx.beginPath();ctx.moveTo(25,y);ctx.lineTo(880,y);ctx.stroke()}}
function plotAxes(x0=450,y0=240,sx=125,sy=100){ctx.strokeStyle='#8295ad';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(35,y0);ctx.lineTo(870,y0);ctx.moveTo(x0,25);ctx.lineTo(x0,455);ctx.stroke();return {X:x=>x0+x*sx,Y:y=>y0-y*sy};}
function curve(fn,a,b,map,color='#8bb5ff',width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();let first=true;for(let x=a;x<=b;x+=(b-a)/500){const y=fn(x),px=map.X(x),py=map.Y(y);if(!Number.isFinite(y)||Math.abs(py)>1200){first=true;continue}if(first){ctx.moveTo(px,py);first=false}else ctx.lineTo(px,py)}ctx.stroke()}
function point(x,y,map,color='#e9bf78',r=6){ctx.fillStyle=color;ctx.beginPath();ctx.arc(map.X(x),map.Y(y),r,0,Math.PI*2);ctx.fill()}
function label(t,x,y,color='#d5e2f4'){ctx.fillStyle=color;ctx.font='14px DM Mono';ctx.fillText(t,x,y)}
function drawConvergence(){base();const eps=+$('#epsSlider').value,n=+$('#nSlider').value,map=plotAxes(90,235,18,160);ctx.fillStyle='rgba(105,167,255,.13)';ctx.fillRect(45,map.Y(eps),820,2*eps*160);ctx.strokeStyle='#79aaff';ctx.setLineDash([7,6]);ctx.beginPath();ctx.moveTo(45,map.Y(eps));ctx.lineTo(865,map.Y(eps));ctx.moveTo(45,map.Y(-eps));ctx.lineTo(865,map.Y(-eps));ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#6bd4c8';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=n;i++){const x=90+i*18,y=235-(1/(i+1))*160;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke();for(let i=1;i<=n;i++){ctx.fillStyle='#8ce0d2';ctx.beginPath();ctx.arc(90+i*18,235-(1/(i+1))*160,4,0,Math.PI*2);ctx.fill()}const N=Math.max(0,Math.ceil(1/eps-1));ctx.strokeStyle='#e9bf78';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(90+N*18,40);ctx.lineTo(90+N*18,430);ctx.stroke();ctx.setLineDash([]);label('uₙ = 1/(n+1)',650,65,'#8ce0d2');label('N ≈ '+N,Math.min(90+N*18+8,770),55,'#e9bf78');$('#epsOut').textContent=eps.toFixed(2).replace('.',',');$('#nOut').textContent=n}
function drawLimit(){base();const map=plotAxes();curve(x=>x+1,-2.5,2.5,map);ctx.strokeStyle='#e9bf78';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(map.X(1),35);ctx.lineTo(map.X(1),445);ctx.stroke();ctx.setLineDash([]);const d=+$('#nearSlider').value,x=1-d;point(x,x+1,map,'#e9bf78');ctx.fillStyle='#0c1725';ctx.beginPath();ctx.arc(map.X(1),map.Y(2),8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e9bf78';ctx.lineWidth=3;ctx.stroke();label('limite = 2',map.X(1)+15,map.Y(2)-18,'#e9bf78');label('x = 1 : trou',map.X(1)+15,map.Y(2)+20);$('#nearOut').textContent=d.toFixed(2).replace('.',',')}
function drawContinuity(){base();const map=plotAxes(),mode=$('#continuityMode').value,a=0.5;curve(x=>mode==='jump'?(x<a?x+1:x+2):x*x/2,-2.5,2.5,map);if(mode==='hole'){ctx.fillStyle='#0c1725';ctx.beginPath();ctx.arc(map.X(a),map.Y(a*a/2),8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e9bf78';ctx.lineWidth=3;ctx.stroke();point(a,1.7,map,'#e9bf78')}else if(mode==='jump'){ctx.fillStyle='#0c1725';ctx.beginPath();ctx.arc(map.X(a),map.Y(a+1),7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e9bf78';ctx.lineWidth=3;ctx.stroke();point(a,a+2,map,'#8ce0d2')}else point(a,a*a/2,map,'#8ce0d2');const x=+$('#cxSlider').value;point(x,mode==='jump'?(x<a?x+1:x+2):x*x/2,map,'#e9bf78',7);label(mode==='hole'?'Trou en a':mode==='jump'?'Saut en a':'Fonction continue',55,55,'#e9bf78');$('#cxOut').textContent=x.toFixed(2).replace('.',',')}
function drawDerivative(){base();const h=+$('#hSlider').value,a=.7,f=x=>.42*x*x+.35*x+.3,map=plotAxes(450,390,145,170),x1=a,x2=a+h,y1=f(x1),y2=f(x2),slope=(y2-y1)/h,deriv=.84*a+.35;curve(f,-2.5,2.5,map);ctx.strokeStyle='#e8bd79';ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(map.X(-2.5),map.Y(y1+slope*(-2.5-x1)));ctx.lineTo(map.X(2.5),map.Y(y1+slope*(2.5-x1)));ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#6bd4c8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(map.X(-2.5),map.Y(y1+deriv*(-2.5-x1)));ctx.lineTo(map.X(2.5),map.Y(y1+deriv*(2.5-x1)));ctx.stroke();point(x1,y1,map,'#8db8ff');point(x2,y2,map,'#e8bd79');label('sécante : '+slope.toFixed(2),55,55,'#e8bd79');label('tangente : '+deriv.toFixed(2),55,82,'#6bd4c8');$('#hOut').textContent=h.toFixed(2).replace('.',',')}
function drawIVT(){base();const map=plotAxes(),f=x=>.22*x*x*x-.5*x+0.2,a=-2,b=2,target=+$('#targetSlider').value;curve(f,-2.5,2.5,map);ctx.strokeStyle='#e9bf78';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(map.X(-2),map.Y(target));ctx.lineTo(map.X(2),map.Y(target));ctx.stroke();ctx.setLineDash([]);const roots=[];for(let x=a;x<=b;x+=.002)if((f(x)-target)*(f(x+.002)-target)<=0)roots.push(x);roots.forEach(x=>point(x,target,map,'#e9bf78',6));point(a,f(a),map,'#8ce0d2');point(b,f(b),map,'#8ce0d2');label('y cible = '+target.toFixed(2),55,55,'#e9bf78');label(roots.length+' intersection(s) visible(s)',55,82,'#8ce0d2');$('#targetOut').textContent=target.toFixed(2).replace('.',',')}
function drawIntegral(){base();const map=plotAxes(100,390,170,95),b=+$('#boundSlider').value,n=+$('#rectSlider').value,dx=b/n,f=x=>.35*x*x+.25;ctx.fillStyle='rgba(107,212,200,.23)';for(let i=0;i<n;i++){const x=i*dx,y=f(x);ctx.fillRect(map.X(x),map.Y(y),dx*170,map.Y(0)-map.Y(y));ctx.strokeStyle='#6bd4c8';ctx.strokeRect(map.X(x),map.Y(y),dx*170,map.Y(0)-map.Y(y))}curve(f,0,4.2,map);const approx=Array.from({length:n},(_,i)=>f(i*dx)*dx).reduce((a,v)=>a+v,0);label('Somme à gauche ≈ '+approx.toFixed(3),55,55,'#8ce0d2');label('n = '+n+' rectangles',55,82);$('#boundOut').textContent=b.toFixed(1).replace('.',',');$('#rectOut').textContent=n}
function drawTrig(){base();const cx=380,cy=240,r=160,theta=+$('#angleSlider').value*Math.PI/180;ctx.strokeStyle='#8295ad';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(100,cy);ctx.lineTo(700,cy);ctx.moveTo(cx,35);ctx.lineTo(cx,445);ctx.stroke();ctx.strokeStyle='#8bb5ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();const x=cx+r*Math.cos(theta),y=cy-r*Math.sin(theta);ctx.strokeStyle='#e9bf79';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,cy);ctx.moveTo(x,y);ctx.lineTo(cx,y);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle='#6bd4c8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.stroke();point((x-cx)/r,(cy-y)/r,{X:v=>cx+v*r,Y:v=>cy-v*r},'#e9bf79',7);label('cos θ = '+Math.cos(theta).toFixed(3),620,180,'#e9bf79');label('sin θ = '+Math.sin(theta).toFixed(3),620,208,'#6bd4c8');label('θ = '+Math.round(theta*180/Math.PI)+'°',620,236);$('#angleOut').textContent=Math.round(theta*180/Math.PI)+'°'}
function drawInjectivity(){base();const map=plotAxes(),mode=$('#injectMode').value,f=mode==='square'?x=>x*x:mode==='cube'?x=>x*x*x:x=>Math.exp(x);curve(f,mode==='exp'?-2.3:-2.2,mode==='exp'?1.8:2.2,map);const y=mode==='square'?1:mode==='cube'?1:1;ctx.strokeStyle='#e9bf78';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(45,map.Y(y));ctx.lineTo(865,map.Y(y));ctx.stroke();ctx.setLineDash([]);let xs=mode==='square'?[-1,1]:[1];xs.forEach(x=>point(x,y,map,'#e9bf78'));label(mode==='square'?'Deux antécédents : −1 et 1':'Un seul antécédent pour chaque y',55,55,'#e9bf78')}
function drawSurjectivity(){base();const map=plotAxes(),fn=$('#surjFunction').value,mode=$('#surjMode').value,f=fn==='square'?x=>x*x:Math.sin;curve(f,-3.2,3.2,map);let lo=mode==='interval'?-1:mode==='positive'?0:-2.3,hi=mode==='interval'?1:mode==='positive'?2.3:2.3;ctx.fillStyle='rgba(233,191,120,.10)';ctx.fillRect(45,map.Y(hi),820,map.Y(lo)-map.Y(hi));ctx.strokeStyle='#e9bf78';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(45,map.Y(lo));ctx.lineTo(865,map.Y(lo));ctx.moveTo(45,map.Y(hi));ctx.lineTo(865,map.Y(hi));ctx.stroke();ctx.setLineDash([]);label('Ensemble d’arrivée F',55,55,'#e9bf78');const msg=fn==='square'?(mode==='positive'?'Surjective sur [0,+∞[':'Non surjective pour ce F'):(mode==='interval'?'Surjective sur [−1,1]':mode==='all'?'Non surjective sur ℝ':'Non surjective sur [0,+∞[');label(msg,55,82,'#8ce0d2')}
function drawLinear(){base();const k=+$('#kSlider').value,cx=450,cy=240,s=65;for(let i=-5;i<=5;i++){ctx.strokeStyle='#263b54';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+i*s,cy-5*s);ctx.lineTo(cx+i*s,cy+5*s);ctx.moveTo(cx-5*s,cy+i*s);ctx.lineTo(cx+5*s,cy+i*s);ctx.stroke()}for(let i=-5;i<=5;i++){ctx.strokeStyle='#6bd4c8';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx+i*s,cy+5*s-k*i*s);ctx.lineTo(cx+i*s,cy-5*s-k*i*s);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-5*s,cy-i*s+k*5*s);ctx.lineTo(cx+5*s,cy-i*s-k*5*s);ctx.stroke()}ctx.strokeStyle='#8bb5ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx-5*s,cy+5*s);ctx.lineTo(cx+5*s,cy-5*s);ctx.stroke();ctx.strokeStyle='#8295ad';ctx.beginPath();ctx.moveTo(40,cy);ctx.lineTo(870,cy);ctx.moveTo(cx,25);ctx.lineTo(cx,455);ctx.stroke();label('f(x,y) = (x, y + kx)',55,55);label('k = '+k.toFixed(1),55,82,'#6bd4c8');$('#kOut').textContent=k.toFixed(2).replace('.',',')}
function drawBasis(){base();const cx=450,cy=245,s=115,theta=+$('#basisSlider').value*Math.PI/180;ctx.strokeStyle='#52677f';ctx.beginPath();ctx.moveTo(60,cy);ctx.lineTo(850,cy);ctx.moveTo(cx,35);ctx.lineTo(cx,450);ctx.stroke();const arrow=(x,y,color,name)=>{ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+x*s,cy-y*s);ctx.stroke();ctx.beginPath();ctx.arc(cx+x*s,cy-y*s,6,0,Math.PI*2);ctx.fill();label(name,cx+x*s+10,cy-y*s-10,color)};const x=Math.cos(theta),y=Math.sin(theta);arrow(1,0,'#8bb5ff','u');arrow(x,y,'#6bd4c8','v');const det=y;label('det(u,v) = '+det.toFixed(3),55,55,'#e9bf78');label(Math.abs(det)<.015?'Famille liée : pas une base':'Famille libre : une base de ℝ²',55,82,Math.abs(det)<.015?'#e9bf78':'#6bd4c8');$('#basisOut').textContent=Math.round(theta*180/Math.PI)+'°'}
function drawEigen(){base();const l1=+$('#lambdaSlider').value,l2=+$('#lambda2Slider').value,cx=450,cy=240,s=70;for(let i=-4;i<=4;i++){ctx.strokeStyle='#263b54';ctx.beginPath();ctx.moveTo(cx+i*s,cy-4*s);ctx.lineTo(cx+i*s,cy+4*s);ctx.moveTo(cx-4*s,cy+i*s);ctx.lineTo(cx+4*s,cy+i*s);ctx.stroke()}const arrow=(x,y,color)=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+x*s,cy-y*s);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(cx+x*s,cy-y*s,6,0,Math.PI*2);ctx.fill()};arrow(1,0,'#8bb5ff');arrow(l1,0,'#e9bf78');arrow(0,1,'#6bd4c8');arrow(0,l2,'#c2aaff');label('e₁ → λ₁e₁  (λ₁ = '+l1.toFixed(1)+')',55,55,'#e9bf78');label('e₂ → λ₂e₂  (λ₂ = '+l2.toFixed(1)+')',55,82,'#c2aaff');$('#lambdaOut').textContent=l1.toFixed(1).replace('.',',');$('#lambda2Out').textContent=l2.toFixed(1).replace('.',',')}
function drawSchmidt(){base();const ang=+$('#schmidtAngleSlider').value*Math.PI/180,par=+$('#schmidtParallelSlider').value,cx=450,cy=245,s=105,e1=[1,0],v1=e1,v2=[par+Math.cos(ang),Math.sin(ang)],coefficient=v2[0],proj=[coefficient*e1[0],coefficient*e1[1]],w=[v2[0]-proj[0],v2[1]-proj[1]],norm=Math.hypot(w[0],w[1]),e2=norm>1e-9?[w[0]/norm,w[1]/norm]:[0,0]; // illustration in the canonical case e1=(1,0)
 const arrow=(v,col,name)=>{ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+v[0]*s,cy-v[1]*s);ctx.stroke();ctx.beginPath();ctx.arc(cx+v[0]*s,cy-v[1]*s,5,0,Math.PI*2);ctx.fill();label(name,cx+v[0]*s+8,cy-v[1]*s-8,col)};
 ctx.strokeStyle='#52677f';ctx.beginPath();ctx.moveTo(50,cy);ctx.lineTo(850,cy);ctx.stroke();arrow(v1,'#8bb5ff','e₁ = v₁/‖v₁‖');arrow(v2,'#6bd4c8','v₂');arrow(proj,'#e9bf78','projₑ₁(v₂)');arrow(w,'#c2aaff','w₂ = v₂ − proj');if(norm>1e-9)arrow(e2,'#f0a7d6','e₂ = w₂/‖w₂‖');label('e₁=(1,0) ; proj=⟨v₂,e₁⟩e₁',55,55,'#c2aaff');label(norm>1e-9?'⟨w₂,e₁⟩ = 0 · ‖e₂‖ = 1':'Vecteurs colinéaires : w₂=0',55,82);$('#schmidtAngleOut').textContent=Math.round(ang*180/Math.PI)+'°';$('#schmidtParallelOut').textContent=par.toFixed(1).replace('.',',')}
function drawFourier(){base();const n=+$('#fourierSlider').value,map=plotAxes(450,240,115,120),f=x=>{let v=0;for(let k=1;k<=n;k+=2)v+=Math.sin(k*x)/k;return 4/Math.PI*v};curve(x=>Math.sin(x)>=0?1:-1,-Math.PI*2,Math.PI*2,map,'#8bb5ff',2);curve(f,-Math.PI*2,Math.PI*2,map,'#6bd4c8',3);label('Onde carrée',55,55,'#8bb5ff');label('Somme de Fourier · '+n+' harmoniques',55,82,'#6bd4c8');$('#fourierOut').textContent=n}
function drawTaylor(){base();const fn=$('#taylorFunction').value,n=+$('#taylorSlider').value,map=plotAxes(450,250,130,110);let f,poly;if(fn==='exp'){f=Math.exp;poly=x=>Array.from({length:n+1},(_,k)=>x**k/fact(k)).reduce((a,b)=>a+b,0)}else if(fn==='sin'){f=Math.sin;poly=x=>Array.from({length:n+1},(_,k)=>k%2===0?0:(-1)**((k-1)/2)*x**k/fact(k)).reduce((a,b)=>a+b,0)}else if(fn==='cos'){f=Math.cos;poly=x=>Array.from({length:n+1},(_,k)=>k%2?0:(-1)**(k/2)*x**k/fact(k)).reduce((a,b)=>a+b,0)}else if(fn==='log'){f=x=>Math.log1p(x);poly=x=>Array.from({length:n+1},(_,k)=>k===0?0:(-1)**(k+1)*x**k/k).reduce((a,b)=>a+b,0)}else{f=x=>1/(1-x);poly=x=>Array.from({length:n+1},(_,k)=>x**k).reduce((a,b)=>a+b,0)}const xmin=(fn==='log'||fn==='geometric')?-0.85:-2.5,xmax=(fn==='log'||fn==='geometric')?0.85:2.5;curve(f,xmin,xmax,map,'#8bb5ff',3);curve(poly,xmin,xmax,map,'#6bd4c8',2.5);label('Fonction',55,55,'#8bb5ff');label('Polynôme d’ordre '+n,55,82,'#6bd4c8');$('#taylorOut').textContent=n}
function fact(n){let v=1;for(let i=2;i<=n;i++)v*=i;return v}
function drawDeterminant(){base();const a=+$('#detASlider').value,b=+$('#detBSlider').value,c=+$('#detCSlider').value,cx=450,cy=255,s=100;const pts=[[0,0],[a,0],[a+c,b],[c,b]];ctx.strokeStyle='#8295ad';ctx.beginPath();ctx.moveTo(40,cy);ctx.lineTo(870,cy);ctx.moveTo(cx,30);ctx.lineTo(cx,455);ctx.stroke();ctx.beginPath();pts.forEach((p,i)=>{const x=cx+p[0]*s,y=cy-p[1]*s;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle='rgba(107,212,200,.2)';ctx.fill();ctx.strokeStyle='#6bd4c8';ctx.lineWidth=3;ctx.stroke();const det=a*b;label('det(A) = '+det.toFixed(2),55,55,'#e9bf78');label('Aire transformée = |det(A)| = '+Math.abs(det).toFixed(2),55,82,'#6bd4c8');label(det===0?'Transformation dégénérée':det<0?'Orientation inversée':'Orientation conservée',55,109,'#c2aaff');$('#detAOut').textContent=a.toFixed(1).replace('.',',');$('#detBOut').textContent=b.toFixed(1).replace('.',',');$('#detCOut').textContent=c.toFixed(1).replace('.',',')}
function drawSurface(){base();const fn=$('#surfaceFunction').value,ang=+$('#surfaceAngleSlider').value*Math.PI/180,cx=450,cy=270,s=60;const f=(x,y)=>fn==='bowl'?0.22*(x*x+y*y):fn==='saddle'?0.22*(x*x-y*y):1.2*Math.sin(x)*Math.cos(y);const project=(x,y,z)=>[cx+(x*Math.cos(ang)-y*Math.sin(ang))*s,cy+(x*Math.sin(ang)+y*Math.cos(ang))*s-z*48];for(let j=-5;j<=5;j++){ctx.beginPath();for(let i=-5;i<=5;i++){const p=project(i,j,f(i,j));i===-5?ctx.moveTo(...p):ctx.lineTo(...p)}ctx.strokeStyle='#6bd4c8';ctx.lineWidth=1.5;ctx.stroke()}for(let i=-5;i<=5;i++){ctx.beginPath();for(let j=-5;j<=5;j++){const p=project(i,j,f(i,j));j===-5?ctx.moveTo(...p):ctx.lineTo(...p)}ctx.strokeStyle='#8bb5ff';ctx.lineWidth=1.3;ctx.stroke()}label('z = '+(fn==='bowl'?'x²+y²':fn==='saddle'?'x²−y²':'sin(x)cos(y)'),55,55,'#e9bf78');label('Surface 3D · angle '+Math.round(ang*180/Math.PI)+'°',55,82);$('#surfaceAngleOut').textContent=Math.round(ang*180/Math.PI)+'°'}
function drawDirectsum(){base();const ang=+$('#directAngleSlider').value*Math.PI/180,x=+$('#directXSlider').value,y=+$('#directYSlider').value,cx=450,cy=245,s=100,g=[Math.cos(ang),Math.sin(ang)],vf=[x,0],vg=[y*g[0],y*g[1]],v=[vf[0]+vg[0],vf[1]+vg[1]];const arrow=(q,col,n)=>{ctx.strokeStyle=col;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+q[0]*s,cy-q[1]*s);ctx.stroke();label(n,cx+q[0]*s+8,cy-q[1]*s-8,col)};ctx.strokeStyle='#52677f';ctx.beginPath();ctx.moveTo(30,cy);ctx.lineTo(870,cy);ctx.stroke();arrow([1,0],'#8bb5ff','F');arrow(g,'#e9bf78','G');arrow(vf,'#8bb5ff','composante f');arrow(vg,'#e9bf78','composante g');ctx.setLineDash([5,4]);ctx.strokeStyle='#e9bf78';ctx.beginPath();ctx.moveTo(cx+vf[0]*s,cy-vf[1]*s);ctx.lineTo(cx+v[0]*s,cy-v[1]*s);ctx.stroke();ctx.setLineDash([]);arrow(v,'#6bd4c8','v=f+g');label('F∩G={0} si l’angle n’est pas 0° ou 180°',55,55,'#c2aaff');$('#directAngleOut').textContent=Math.round(ang*180/Math.PI)+'°';$('#directXOut').textContent=x.toFixed(1).replace('.',',');$('#directYOut').textContent=y.toFixed(1).replace('.',',')}
function drawVisual(){({convergence:drawConvergence,limit:drawLimit,continuity:drawContinuity,derivative:drawDerivative,ivt:drawIVT,integral:drawIntegral,trig:drawTrig,injectivity:drawInjectivity,surjectivity:drawSurjectivity,linear:drawLinear,basis:drawBasis,eigen:drawEigen,schmidt:drawSchmidt,fourier:drawFourier,taylor:drawTaylor,determinant:drawDeterminant,surface:drawSurface,directsum:drawDirectsum}[activeVisual]||drawConvergence)()}
function syncCanvasResolution(){
 const rect=canvas.getBoundingClientRect();
 if(!rect.width)return;
 const ratio=Math.max(1,Math.min(3,window.devicePixelRatio||1))*rect.width/900;
 const width=Math.round(900*ratio),height=Math.round(480*ratio);
 if(canvas.width!==width||canvas.height!==height){
  canvas.width=width;canvas.height=height;
  ctx.setTransform(ratio,0,0,ratio,0,0);
  drawVisual();
 }
}
window.addEventListener('resize',syncCanvasResolution,{passive:true});
setVisual('convergence');
requestAnimationFrame(syncCanvasResolution);
