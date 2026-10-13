// Seguimiento de misiones: lista con progreso, detalle paso a paso con requisitos reales de cada
// objeto, misiones seguidas, filtros y navegación. Los datos salen de analyzeQuests (quest-model)
// y se preparan en quest-view-model; aquí solo se pintan y se gestionan las interacciones.
const QUEST_FILTER_STORE='cvstodia:quest-filter:v1';
const QUEST_MARK={done:'✓',current:'▶',pending:'○',unknown:'?'};
let questFilter=(()=>{try{const stored=localStorage.getItem(QUEST_FILTER_STORE);return QUEST_FILTERS.some(f=>f.id===stored)?stored:'pending';}catch{return 'pending';}})();
let selectedQuestId=null,trackedQuests=new Set(),questSignature='',questHashApplied=false,questIndexSource=null,itemQuestIndex=new Map();
// Pasos que el jugador ha abierto o cerrado a mano (por defecto solo se abre el paso actual).
const questStepOpen=new Map();

function loadQuestTracking(){
 try{const list=JSON.parse(localStorage.getItem(profile+':quests')??'[]');trackedQuests=new Set(Array.isArray(list)?list.filter(id=>typeof id==='string'):[]);}
 catch{trackedQuests=new Set();}
 questSignature='';questHashApplied=false;
}
function saveQuestTracking(){
 try{localStorage.setItem(profile+':quests',JSON.stringify([...trackedQuests]));}
 catch{tell('El navegador no permite guardar las misiones seguidas. Se conservarán durante esta sesión.');}
}
function setQuestFilter(id){
 questFilter=id;
 try{localStorage.setItem(QUEST_FILTER_STORE,id);}catch{/* El filtro solo se recuerda mientras la pestaña siga abierta. */}
}

// Qué misiones usan cada objeto: permite saltar desde un objeto de la lista o del mapa a su misión.
function itemQuestLinks(id){
 if(questIndexSource!==current){
  questIndexSource=current;itemQuestIndex=new Map();
  const add=(item,link)=>{if(!itemQuestIndex.has(item))itemQuestIndex.set(item,[]);const list=itemQuestIndex.get(item);if(!list.some(l=>l.questId===link.questId&&l.stepIndex===link.stepIndex))list.push(link);};
  for(const quest of analyzeQuests(analysisData,current)){
   quest.steps.forEach((step,index)=>step.items.forEach(item=>add(item,{questId:quest.id,questName:quest.name,stepIndex:index})));
   quest.related.forEach(item=>add(item,{questId:quest.id,questName:quest.name,stepIndex:-1}));
  }
 }
 return itemQuestIndex.get(id)??[];
}
function questLinksHTML(id){
 if(!prefs.showQuests)return '';
 const links=itemQuestLinks(id);if(!links.length)return '';
 return '<p class="item-quests"><strong>Misión:</strong> '+links.map(l=>'<button type="button" class="text-button" data-quest-open="'+esc(l.questId)+'" data-quest-step="'+l.stepIndex+'">'+esc(l.questName)+(l.stepIndex>=0?' · paso '+(l.stepIndex+1):'')+'</button>').join(' ')+'</p>';
}

const questStateClass=state=>state==='completed'?'obtained':state==='unknown'||state==='notstarted'?'unknown':'missing';
const questProgressText=p=>p.done+' de '+p.total+' pasos confirmados'+(p.unknown?' · '+p.unknown+' sin confirmar':'');
const questProgressBar=p=>'<progress class="quest-progress" max="'+Math.max(1,p.total)+'" value="'+p.done+'" aria-label="'+esc(questProgressText(p))+'">'+p.done+'/'+p.total+'</progress>';
const questPendingCount=view=>view.steps.filter(s=>s.status!=='done').length;
const questHeadline=view=>view.currentStep?view.currentStep.label:view.state==='completed'?'Misión terminada':view.mode==='checklist'?questPendingCount(view)+' pasos pendientes':view.next;

