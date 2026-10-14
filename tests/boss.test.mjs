import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyze} from '../engine.mjs';
import {analyzeAccess,BOSS_FLAGS} from '../access-model.mjs';
import {createCommunication} from '../communication-model.mjs';
import {BOSSES,BOSS_FILTERS,analyzeBosses,computeRouteNeeds,filterBosses,bossFilterCounts} from '../boss-model.mjs';

const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const catalog=read('catalog.json'),model=read('access-data.json'),game=read('game-map.json'),comm=createCommunication(catalog,model);
const catalogIds=new Set(catalog.map(r=>r.id));

function build(flags={},inventory={},withNeeds=false){
 const data={commonElements:{ID_INVENTORY:{ownRellics:[],ownQuestItems:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[],wearRellics:[],...inventory},ID_EVENT_MANAGER:{flags},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};
 const analysis=analyze(data,catalog),access=analyzeAccess(data,analysis,model);
 const needs=withNeeds?computeRouteNeeds({data,analysis,model,rooms:BOSSES.map(b=>b.room).filter(Boolean)}):null;
 return analyzeBosses({data,analysis,model,access,cells:game.cells,areaForRoom:comm.areaForRoom,needs});
}
const byId=(views,id)=>views.find(v=>v.id===id);

test('integridad: banderas únicas y conocidas, cada jefe sabe dónde está y los objetos citados existen',()=>{
 assert.equal(new Set(BOSSES.map(b=>b.id)).size,BOSSES.length);
 assert.equal(new Set(BOSSES.map(b=>b.flag)).size,BOSSES.length);
 const known=new Set([...Object.values(BOSS_FLAGS),'D07Z01S02_BOSSDEAD']);
 const rooms=new Set(game.cells.map(c=>c.room));
 for(const b of BOSSES){
  assert.match(b.flag,/_BOSSDEAD$/,b.id);
  assert.ok(known.has(b.flag),b.id+': bandera desconocida');
  assert.ok(b.name&&b.englishName&&b.notes.length,b.id);
  // o hay casillas reales de la arena, o se indica la zona a mano: nunca un jefe sin ubicación
  assert.ok(rooms.has(b.room)||b.area,b.id+' sin ubicación');
  for(const id of b.fightRequirements?.ids??[])assert.ok(catalogIds.has(id),b.id+' cita un objeto inexistente '+id);
 }
});

test('el estado sale de la bandera de derrota; sin bandera consta como sin confirmar',()=>{
 const v=build({D08Z01S01_BOSSDEAD:true,D07Z01S02_BOSSDEAD:false});
 assert.equal(byId(v,'esdras').state,'defeated');
 assert.equal(byId(v,'escribar').state,'pending');
 assert.equal(byId(v,'crisanta').state,'unknown');
});

test('la ubicación en el mapa sale de las casillas reales de la arena y la zona no cae en «Cvstodia»',()=>{
 const v=build();
 const esdras=byId(v,'esdras');
 assert.deepEqual(esdras.position,{x:52,y:41});assert.equal(esdras.cellKey,'52:41');assert.equal(esdras.area,'Puente de los Tres Calvarios');
 assert.equal(byId(v,'our-lady').position,null);
 for(const b of v)assert.notEqual(b.area,'Cvstodia',b.id);
});

test('requisito propio del combate: Tres Angustias exige la Protección de Perpetva',()=>{
 const without=byId(build({D03Z04S01_BOSSDEAD:false}),'tres-angustias');
 assert.equal(without.fight.met,false);assert.equal(without.hasRequirements,true);assert.equal(without.needsLabel,'Requiere objetos o progreso');
 const withBead=byId(build({D03Z04S01_BOSSDEAD:false},{ownBeads:['RB13']}),'tres-angustias');
 assert.equal(withBead.fight.met,true);assert.equal(withBead.hasRequirements,false);assert.equal(withBead.needsLabel,'Basta con llegar');
});

test('rutas: desde cero, Esdras requiere derrotar antes al primer guardián; con él derrotado deja de exigirlo',()=>{
 const start=byId(build({},{},true),'esdras');
 assert.equal(start.route,'blocked');
 assert.ok(start.required.some(r=>r.type==='boss'&&r.flag==='D17Z01_BOSSDEAD'));
 const after=byId(build({D17Z01_BOSSDEAD:true},{},true),'esdras');
 assert.ok(!after.required.some(r=>r.flag==='D17Z01_BOSSDEAD'));
});

test('rutas: los jefes de las máscaras exigen las tres Santas Llagas desde cero',()=>{
 const m=byId(build({},{},true),'melquiades');
 assert.deepEqual(m.required.filter(r=>r.type==='item').map(r=>r.id).sort(),['QI38','QI39','QI40']);
});

test('un jefe derrotado no pide nada y sin cálculo de rutas no se inventan requisitos',()=>{
 const done=byId(build({D01Z06S01_BOSSDEAD:true},{},true),'ten-piedad');
 assert.equal(done.route,'done');assert.deepEqual(done.required,[]);assert.equal(done.needsLabel,'');
 const lazy=byId(build({},{}),'melquiades');
 assert.equal(lazy.route,'blocked');assert.deepEqual(lazy.required,[]);
});

test('jefes cuya arena no figura en el grafo de rutas se declaran como ruta no calculable',()=>{
 const v=build({D02Z05S01_BOSSDEAD:false});
 assert.equal(byId(v,'our-lady').route,'unknown');assert.equal(byId(v,'our-lady').needsLabel,'Ruta no calculable');
});

test('filtros y contadores coinciden',()=>{
 const v=build({D01Z06S01_BOSSDEAD:true,D07Z01S02_BOSSDEAD:false},{},true);
 const counts=bossFilterCounts(v);
 assert.deepEqual(Object.keys(counts),BOSS_FILTERS.map(f=>f.id));
 assert.equal(counts.all,BOSSES.length);
 assert.equal(counts.defeated,1);
 assert.equal(counts.pending,BOSSES.length-1);
 assert.ok(filterBosses(v,'reachable').every(b=>b.canReachNow));
 assert.ok(filterBosses(v,'requires').every(b=>b.hasRequirements));
});
