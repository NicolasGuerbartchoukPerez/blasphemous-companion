import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {analyze} from '../engine.mjs';import {analyzeAccess} from '../access-model.mjs';import {createCommunication} from '../communication-model.mjs';import {createQuadrantModel,validatePosition} from '../quadrant-model.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')),catalog=read('catalog.json'),model=read('access-data.json'),map=read('game-map.json'),comm=createCommunication(catalog,model),quadrants=createQuadrantModel(map,model,comm);
const save={commonElements:{ID_INVENTORY:{ownRellics:[],wearRellics:[],ownQuestItems:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[]},ID_EVENT_MANAGER:{flags:{}},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};
const ctx=analyzeAccess(save,analyze(save,catalog),model).context;
test('casillas especiales distinguen raíz, caída, llave y entrada normal alternativa',()=>{
 const paths=quadrants.specialPaths(ctx);assert.ok(paths.some(p=>p.presentation.fall&&p.requirements.some(r=>r.id==='RE05')));assert.ok(paths.some(p=>p.requirements.some(r=>r.id==='RE10')));assert.ok(paths.some(p=>p.extras.some(a=>/Key$/.test(a.variable))));
 const withAlternative=map.cells.map(c=>quadrants.describeCell(c.x+':'+c.y,ctx,new Set(),paths)).find(c=>c.special&&c.regularEntrance);assert.ok(withAlternative);assert.equal(withAlternative.explored,false);
 const simple=map.cells.map(c=>quadrants.describeCell(c.x+':'+c.y,ctx,new Set(),paths)).find(c=>!c.special);assert.ok(simple);assert.deepEqual(simple.incoming,[]);assert.deepEqual(simple.within,[]);
});
test('seleccionar sin descubrir no inventa un requisito para toda la sala',()=>{
 const paths=quadrants.specialPaths(ctx),p=paths.find(p=>p.position?.arrival&&p.presentation.fall),c=p.position.arrival,key=c.x+':'+c.y;
 const before=quadrants.describeCell(key,ctx,new Set(),paths),after=quadrants.describeCell(key,ctx,new Set([key]),paths);assert.equal(before.explored,false);assert.equal(after.explored,true);assert.ok(before.incoming.some(a=>a.id===p.id));assert.equal(before.cell.room,c.room);
 for(const p of paths){assert.doesNotMatch(p.routes.flat().map(a=>a.label).join(' '),/mod\/glitch|canCrossGap|D\d+Z\d+S\d+\[/);if(p.position){assert.ok(quadrants.grid.has(p.position.cell.x+':'+p.position.cell.y));}}
 assert.equal(quadrants.describeCell('9999:9999',ctx),null);
});
test('posición acepta solo señal reciente y casilla de la sala real',()=>{
 const now=Date.now(),c=map.cells.find(c=>c.room==='D05Z02S06'),payload={protocol:1,kind:'blasphemous-position',state:'playing',updatedAt:new Date(now).toISOString(),x:c.x,y:c.y,room:c.room};
 assert.equal(validatePosition(payload,map,now).state,'playing');assert.equal(validatePosition({...payload,updatedAt:new Date(now-3000).toISOString()},map,now).state,'stale');assert.equal(validatePosition({...payload,updatedAt:new Date(now+10000).toISOString()},map,now).state,'stale');
 assert.throws(()=>validatePosition({...payload,room:'D17Z01S01'},map,now));assert.throws(()=>validatePosition({...payload,x:.5},map,now));assert.throws(()=>validatePosition({x:c.x,y:c.y},map,now));
});
test('menú, carga y lector cerrado no se sustituyen por el último altar',()=>{
 for(const state of ['loading','waiting','stopped','unavailable']){const result=validatePosition({protocol:1,kind:'blasphemous-position',state,updatedAt:new Date().toISOString()},map);assert.notEqual(result.state,'playing');assert.equal(result.x,undefined);assert.equal(result.room,undefined);}
});