function questCardHTML(view,selected,followed){
 return '<li><button type="button" class="quest-card'+(selected?' selected':'')+'" data-quest-open="'+esc(view.id)+'" data-fk="nav:'+esc(view.id)+'"'+(selected?' aria-current="true"':'')+'>'
  +'<span class="quest-card-head"><strong>'+(followed?'<span class="quest-star" role="img" aria-label="Misión seguida">★</span> ':'')+esc(view.name)+'</strong><span class="state '+questStateClass(view.state)+'">'+esc(view.stateLabel)+'</span></span>'
  +questProgressBar(view.progress)
  +'<span class="quest-card-meta">'+esc(view.progress.done+'/'+view.progress.total+' pasos')+(view.state==='completed'?'':' · '+esc(questHeadline(view)))+'</span>'
  +'</button></li>';
}

function questFocusHTML(views,followedIds){
 const followed=views.filter(v=>followedIds.has(v.id)&&v.state!=='completed');
 if(!followed.length)return '<p class="quest-hint muted">Pulsa «☆ Seguir misión» en cualquiera para fijarla aquí con su paso actual.</p>';
 return '<h3 class="quest-focus-title">Misiones que sigues</h3><ul class="quest-focus-list">'+followed.map(v=>'<li class="quest-focus-card"><div><strong>'+esc(v.name)+'</strong>'+questProgressBar(v.progress)+'<p class="quest-focus-now"><span class="muted">'+(v.currentStep?'Ahora':'Pendiente')+':</span> '+esc(questHeadline(v))+'</p></div><button type="button" data-quest-open="'+esc(v.id)+'" data-fk="fs:'+esc(v.id)+'">Abrir</button></li>').join('')+'</ul>';
}

