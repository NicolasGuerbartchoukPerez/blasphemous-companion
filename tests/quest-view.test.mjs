import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyze} from '../engine.mjs';
import {analyzeAccess} from '../access-model.mjs';
import {createCommunication} from '../communication-model.mjs';
import {analyzeQuests} from '../quest-model.mjs';
import {QUEST_FILTERS,buildQuestViews,questItemView,filterQuestViews,questCurrentIndex,questFilterCounts,questMatchesFilter,questNeighbors,questProgress,sanitizeTrackedQuests,sortQuestViews} from '../quest-view-model.mjs';

const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const catalog=read('catalog.json'),model=read('access-data.json'),mapData=read('map-data.json'),comm=createCommunication(catalog,model);
const catalogIds=new Set(catalog.map(r=>r.id));

function build(inventory={},flags={},persistent={IsNewGamePlus:false}){
 const data={commonElements:{ID_INVENTORY:{ownRellics:[],ownQuestItems:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[],wearRellics:[],...inventory},ID_EVENT_MANAGER:{flags},ID_PERSISTENT_MANAGER:persistent},sceneElements:{}};
 const analysis=analyze(data,catalog),access=analyzeAccess(data,analysis,model);
 const quests=analyzeQuests(data,analysis);
 const ctx={rows:new Map(analysis.rows.map(r=>[r.id,r])),access,communication:comm,positions:mapData.positions};
 return {quests,views:buildQuestViews(quests,ctx)};
}
const byId=(views,id)=>views.find(v=>v.id===id);

test('integridad: todas las misiones se explican por sí solas y solo citan objetos que existen',()=>{
 const {quests}=build();
 assert.equal(new Set(quests.map(q=>q.id)).size,quests.length);
 for(const q of quests){
  assert.ok(q.summary.length>20,q.id+' sin resumen');
  assert.ok(['sequence','checklist'].includes(q.mode),q.id+' con modo desconocido');
  for(const id of q.related)assert.ok(catalogIds.has(id),q.id+' cita un objeto inexistente: '+id);
  for(const s of q.steps){
   for(const id of s.items)assert.ok(catalogIds.has(id),q.id+' / '+s.label+' cita un objeto inexistente: '+id);
   assert.ok(s.how.length>10||s.items.length>0,q.id+' / '+s.label+' no dice qué hacer ni qué objeto interviene');
  }
 }
});

