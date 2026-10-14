import {ACCESS_LABEL} from './access-model.mjs';
import {QUEST_LABELS} from './quest-model.mjs';

// Modelo de vista del seguimiento de misiones: convierte el análisis (analyzeQuests) en lo que
// la interfaz necesita para guiar al jugador sin salir de la aplicación: paso actual, estado de
// cada paso, requisitos reales de cada objeto (con su acceso y reliquias) y bloqueos.

export const QUEST_FILTERS=[
 {id:'pending',label:'Pendientes'},
 {id:'tracked',label:'Seguidas'},
 {id:'active',label:'En curso'},
 {id:'completed',label:'Completadas'},
 {id:'lost',label:'Perdidas'},
 {id:'unknown',label:'Sin confirmar'},
 {id:'all',label:'Todas'}
];
export const QUEST_STEP_LABEL={done:'Confirmado',current:'Paso actual',pending:'Pendiente',unknown:'Sin confirmar',lost:'Ya no se puede'};
export const QUEST_OWNERSHIP_LABEL={obtained:'Lo tienes',missing:'Te falta',unknown:'Sin confirmar',later:'Nueva Partida+'};
// Orden de aparición: lo que requiere tu atención primero y lo ya terminado al final.
const QUEST_STATE_RANK={active:0,alternative:1,notstarted:2,unknown:3,lost:4,completed:5};
const UNCATALOGUED_AREAS=new Set(['Zona no catalogada','Consultar guía del objeto']);

export function questProgress(quest){
 const total=quest.steps.length,done=quest.steps.filter(s=>s.value===true).length,unknown=quest.steps.filter(s=>s.value===null).length;
 return {done,total,unknown,percent:total?Math.round(done/total*100):0};
}

// En una misión secuencial el paso actual es el siguiente al último confirmado: así una prueba
// que falte en un paso intermedio no oculta el avance posterior. En una lista de comprobación
// no hay un único paso actual: se muestran todos los pendientes.
export function questCurrentIndex(quest){
 if(quest.state==='completed'||quest.state==='lost'||quest.mode!=='sequence')return -1;
 let last=-1;quest.steps.forEach((s,i)=>{if(s.value===true)last=i;});
 return Math.min(last+1,quest.steps.length-1);
}

export function questItemView(id,ctx){
 const row=ctx.rows.get(id);if(!row)return null;
 const access=ctx.access.items.get(id);
 const presentation=access?ctx.communication.itemPresentation(row,access,ctx.access.context):null;
 const state=access?.state??'unknown';
 const requirements=presentation?.requirements??[];
 return {
  id,name:row.name,englishName:row.englishName??'',group:row.group,
  area:UNCATALOGUED_AREAS.has(row.area)?'':row.area,
  ownership:row.status,ownershipLabel:QUEST_OWNERSHIP_LABEL[row.status]??row.status,equipped:Boolean(row.equipped),
  proof:row.proof?.text??'',
  accessState:state,accessLabel:ACCESS_LABEL[state]??state,
  presentation,requirements,
  missingRelics:requirements.filter(r=>!r.owned&&!r.optional),
  guide:(ctx.guideFor?ctx.guideFor(row):row.guide??'').trim(),hasCatalogGuide:Boolean(row.guide),
  hint:row.hint??'',hintEs:row.hintEs??'',
  wikiUrl:row.englishName?'https://blasphemous.wiki.gg/wiki/'+encodeURIComponent(row.englishName.replaceAll(' ','_')):'',
  hasMapPosition:Boolean(ctx.positions?.[id]?.length)
 };
}

function stepStatus(step,index,current,questLost){
 if(step.value===true)return 'done';
 if(questLost)return 'lost';
 if(index===current)return 'current';
 return step.value===null?'unknown':'pending';
}

export function buildQuestView(quest,ctx){
 const current=questCurrentIndex(quest),progress=questProgress(quest);
 const steps=quest.steps.map((step,index)=>{
  const status=stepStatus(step,index,current,quest.state==='lost');
  return {index,label:step.label,value:step.value,proof:step.proof,how:step.how,status,statusLabel:QUEST_STEP_LABEL[status],items:step.items.map(id=>questItemView(id,ctx)).filter(Boolean)};
 });
 const focus=quest.state==='lost'?[]:current>=0?[steps[current]]:steps.filter(s=>s.status!=='done');
 // Qué impide avanzar ahora: objetos de los pasos pendientes que exigen una reliquia obligatoria que aún no tienes.
 const blockers=focus.flatMap(s=>s.items).filter(i=>i.ownership!=='obtained'&&i.missingRelics.length).map(i=>({id:i.id,name:i.name,missing:i.missingRelics.map(r=>r.name),relicIds:i.missingRelics.map(r=>r.id)}));
 return {
  id:quest.id,name:quest.name,state:quest.state,stateLabel:QUEST_LABELS[quest.state],
  summary:quest.summary,next:quest.next,note:quest.note,lostReason:quest.lostReason??'',url:quest.url,mode:quest.mode,
  progress,currentIndex:current,currentStep:current>=0?steps[current]:null,steps,blockers,
  related:quest.related.map(id=>questItemView(id,ctx)).filter(Boolean)
 };
}

export function buildQuestViews(quests,ctx){return quests.map(q=>buildQuestView(q,ctx));}

export function sortQuestViews(views,tracked=new Set()){
 return views.map((view,index)=>({view,index})).sort((a,b)=>(tracked.has(b.view.id)-tracked.has(a.view.id))||((QUEST_STATE_RANK[a.view.state]??9)-(QUEST_STATE_RANK[b.view.state]??9))||a.index-b.index).map(x=>x.view);
}

export function questMatchesFilter(view,filter,tracked=new Set()){
 switch(filter){
  case 'all':return true;
  case 'pending':return view.state!=='completed'&&view.state!=='lost';
  case 'tracked':return tracked.has(view.id);
  default:return view.state===filter;
 }
}
export function filterQuestViews(views,filter,tracked=new Set()){return views.filter(v=>questMatchesFilter(v,filter,tracked));}
export function questFilterCounts(views,tracked=new Set()){return Object.fromEntries(QUEST_FILTERS.map(f=>[f.id,filterQuestViews(views,f.id,tracked).length]));}

// Misión anterior y siguiente dentro de la lista visible, para moverse sin volver al índice.
export function questNeighbors(views,id){
 const i=views.findIndex(v=>v.id===id);
 return {previous:i>0?views[i-1]:null,next:i>=0&&i<views.length-1?views[i+1]:null,position:i+1,total:views.length};
}

export function sanitizeTrackedQuests(raw,quests){
 const known=new Set(quests.map(q=>q.id));
 return new Set(Array.isArray(raw)?raw.filter(id=>typeof id==='string'&&known.has(id)):[]);
}
