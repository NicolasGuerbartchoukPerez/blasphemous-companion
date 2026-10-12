import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {analyze} from '../engine.mjs';import {analyzeAccess} from '../access-model.mjs';import {createCommunication} from '../communication-model.mjs';
const read=f=>JSON.parse(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')),catalog=read('catalog.json'),model=read('access-data.json'),comm=createCommunication(catalog,model);
function run(relics=[],quest=[],worn=[]){const data={commonElements:{ID_INVENTORY:{ownRellics:relics,wearRellics:worn,ownQuestItems:quest,ownBeads:[],ownPrayers:[],ownSwords:[],ownCollectibleItems:[]},ID_EVENT_MANAGER:{flags:Object.fromEntries(Array.from({length:38},(_,i)=>['RESCUED_CHERUB_'+String(i+1).padStart(2,'0'),i<17]))},ID_PERSISTENT_MANAGER:{IsNewGamePlus:false}},sceneElements:{}};const analysis=analyze(data,catalog);return {analysis,access:analyzeAccess(data,analysis,model)};}
test('raíces y caídas explican efecto, equipo y adquisición con nombres reales',()=>{
 const {access}=run();
 const roots=comm.pathPresentation({room:'D01Z03S03',target:'D01Z05S06',direction:2,logic:'canWalkOnRoot',value:false},access.context);
 assert.equal(roots.title,'Raíces');assert.equal(roots.requirements[0].name,'Tres Lenguas Nudosas');assert.match(roots.requirements[0].action,/raíces de las paredes/);
 const fall=comm.pathPresentation({room:'D01Z03S03',target:'D01Z05S06',direction:6,logic:'linen',value:false},access.context);
 assert.equal(fall.title,'Caída por abismo');assert.equal(fall.primary,'RE05');assert.match(fall.requirements[0].instruction,/no convierte todas las caídas en seguras/);assert.match(fall.requirements[0].obtain,/20 querubines/);
});
test('alternativas vanilla no presentan todas las reliquias como obligatorias',()=>{
 const {access}=run(['RE05']);const req=comm.relicRequirements('nail || linen || doubleJump',access.context);
 assert.deepEqual(req.map(r=>r.id),['RE03','RE05']);assert.ok(req.every(r=>r.optional));assert.equal(comm.conditionRoutes('canWalkOnRoot || canCrossGap3',access.context).length,1);
 for(const id of ['QI45','PR16']){assert.equal(access.items.get(id).condition,'nail || linen');const p=comm.itemPresentation(catalog.find(r=>r.id===id),access.items.get(id),access.context);assert.match(p.next,/Dos rutas/);assert.match(p.next,/Lienzo de Hilo de Oro/);}
});
test('un requisito de entrada heredado del abismo muestra el Lienzo',()=>{
 const {access}=run();const fall=model.doors.find(d=>d.direction===6&&d.logic==='linen');assert.ok(fall);
 assert.ok(comm.relicRequirements(fall.originalDoor,access.context).some(r=>r.id==='RE05'));
});
test('tener, equipar y confirmar posesión son estados independientes',()=>{
 const {access,analysis}=run(['RE10'],['QI13']);const req=comm.relicRequirements('canWalkOnRoot',access.context)[0];assert.equal(req.owned,true);assert.equal(req.equipped,false);assert.match(req.status,/equípala/);
 const next=comm.itemPresentation(analysis.rows.find(r=>r.id==='RE05'),access.items.get('RE05'),access.context);assert.match(next.next,/17 de 20/);assert.match(next.next,/3 más/);
 const unknown=comm.itemPresentation({...analysis.rows.find(r=>r.id==='QI13'),status:'unknown'},access.items.get('QI13'),access.context);assert.match(unknown.note,/acceso y la posesión/);
});
test('todos los objetos y caminos ocultan códigos internos y técnicas excluidas',()=>{
 for(const relics of [[],['RE01','RE07'],['RE01','RE03','RE04','RE05','RE07','RE10']]){const {access,analysis}=run(relics);const texts=[];
  for(const row of analysis.rows){const p=comm.itemPresentation(row,access.items.get(row.id),access.context);texts.push(p.title,p.next,p.note,...p.reasons,...p.routes.flat().map(a=>a.label));}
  for(const gate of access.barriers){const p=comm.pathPresentation(gate,access.context);texts.push(p.title,p.place,p.status,...gate.reasons.map(comm.friendlyReason),...p.routes.flat().map(a=>a.label));}
  assert.doesNotMatch(texts.join('\n'),/D\d+[A-Z0-9]*\[|Paso previo|canWalkOnRoot|canClimbOnRoot|canCrossGap|redentoRooms|miriamRooms|mod\/glitch/);
 }
});
test('comparaciones de cantidades explican mínimo, máximo e igualdad correctamente',()=>{
 const {access}=run();for(const [condition,expected]of [['cherubs >= 20',false],['cherubs <= 20',true],['cherubs == 17',true],['cherubs != 17',false],['cherubs < 17',false],['cherubs > 16',true]])assert.equal(comm.conditionRoutes(condition,access.context)[0][0].satisfied,expected);
 assert.match(comm.conditionRoutes('cherubs >= 20',access.context)[0][0].label,/querubines rescatados: mínimo 20/);
});