test('los textos de las misiones no exponen códigos internos del mod ni de las puertas',()=>{
 const {quests}=build();
 const texts=quests.flatMap(q=>[q.summary,q.next,q.note,...q.steps.flatMap(s=>[s.label,s.how,s.proof])]);
 assert.doesNotMatch(texts.join('\n'),/D\d+[A-Z0-9]*\[|canWalkOnRoot|redentoRooms|_DELIVERED|mod\/glitch/);
});

test('paso actual: siguiente al último confirmado en misiones secuenciales; ninguno en listas',()=>{
 const seq={mode:'sequence',state:'active',steps:[{value:true},{value:false},{value:false}]};
 assert.equal(questCurrentIndex(seq),1);
 assert.equal(questCurrentIndex({...seq,steps:[{value:false},{value:false}]}),0);
 // una prueba ausente en un paso intermedio no oculta el avance posterior
 assert.equal(questCurrentIndex({...seq,steps:[{value:true},{value:null},{value:true},{value:false}]}),3);
 // nunca se pasa del último paso
 assert.equal(questCurrentIndex({...seq,steps:[{value:true},{value:true}]}),1);
 assert.equal(questCurrentIndex({...seq,state:'completed'}),-1);
 assert.equal(questCurrentIndex({...seq,mode:'checklist'}),-1);
});

test('progreso: cuenta pasos confirmados y sin confirmar',()=>{
 assert.deepEqual(questProgress({steps:[{value:true},{value:null},{value:false},{value:true}]}),{done:2,total:4,unknown:1,percent:50});
 assert.deepEqual(questProgress({steps:[]}),{done:0,total:0,unknown:0,percent:0});
});

test('raíces: con el huevo recibido, el paso actual es hacerlo eclosionar y los siguientes quedan pendientes',()=>{
 const roots=byId(build({ownQuestItems:['QI13']}).views,'roots');
 assert.deepEqual(roots.steps.map(s=>s.status),['done','done','current','pending']);
 assert.equal(roots.currentStep.label,'Hacerlo eclosionar en el árbol de Perpetva');
 assert.equal(roots.progress.done,2);
 assert.equal(roots.progress.percent,50);
 assert.match(roots.currentStep.how,/Serranía del Ocaso Perpetuo/);
 const item=roots.currentStep.items[0];
 assert.equal(item.id,'QI14');
 assert.equal(item.area,'Serranía del Ocaso Perpetuo');
 assert.equal(item.hasMapPosition,true);
 assert.equal(item.hint,'Egg hatching');
 assert.equal(item.hasCatalogGuide,false);
 assert.ok(item.accessLabel&&item.ownershipLabel);
});

test('la guía añadida por la aplicación no desplaza la pista de ubicación del catálogo',()=>{
 const data={commonElements:{ID_INVENTORY:{ownRellics:[],ownQuestItems:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[],wearRellics:[]},ID_EVENT_MANAGER:{flags:{}},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};
 const analysis=analyze(data,catalog),access=analyzeAccess(data,analysis,model);
 const ctx={rows:new Map(analysis.rows.map(r=>[r.id,r])),access,communication:comm,positions:mapData.positions,guideFor:row=>(row.guide??'')+' Falta un evento de entrega.'};
 const item=byId(buildQuestViews(analyzeQuests(data,analysis),ctx),'roots').steps[2].items[0];
 assert.equal(item.id,'QI14');
 assert.equal(item.guide,'Falta un evento de entrega.');
 assert.equal(item.hasCatalogGuide,false);
 assert.equal(item.hint,'Egg hatching');
});

test('una misión completada no tiene paso actual y todos sus pasos constan como confirmados',()=>{
 const {views}=build({ownRellics:['RE10'],ownQuestItems:[]});
 const roots=byId(views,'roots');
 assert.equal(roots.state,'completed');
 assert.equal(roots.currentStep,null);
 assert.ok(roots.steps.every(s=>s.status==='done'));
});

test('bloqueos: señala qué reliquia falta para llegar a un objeto del paso pendiente',()=>{
 const roots=byId(build().views,'roots');
 assert.ok(roots.blockers.some(b=>b.id==='QI10'&&b.missing.includes('Sangre Perpetuada en Arena')&&b.relicIds.includes('RE01')));
 // con la reliquia el bloqueo desaparece
 const withRelic=byId(build({ownRellics:['RE01']}).views,'roots');
 assert.ok(!withRelic.blockers.some(b=>b.id==='QI10'));
});

test('en listas de comprobación los bloqueos recogen todos los pasos pendientes',()=>{
 const tentudia=byId(build().views,'tentudia');
 assert.equal(tentudia.currentStep,null);
 assert.deepEqual(tentudia.blockers.map(b=>b.id).sort(),['QI06','QI08']);
});

test('cada objeto de un paso conserva posesión, acceso y posibilidad de verlo en el mapa',()=>{
 const {views}=build({ownQuestItems:['QI19']});
 const herb=byId(views,'tirso').steps.find(s=>s.items[0]?.id==='QI19').items[0];
 assert.equal(herb.ownership,'obtained');
 assert.equal(herb.ownershipLabel,'Lo tienes');
 assert.equal(herb.accessState,'obtained');
 for(const view of views)for(const step of view.steps)for(const item of step.items)assert.equal(item.hasMapPosition,Boolean(mapData.positions[item.id]?.length));
});

test('las áreas sin catalogar no se muestran como si fueran una zona',()=>{
 const prayer=questItemView('PR201',{rows:new Map(catalog.map(r=>[r.id,{...r,status:'missing'}])),access:{items:new Map(),context:null},communication:comm});
 assert.equal(prayer.area,'');
});

test('orden: seguidas primero, luego en curso, y las completadas al final sin alterar el orden relativo',()=>{
 const {views}=build({ownRellics:['RE10']},{MIRIAM_CHALLENGE_1:true,GEMINO_FIRST_CONVERSATION_DONE:false});
 const tracked=new Set(['jocinero']);
 const sorted=sortQuestViews(views,tracked);
 assert.equal(sorted[0].id,'jocinero');
 assert.equal(sorted.at(-1).state,'completed');
 assert.equal(sorted.length,views.length);
 const rest=sorted.slice(1).filter(v=>v.state==='unknown').map(v=>v.id);
 assert.deepEqual(rest,views.filter(v=>v.state==='unknown'&&v.id!=='jocinero').map(v=>v.id));
});

test('filtros y contadores coinciden con las vistas',()=>{
 const {views}=build({ownRellics:['RE10']});
 const tracked=new Set(['roots','jocinero']);
 const counts=questFilterCounts(views,tracked);
 assert.deepEqual(Object.keys(counts),QUEST_FILTERS.map(f=>f.id));
 assert.equal(counts.all,views.length);
 assert.equal(counts.tracked,2);
 assert.equal(counts.completed+counts.pending+counts.lost,views.length);
 assert.equal(filterQuestViews(views,'completed',tracked).every(v=>v.state==='completed'),true);
 assert.equal(questMatchesFilter(views[0],'desconocido',tracked),false);
});

test('vecinos: anterior y siguiente dentro de la lista visible',()=>{
 const {views}=build();
 const mid=views[3].id;
 const n=questNeighbors(views,mid);
 assert.equal(n.previous.id,views[2].id);assert.equal(n.next.id,views[4].id);assert.equal(n.position,4);assert.equal(n.total,views.length);
 assert.equal(questNeighbors(views,views[0].id).previous,null);
 assert.equal(questNeighbors(views,views.at(-1).id).next,null);
 assert.deepEqual(questNeighbors(views,'inexistente'),{previous:null,next:null,position:0,total:views.length});
});

test('el seguimiento guardado descarta misiones desconocidas y datos que no son texto',()=>{
 const {quests}=build();
 assert.deepEqual([...sanitizeTrackedQuests(['roots','nada',5,null,'tirso'],quests)].sort(),['roots','tirso']);
 assert.equal(sanitizeTrackedQuests('roots',quests).size,0);
 assert.equal(sanitizeTrackedQuests(undefined,quests).size,0);
});