function questItemHTML(item,scope){
 const p=item.presentation,obtained=item.ownership==='obtained';
 const need=!obtained&&p;
 const details=need&&(p.reasons.length||p.routes.length>1||p.note)
  ?'<details class="qitem-more"><summary>Motivos y alternativas de acceso</summary>'+(p.reasons.length?'<ul class="access-reasons">'+p.reasons.slice(0,7).map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul>':'')+(p.routes.length>1?'<p><strong>Alternativas de acceso</strong></p>'+routesHTML(p.routes):'')+(p.note?'<p class="muted access-note">'+esc(p.note)+'</p>':'')+'</details>'
  :'';
 return '<article class="qitem">'
  +'<header class="qitem-head"><strong>'+esc(item.name)+'</strong><span class="state '+item.ownership+'">'+esc(item.ownershipLabel)+'</span>'+(item.equipped?'<span class="equipped">Equipado</span>':'')+(need?'<span class="access-badge '+item.accessState+'">'+esc(item.accessLabel)+'</span>':'')+'</header>'
  +(item.englishName&&item.englishName!==item.name?'<p class="qitem-en muted">'+esc(item.englishName)+'</p>':'')
  +(item.area?'<p class="qitem-area"><strong>Zona:</strong> '+esc(item.area)+'</p>':'')
  +(!item.hasCatalogGuide&&item.hint?'<p class="qitem-guide"><strong>Pista del catálogo (en inglés):</strong> '+esc(item.hint)+'</p>':'')
  +(item.guide?'<p class="qitem-guide">'+esc(item.guide)+'</p>':'')
  +(need&&p.next?'<p class="next-action"><strong>Qué hacer ahora</strong><br>'+esc(p.next)+'</p>':'')
  +(need?requirementHTML(item.requirements):'')
  +details
  +(obtained&&item.proof?'<p class="qitem-proof muted"><strong>Prueba:</strong> '+esc(item.proof)+'</p>':'')
  +'<div class="qitem-actions">'+(item.hasMapPosition?'<button type="button" data-map-item="'+esc(item.id)+'">Ver en el mapa</button>':'')
  +'<label class="track-label"><input type="checkbox" data-quest-item-track="'+esc(item.id)+'" data-fk="it:'+esc(scope+':'+item.id)+'" aria-label="Seguir '+esc(item.name)+'"'+(tracked.has(item.id)?' checked':'')+'> Seguir objeto</label></div>'
  +'</article>';
}

function questStepHTML(view,step){
 const key=view.id+':'+step.index,open=questStepOpen.has(key)?questStepOpen.get(key):step.status==='current';
 return '<li class="qstep qstep-'+step.status+'"><details class="qstep-body" data-qstep="'+esc(key)+'"'+(open?' open':'')+'>'
  +'<summary><span class="qmark" aria-hidden="true">'+QUEST_MARK[step.status]+'</span><span class="qstep-title">'+(step.index+1)+'. '+esc(step.label)+'</span><span class="qstep-status">'+esc(step.statusLabel)+'</span></summary>'
  +(step.how?'<p class="qstep-how">'+esc(step.how)+'</p>':'')
  +(step.items.length?'<div class="qitems">'+step.items.map(item=>questItemHTML(item,'s'+step.index)).join('')+'</div>':'')
  +'<p class="qstep-proof muted"><strong>Evidencia:</strong> '+esc(step.proof)+'</p>'
  +'</details></li>';
}

function questBlockersHTML(view){
 if(!view.blockers.length)return '';
 return '<div class="quest-blockers"><strong>Antes de seguir te falta</strong><ul>'+view.blockers.map(b=>'<li>'+esc(b.missing.join(' + '))+' <span class="muted">para llegar a «'+esc(b.name)+'»</span>'+b.relicIds.map(id=>' <button type="button" class="text-button" data-detail-locate="'+esc(id)+'">Dónde conseguirla</button>').join('')+'</li>').join('')+'</ul></div>';
}

function questDetailHTML(view,neighbors,followed){
 const p=view.progress,pending=questPendingCount(view);
 const nextTitle=view.state==='completed'?'Misión completada':'Qué hacer ahora';
 const pager=(q,label,key)=>q?'<button type="button" data-quest-open="'+esc(q.id)+'" data-fk="'+key+'">'+label+'</button>':'<span></span>';
 return '<header class="quest-head"><p class="eyebrow">MISIÓN '+neighbors.position+' DE '+neighbors.total+' · '+(view.mode==='checklist'?'LISTA DE COMPROBACIÓN':'PASO A PASO')+'</p>'
  +'<h3 id="quest-detail-title" tabindex="-1">'+esc(view.name)+'</h3>'
  +'<div class="quest-head-row"><span class="state '+questStateClass(view.state)+'">'+esc(view.stateLabel)+'</span><span class="muted">'+esc(questProgressText(p))+'</span>'
  +'<button type="button" class="quest-track'+(followed?' on':'')+'" data-quest-track="'+esc(view.id)+'" data-fk="track" aria-pressed="'+followed+'">'+(followed?'★ Siguiendo':'☆ Seguir misión')+'</button></div>'
  +questProgressBar(p)+(view.summary?'<p class="quest-summary">'+esc(view.summary)+'</p>':'')+'</header>'
  +'<section class="quest-next" aria-labelledby="quest-next-title"><h4 id="quest-next-title">'+nextTitle+'</h4><p class="quest-next-text">'+esc(view.next)+'</p>'
  +(view.currentStep?'<p class="quest-current">Paso actual: <strong>'+esc(view.currentStep.label)+'</strong> <span class="muted">('+(view.currentStep.index+1)+' de '+p.total+')</span></p>':view.state!=='completed'&&view.mode==='checklist'?'<p class="quest-current">Pasos pendientes: <strong>'+pending+'</strong> de '+p.total+'</p>':'')
  +questBlockersHTML(view)+'</section>'
  +'<ol class="qsteps" aria-label="Pasos de la misión">'+view.steps.map(s=>questStepHTML(view,s)).join('')+'</ol>'
  +(view.related.length?'<details class="quest-related"><summary>Objetos relacionados con la misión</summary><div class="qitems">'+view.related.map(item=>questItemHTML(item,'rel')).join('')+'</div></details>':'')
  +'<footer class="quest-foot">'+(view.note?'<p class="muted quest-note">'+esc(view.note)+'</p>':'')
  +'<div class="quest-pager">'+pager(neighbors.previous,'‹ '+(neighbors.previous?esc(neighbors.previous.name):''),'prev')+pager(neighbors.next,(neighbors.next?esc(neighbors.next.name):'')+' ›','next')+'</div>'
  +(view.url?'<p class="quest-external"><a href="https://blasphemous.wiki.gg/wiki/'+encodeURIComponent(view.url)+'" target="_blank" rel="noopener noreferrer">Guía externa de la misión (opcional) ↗</a></p>':'')+'</footer>';
}

function questSignatureFor(quests,followed,shownIds){
 return JSON.stringify([
  quests.map(q=>[q.id,q.state,q.next,q.note,q.steps.map(s=>[s.value,s.proof])]),
  current.rows.map(r=>r.status+(r.equipped?'e':'')).join(''),
  [...accessibility.items.values()].map(a=>a.state[0]).join(''),
  [...accessibility.context.worn].sort(),[...tracked].sort(),[...followed].sort(),
  questFilter,selectedQuestId,shownIds,progressSource,prefs.equipmentOnly
 ]);
}

function renderQuests(force=false){
 if(!current||!analysisData||!accessibility)return;
 const quests=analyzeQuests(analysisData,current),known=new Set(quests.map(q=>q.id));
 const followed=new Set([...trackedQuests].filter(id=>known.has(id)));
 const wanted=location.hash.startsWith('#mision-')?location.hash.slice(8):null;
 if(wanted&&!questHashApplied&&known.has(wanted)){questHashApplied=true;selectedQuestId=wanted;if(!filterQuestViews(quests,questFilter,followed).some(q=>q.id===wanted))setQuestFilter('all');}
 const ordered=sortQuestViews(quests,followed),shown=filterQuestViews(ordered,questFilter,followed);
 if(!shown.some(q=>q.id===selectedQuestId))selectedQuestId=shown[0]?.id??null;
 const signature=questSignatureFor(quests,followed,shown.map(q=>q.id));
 if(!force&&signature===questSignature)return;
 questSignature=signature;
 const focusKey=document.activeElement?.closest?.('#quest-panel')?document.activeElement.dataset.fk:null;
 const ctx={rows:new Map(current.rows.map(r=>[r.id,r])),access:accessibility,communication:COMMUNICATION,positions:MAP_DATA.positions,guideFor};
 const views=sortQuestViews(buildQuestViews(quests,ctx),followed),shownViews=filterQuestViews(views,questFilter,followed),counts=questFilterCounts(views,followed);
 const completed=views.filter(v=>v.state==='completed').length,active=views.filter(v=>v.state==='active').length;
 $('quest-summary').textContent=completed+'/'+views.length+' completadas · '+active+' en curso · '+(progressSource==='game'?'eventos del juego en directo':'datos del guardado');
 $('quest-focus').innerHTML=questFocusHTML(views,followed);
 $('quest-filters').innerHTML=QUEST_FILTERS.map(f=>'<button type="button" class="chip'+(questFilter===f.id?' active':'')+'" data-quest-filter="'+f.id+'" data-fk="chip:'+f.id+'" aria-pressed="'+(questFilter===f.id)+'">'+esc(f.label)+' <span class="chip-count">'+counts[f.id]+'</span></button>').join('');
 $('quest-nav').innerHTML=shownViews.length?'<ul class="quest-list">'+shownViews.map(v=>questCardHTML(v,v.id===selectedQuestId,followed.has(v.id))).join('')+'</ul>':'<p class="muted quest-empty">No hay misiones con este filtro.</p><button type="button" data-quest-filter="all" data-fk="chip:all-empty">Ver todas</button>';
 const selected=shownViews.find(v=>v.id===selectedQuestId);
 $('quest-detail').hidden=!selected;
 $('quest-detail').innerHTML=selected?questDetailHTML(selected,questNeighbors(shownViews,selected.id),followed.has(selected.id)):'';
 if(focusKey)$('quest-panel').querySelector('[data-fk="'+CSS.escape(focusKey)+'"]')?.focus({preventScroll:true});
}

function setQuestHash(id){try{history.replaceState(null,'','#mision-'+id);}catch{/* Sin historial: el enlace directo no se actualiza. */}}
const questNarrowScreen=()=>typeof matchMedia==='function'&&matchMedia('(max-width: 899px)').matches;
function openQuest(id,{step=null,scroll=false}={}){
 selectedQuestId=id;questHashApplied=true;
 if(step!==null&&step>=0)questStepOpen.set(id+':'+step,true);
 const followed=new Set(trackedQuests);
 if(!filterQuestViews(analyzeQuests(analysisData,current),questFilter,followed).some(q=>q.id===id))setQuestFilter('all');
 renderQuests(true);setQuestHash(id);
 if(scroll||questNarrowScreen()){const detail=$('quest-detail');detail.scrollIntoView({block:'start',behavior:'auto'});$('quest-detail-title')?.focus({preventScroll:true});}
}
function toggleQuestTracking(id){
 const name=analyzeQuests(analysisData,current).find(q=>q.id===id)?.name??'misión';
 if(trackedQuests.has(id)){trackedQuests.delete(id);tell('Has dejado de seguir «'+name+'».');}
 else{trackedQuests.add(id);tell('Sigues «'+name+'». Aparece arriba con su paso actual.');}
 saveQuestTracking();renderQuests(true);
}

$('quest-panel').addEventListener('click',e=>{
 const open=e.target.closest('[data-quest-open]');
 if(open){openQuest(open.dataset.questOpen,{scroll:Boolean(open.closest('#quest-focus,.quest-foot'))});return;}
 const filter=e.target.closest('[data-quest-filter]');
 if(filter){setQuestFilter(filter.dataset.questFilter);renderQuests(true);return;}
 const track=e.target.closest('[data-quest-track]');
 if(track){toggleQuestTracking(track.dataset.questTrack);return;}
 const map=e.target.closest('[data-map-item]');
 if(map){focusMapItem(map.dataset.mapItem,true);return;}
 const locate=e.target.closest('[data-detail-locate]');
 if(locate)focusMapItem(locate.dataset.detailLocate,true);
});
$('quest-panel').addEventListener('change',e=>{
 const id=e.target.dataset.questItemTrack;if(!id)return;
 e.target.checked?tracked.add(id):tracked.delete(id);saveTracking();render();
});
// Se recuerdan solo los pasos que el jugador abre o cierra a propósito; el resto sigue la regla por defecto.
$('quest-panel').addEventListener('toggle',e=>{
 const details=e.target.closest?.('details[data-qstep]');if(!details)return;
 const byDefault=details.closest('.qstep').classList.contains('qstep-current');
 if(details.open===byDefault)questStepOpen.delete(details.dataset.qstep);else questStepOpen.set(details.dataset.qstep,details.open);
},true);
$('quest-nav').addEventListener('keydown',e=>{
 if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
 const buttons=[...$('quest-nav').querySelectorAll('[data-quest-open]')],index=buttons.indexOf(document.activeElement);if(index<0)return;
 e.preventDefault();
 const target=e.key==='ArrowDown'?buttons[Math.min(index+1,buttons.length-1)]:e.key==='ArrowUp'?buttons[Math.max(index-1,0)]:e.key==='Home'?buttons[0]:buttons.at(-1);
 target.focus();
});
window.addEventListener('hashchange',()=>{
 if(!current||!location.hash.startsWith('#mision-'))return;
 const id=location.hash.slice(8);
 if(analyzeQuests(analysisData,current).some(q=>q.id===id))openQuest(id,{scroll:true});
});
