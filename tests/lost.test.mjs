import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyze} from '../engine.mjs';
import {analyzeAccess,accessContext,ACCESS_LABEL} from '../access-model.mjs';
import {analyzeLost,ESDRAS_DOOR_ITEMS} from '../lost-model.mjs';
import {analyzeQuests} from '../quest-model.mjs';
import {createCommunication} from '../communication-model.mjs';
import {buildQuestViews} from '../quest-view-model.mjs';

const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const catalog=read('catalog.json'),model=read('access-data.json'),mapData=read('map-data.json'),comm=createCommunication(catalog,model);

function world(flags={},inventory={}){
 const data={commonElements:{ID_INVENTORY:{ownRellics:[],ownQuestItems:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[],wearRellics:[],...inventory},ID_EVENT_MANAGER:{flags},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};
 const analysis=analyze(data,catalog),lost=analyzeLost(data,analysis),access=analyzeAccess(data,analysis,model),quests=analyzeQuests(data,analysis);
 const ctx={rows:new Map(analysis.rows.map(r=>[r.id,r])),access,communication:comm,positions:mapData.positions};
 return {data,analysis,lost,access,quests,views:buildQuestViews(quests,ctx)};
}
const quest=(w,id)=>w.quests.find(q=>q.id===id);

test('Esdras derrotado sin la llave: se pierden la llave, la puerta de Diosdado y el final C',()=>{
 const w=world({D08Z01S01_BOSSDEAD:true});
 assert.deepEqual([...w.lost.items.keys()].sort(),['HE201','QI204','QI301','RB301']);
 for(const id of ['diosdado','eventide'])assert.equal(quest(w,id).state,'lost',id);
 for(const id of ['QI204','HE201','QI301','RB301']){const a=w.access.items.get(id);assert.equal(a.state,'lost',id);assert.match(a.reasons[0],/Esdras/);}
 assert.equal(ACCESS_LABEL.lost,'Perdido en esta partida');
 assert.match(quest(w,'diosdado').next,/Ya no se puede completar/);
});

test('sin prueba no se afirma nada: Esdras vivo o bandera ausente no pierde nada',()=>{
 for(const flags of [{D08Z01S01_BOSSDEAD:false},{}]){
  const w=world(flags);
  assert.equal(w.lost.items.size,0);
  assert.notEqual(quest(w,'diosdado').state,'lost');
  assert.notEqual(w.access.items.get('QI204').state,'lost');
 }
});

test('si ya tienes la llave o la puerta está abierta, no se pierde nada aunque Esdras haya caído',()=>{
 for(const [flags,inv] of [[{D08Z01S01_BOSSDEAD:true,SERENO_DOOR_REVEALED:true},{}],[{D08Z01S01_BOSSDEAD:true},{ownQuestItems:['QI204']}],[{D08Z01S01_BOSSDEAD:true,ESDRAS_KEY_REWARD:true},{}]]){
  const w=world(flags,inv);
  assert.equal(w.lost.items.size,0,JSON.stringify(flags));
  assert.notEqual(quest(w,'diosdado').state,'lost');
 }
});

test('lo que ya tienes nunca figura como perdido y la Herida de la Abnegación depende de liberar a Crisanta',()=>{
 const w=world({D08Z01S01_BOSSDEAD:true},{ownSwords:['HE201'],ownQuestItems:['QI301']});
 assert.ok(!w.lost.items.has('HE201'));assert.ok(!w.lost.items.has('QI301'));
 assert.equal(w.access.items.get('HE201').state,'obtained');
 const freed=world({D08Z01S01_BOSSDEAD:true,CRISANTA_LIBERATED:true});
 assert.ok(!freed.lost.items.has('QI301'));
});

test('Tirso ausente: se pierde la recompensa final y la misión; con la recompensa cobrada no',()=>{
 const w=world({TIRSO_TIRSO_DEAD:true});
 assert.deepEqual([...w.lost.items.keys()],['QI56']);
 assert.equal(quest(w,'tirso').state,'lost');
 assert.equal(w.access.items.get('QI56').state,'lost');
 const done=world({TIRSO_TIRSO_DEAD:true,TIRSO_LASTREWARD_DONE:true});
 assert.equal(done.lost.items.size,0);assert.equal(quest(done,'tirso').state,'completed');
 // Tirso vivo con pacientes muertos sigue siendo una ruta alternativa, no una pérdida
 const alt=world({TIRSO_TIRSO_DEAD:false,TIRSO_KISSER1_DEAD:true});
 assert.equal(quest(alt,'tirso').state,'alternative');assert.equal(alt.lost.items.size,0);
});

test('una misión perdida no tiene paso actual, sus pasos pendientes constan como perdidos y no hay bloqueos',()=>{
 const w=world({D08Z01S01_BOSSDEAD:true});
 const view=w.views.find(v=>v.id==='diosdado');
 assert.equal(view.state,'lost');assert.equal(view.currentStep,null);assert.deepEqual(view.blockers,[]);
 assert.match(view.lostReason,/Esdras/);
 assert.deepEqual(view.steps.map(s=>s.status),['lost','lost','lost','lost'].map((s,i)=>view.steps[i].value===true?'done':s));
 assert.ok(view.steps.every(s=>s.status!=='current'));
});

test('la puerta de Diosdado es la única entrada a las salas de los objetos declarados perdidos con ella',()=>{
 // Grafo de salas sin condiciones: lo que sea inalcanzable sin esa puerta depende de ella con cualquier equipo.
 const reach=skip=>{
  const edges=new Map();
  for(const d of model.doors){if(!d.originalDoor||d.id===skip||d.originalDoor===skip)continue;const a=d.id.split('[')[0],b=d.originalDoor.split('[')[0];(edges.get(a)??edges.set(a,new Set()).get(a)).add(b);(edges.get(b)??edges.set(b,new Set()).get(b)).add(a);}
  const seen=new Set(['D17Z01S01']),queue=['D17Z01S01'];
  while(queue.length){for(const n of edges.get(queue.pop())??[])if(!seen.has(n)){seen.add(n);queue.push(n);}}
  return seen;
 };
 const door=model.doors.find(d=>d.id==='D05Z01S03[Frontal]');
 assert.ok(door,'la puerta existe en el grafo');
 const other=door.originalDoor,withDoor=reach(null),without=reach(door.id);
 const dependent=[...withDoor].filter(r=>!without.has(r)).sort();
 assert.ok(other);
 for(const id of ['HE201','RB301'])assert.ok(dependent.includes(model.items[id].room),id+' ('+model.items[id].room+') debe depender de la puerta; dependientes: '+dependent);
 assert.deepEqual(ESDRAS_DOOR_ITEMS,['QI204','HE201','RB301']);
});

const confessorFlags=suffix=>Object.fromEntries([1,2,3,4,5,6,7].map(n=>['CONFESSOR_'+n+'_'+suffix,true]));

test('Final A: con la culpa preparada y los confesores hechos, el paso actual es derrotar a Escribar',()=>{
 const w=world({...confessorFlags('DESTROYED'),...confessorFlags('ARENACOMPLETED'),D07Z01S02_BOSSDEAD:false,D07Z01S03_ENDING_A:false},{ownBeads:['RB41']});
 const q=w.views.find(v=>v.id==='ending-a');
 assert.deepEqual(q.steps.map(s=>s.status),['done','done','done','done','current','pending']);
 assert.equal(q.currentStep.label,'Derrotar a Su Santidad Escribar');
 assert.match(q.next,/Deambulador de sus Santidades/);
});

test('Final A: con una estatua sin destruir no se da por hecho el paso y el final queda en el B',()=>{
 const flags={...confessorFlags('DESTROYED'),...confessorFlags('ARENACOMPLETED'),CONFESSOR_7_DESTROYED:false};
 const q=world(flags,{ownBeads:['RB41']}).quests.find(q=>q.id==='ending-a');
 assert.equal(q.steps[2].value,false);assert.equal(q.steps[3].value,true);
});

test('Final A: poseer la Herida Santa de la Abnegación lo hace imposible y conseguirlo lo marca como completado',()=>{
 const lostQ=world({},{ownQuestItems:['QI301']}).quests.find(q=>q.id==='ending-a');
 assert.equal(lostQ.state,'lost');assert.match(lostQ.next,/final C/);
 const done=world({D07Z01S03_ENDING_A:true}).quests.find(q=>q.id==='ending-a');
 assert.equal(done.state,'completed');
});
