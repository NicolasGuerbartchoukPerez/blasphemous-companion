import {parseCondition,conditionVariables,RELIC_VARIABLES} from './access-model.mjs';

const specialKeys=new Set(['elderKey','bronzeKey','silverKey','goldKey','peaksKey','woodKey','scapular']);
const specialAction=v=>/^(opened|rode|broke)/.test(v)||['canBreakHoles','canWaterJump'].includes(v);
export function createQuadrantModel(gameMap,accessModel,communication){
 const grid=new Map(gameMap.cells.map(c=>[c.x+':'+c.y,c])),rooms=new Map();
 for(const c of gameMap.cells){if(!rooms.has(c.room))rooms.set(c.room,[]);rooms.get(c.room).push(c);}
 function path(door,ctx){
  const routes=communication.conditionRoutes(door.logic??'',ctx),variables=[...new Set(routes.flat().map(a=>a.variable).filter(Boolean))];
  const relics=communication.relicRequirements(door.logic??'',ctx).filter(r=>r.id!=='RE04');
  const extras=variables.filter(v=>specialKeys.has(v)||specialAction(v));
  if(!relics.length&&!extras.length)return null;
  const value=ctx.gate(door),gate={...door,room:door.id.split('[')[0],target:door.originalDoor?.split('[')[0],...value,kind:'path'};
  const presentation=communication.pathPresentation(gate,ctx);
  if(!relics.length){presentation.title=extras.some(v=>specialKeys.has(v))?'Puerta con llave':'Mecanismo o paso especial';presentation.status=value.value===true?'Requisito detectado como cumplido':'Comprueba este mecanismo en el juego';}
  return {...gate,presentation,requirements:relics,extras:extras.map(v=>({variable:v,label:communication.variableLabel(v),value:ctx.resolve(v).value})),routes};
 }
 function locate(door){
  const source=rooms.get(door.room)??[],target=rooms.get(door.target)??[];if(!source.length)return null;
  const tag=door.id.match(/\[([^\]]+)\]/)?.[1],dir=door.direction===6?1:({N:0,S:1,W:2,E:3}[tag]??({0:0,1:2,2:3}[door.direction]??1)),delta=[[0,1],[0,-1],[-1,0],[1,0]][dir];
  const exact=source.filter(c=>c.doors[dir]&&grid.get((c.x+delta[0])+':'+(c.y+delta[1]))?.room===door.target);
  let candidates=exact.length?exact:door.direction===6?source.filter(c=>c.y===Math.min(...source.map(c=>c.y))):source.filter(c=>c.doors[dir]);if(!candidates.length)candidates=source;
  const score=c=>target.length?Math.min(...target.map(t=>Math.hypot(t.x-c.x,t.y-c.y))):0,cell=candidates.reduce((a,b)=>score(a)<=score(b)?a:b);
  const arrival=target.length?target.reduce((a,b)=>Math.hypot(a.x-cell.x,a.y-cell.y)<=Math.hypot(b.x-cell.x,b.y-cell.y)?a:b):null;
  return {cell,arrival,approximate:exact.length!==1||door.direction===6};
 }
 function specialPaths(ctx){return accessModel.doors.map(d=>path(d,ctx)).filter(Boolean).map(p=>({...p,position:locate(p)}));}
 function describeCell(key,ctx,explored=new Set(),paths=specialPaths(ctx)){
  const cell=grid.get(key);if(!cell)return null;
  const incoming=paths.filter(p=>p.target===cell.room&&p.room!==cell.room),within=paths.filter(p=>p.room===cell.room);
  const regularEntrance=accessModel.doors.some(d=>d.originalDoor?.split('[')[0]===cell.room&&d.id.split('[')[0]!==cell.room&&!path(d,ctx));
  return {cell,area:communication.areaForRoom(cell.room),explored:explored.has(key),incoming,within,regularEntrance,special:incoming.length>0||within.length>0};
 }
 return {grid,rooms,specialPaths,describeCell,locate};
}
export function validatePosition(payload,gameMap,now=Date.now()){
 if(!payload||payload.protocol!==1||payload.kind!=='blasphemous-position')throw new Error('Este archivo no es una señal de posición del lector de Blasphemous.');
 const stamp=Date.parse(payload.updatedAt);if(!Number.isFinite(stamp)||stamp>now+5000||now-stamp>2500)return {state:'stale',message:'El lector ha dejado de actualizarse. Vuelve a iniciarlo; no se muestra una posición antigua como actual.'};
 if(payload.state==='unmapped')return {state:'unavailable',message:'Esta sala no pertenece al mapa de Cvstodia incluido, por ejemplo un desafío de Miriam. El seguimiento se recuperará al regresar al mapa compatible.'};
 if(payload.state!=='playing')return {state:payload.state==='waiting'?'waiting':'unavailable',message:payload.state==='waiting'?'Esperando a que abras Blasphemous y entres en la partida.':'La posición no está disponible durante la carga, el menú o en esta versión del juego.'};
 if(!Number.isInteger(payload.x)||!Number.isInteger(payload.y)||typeof payload.room!=='string')throw new Error('La señal de posición está incompleta.');
 const cell=gameMap.cells.find(c=>c.x===payload.x&&c.y===payload.y&&c.room===payload.room);
 if(!cell)throw new Error('La casilla recibida no coincide con el mapa de Blasphemous 1. No se ha colocado un marcador aproximado.');
 return {state:'playing',x:cell.x,y:cell.y,room:cell.room,updatedAt:stamp};
}
