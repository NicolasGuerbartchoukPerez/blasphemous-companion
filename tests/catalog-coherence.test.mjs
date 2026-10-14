import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCommunication} from '../communication-model.mjs';
import {analyzeQuests} from '../quest-model.mjs';
import {analyze} from '../engine.mjs';
import {analyzeAccess} from '../access-model.mjs';

const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const catalog=read('catalog.json'),model=read('access-data.json'),game=read('game-map.json'),mapData=read('map-data.json'),ver=read('verification-data.json');
const comm=createCommunication(catalog,model);
const UNCATALOGUED=new Set(['Zona no catalogada','Consultar guía del objeto']);
const zone=room=>room.replace(/S\d+$/,'');
// Objetos cuya zona no se ha podido verificar: se muestran como «sin catalogar» en la interfaz, nunca con una zona inventada.
const KNOWN_UNVERIFIED=new Set(['RB101','RB102','RB103','PR201']);

test('las salas de una misma zona comparten nombre de zona en el catálogo',()=>{
 const byZone=new Map();
 for(const r of catalog.filter(r=>r.room&&!UNCATALOGUED.has(r.area))){const set=byZone.get(zone(r.room))??byZone.set(zone(r.room),new Set()).get(zone(r.room));set.add(r.area);}
 for(const [z,areas] of byZone)assert.equal(areas.size,1,'zona '+z+' con nombres distintos: '+[...areas].join(' / '));
});

test('la zona del catálogo coincide con la zona de la celda donde el mapa sitúa cada objeto',()=>{
 const byXY=new Map(game.cells.map(c=>[c.x+','+c.y,c.room]));
 const mismatches=[];
 for(const r of catalog){
  const p=mapData.positions[r.id]?.[0];if(!p||!r.room||/^Initial/.test(r.room)||UNCATALOGUED.has(r.area))continue;
  const cellRoom=byXY.get(p.x+','+p.y);if(!cellRoom)continue;
  const cellArea=comm.areaForRoom(cellRoom);
  if(cellArea!==r.area)mismatches.push(r.id+': catálogo «'+r.area+'» frente a mapa «'+cellArea+'»');
 }
 assert.deepEqual(mismatches,[]);
});

test('correcciones verificadas con la wiki: tienda de Candelaria en Sueños de Misericordia y regalos de Cleofás en Albero',()=>{
 const area=id=>catalog.find(r=>r.id===id).area;
 for(const id of ['RB05','RB09','QI58'])assert.equal(area(id),'Sueños de Misericordia',id);
 for(const id of ['PR11','RB104','RB105','QI201'])assert.equal(area(id),'Albero',id);
});

test('todo objeto usado en una misión tiene zona (salvo excepciones declaradas) y una pista en español si no tiene guía',()=>{
 const rows=new Map(catalog.map(r=>[r.id,r]));
 const data={commonElements:{ID_INVENTORY:{ownRellics:[],ownQuestItems:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[],wearRellics:[]},ID_EVENT_MANAGER:{flags:{}},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};
 const analysis=analyze(data,catalog,ver),access=analyzeAccess(data,analysis,model);
 const quests=analyzeQuests(data,analysis,access);
 const ids=new Set();for(const q of quests){q.steps.forEach(s=>s.items.forEach(i=>ids.add(i)));q.related.forEach(i=>ids.add(i));}
 const noZone=[],noSpanish=[];
 for(const id of ids){const r=rows.get(id);if(!r){noZone.push(id+' (no está en el catálogo)');continue;}
  if(UNCATALOGUED.has(r.area)&&!KNOWN_UNVERIFIED.has(id))noZone.push(id);
  if(!r.guide&&r.hint&&!r.hintEs)noSpanish.push(id);}
 assert.deepEqual(noZone,[]);
 assert.deepEqual(noSpanish,[]);
});
