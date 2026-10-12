import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseCondition,evaluateCondition,analyzeAccess} from '../access-model.mjs';import {analyze} from '../engine.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')),catalog=read('catalog.json'),model=read('access-data.json'),gameMap=read('game-map.json');
function save(quest=[],relics=[],flags={}){return {commonElements:{ID_INVENTORY:{ownQuestItems:quest,ownRellics:relics,wearRellics:[],ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[]},ID_EVENT_MANAGER:{flags:{D17Z01_BOSSDEAD:true,...flags}},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};}
const run=(data,m=model,options={})=>analyzeAccess(data,analyze(data,catalog),m,options);
test('alternativas AND/OR conservan desconocidos y no ejecutan código',()=>{
 const evalWith=(s,values)=>evaluateCondition(parseCondition(s),name=>({value:values[name]??null,reasons:[name],uses:[]}));
 assert.equal(evalWith('blood || (linen && nail)',{blood:false,linen:true,nail:true}).value,true);
 assert.equal(evalWith('blood || linen',{blood:false}).value,null);
 assert.equal(evalWith('blood && linen',{blood:false}).value,false);
 assert.equal(evalWith('cherubs >= 20',{cherubs:19}).value,false);
 assert.throws(()=>parseCondition('process.exit()'));assert.throws(()=>parseCondition('blood ||'));
});
test('no confunde visitar una sala con alcanzar todos sus pasos',()=>{
 const doors=[{id:'D17Z01S01[E]',originalDoor:'D01Z01S01[W]'},{id:'D01Z01S01[W]',originalDoor:'D17Z01S01[E]'},{id:'D01Z01S01[E]',originalDoor:'D01Z01S02[W]',logic:'blood'},{id:'D01Z01S02[W]',originalDoor:'D01Z01S01[E]'}];
 const m={...model,doors},without=run(save(),m),withBlood=run(save([],['RE01']),m);
 assert.equal(without.context.reachableRooms.has('D01Z01S02'),false);assert.equal(withBlood.context.reachableRooms.has('D01Z01S02'),true);
});
test('raíces, huevo y reliquias poseídas frente a equipadas',()=>{
 const egg=run(save(['QI13'],[],{ALTASGRACIAS_EGG_OFFERED:false}));
 assert.equal(egg.items.get('RE10').state,'blocked');assert.equal(egg.items.get('QI14').condition,'eggOffered || egg');
 const hatched=run(save(['QI14']));assert.equal(hatched.items.get('RE10').state,'available');
 const owned=run(save([],['RE10'])),equippedOnly=run(save([],['RE10']),model,{equipmentOnly:true});
 assert.equal(owned.context.resolve('canWalkOnRoot').value,true);assert.equal(equippedOnly.context.resolve('canWalkOnRoot').value,false);
 assert.ok(equippedOnly.context.resolve('canWalkOnRoot').reasons.some(x=>x.startsWith('Equipar')));
 assert.equal(run(save()).context.resolve('doubleJump').value,false);
});
test('victorias reales y misiones vanilla no se predicen por inventario',()=>{
 const result=run(save(['QI301','QI106'],['RE01'],{D09Z01S03_BOSSDEAD:false,CRISANTA_LIBERATED:false}));
 assert.equal(result.context.resolve('canBeatPrisonBoss').value,false);assert.equal(result.context.resolve('canBeatMourningBoss').value,null);
 assert.equal(result.items.get('HE07').state,'blocked');assert.equal(result.items.get('PR201').state,'unknown');
 const dead=run(save([],[],{D08Z01S01_BOSSDEAD:true}));assert.equal(dead.items.get('QI203').state,'blocked');
 const s=save();s.commonElements.ID_INVENTORY.wearSwords=['HE201'];assert.equal(run(s).items.get('PR15').state,'blocked');
});
test('compras y donaciones usan dinero real y saldo acumulado distinto',()=>{
 const s=save([],[],{D01Z06S01_BOSSDEAD:true});s.commonElements.ID_STATS={currentValues:{Purge:100},permanetBonus:{}};s.commonElements.ID_ALMS={tears:4900};
 let result=run(s);assert.equal(result.items.get('QI58').state,'blocked');assert.equal(result.items.get('RB104').state,'available');
 s.commonElements.ID_STATS.currentValues.Purge=50;result=run(s);assert.equal(result.items.get('RB104').state,'blocked');
});
test('mapa original, catálogo, reglas y pasos mantienen cobertura y coordenadas',()=>{
 assert.equal(gameMap.cells.length,993);assert.equal(new Set(gameMap.cells.map(c=>c.x+':'+c.y)).size,993);
 assert.equal(Object.keys(model.items).length,230);for(const r of catalog)assert.ok(model.items[r.id]);
 for(const d of model.doors)assert.doesNotThrow(()=>parseCondition(d.logic??''));for(const i of Object.values(model.items))assert.doesNotThrow(()=>parseCondition(i.logic??''));
 assert.ok(gameMap.cells.some(c=>c.ngplus));assert.equal(Object.keys(gameMap.tiles).length,36);assert.ok(gameMap.icons.cvstodiaMapBG.startsWith('data:image/svg+xml,'));
 assert.ok(run(save()).barriers.length>=100);assert.ok(!run(save()).barriers.some(b=>b.relics.includes('RE02')));
});
