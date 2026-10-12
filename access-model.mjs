// Three-valued conditions: absent event/unsupported mechanic stays unknown.
export const RELIC_VARIABLES={blood:'RE01',linen:'RE05',nail:'RE03',canWaterJump:'RE03',shroud:'RE04',canWalkOnRoot:'RE10',canClimbOnRoot:'RE10',ownsRoots:'RE10',canSurvivePoison1:'RE07',canSurvivePoison2:'RE07',canSurvivePoison3:'RE07'};
export const ACCESS_LABEL={available:'Accesible',blocked:'Requisito pendiente',unknown:'Por verificar',obtained:'Obtenido',later:'Nueva Partida+'};
const BOSS_FLAGS={canBeatBrotherhoodBoss:'D17Z01_BOSSDEAD',canBeatMercyBoss:'D01Z06S01_BOSSDEAD',canBeatConventBoss:'D02Z05S01_BOSSDEAD',canBeatGrievanceBoss:'D03Z04S01_BOSSDEAD',canBeatBridgeBoss:'D08Z01S01_BOSSDEAD',canBeatMothersBoss:'D04Z04S01_BOSSDEAD',canBeatCanvasesBoss:'D05Z01S13_BOSSDEAD',canBeatPrisonBoss:'D09Z01S03_BOSSDEAD',canBeatRooftopsBoss:'D06Z01S25_BOSSDEAD',canBeatOssuaryBoss:'D01BZ08S01_BOSSDEAD',canBeatMourningBoss:'D20Z02S08_BOSSDEAD',canBeatGraveyardBoss:'SANTOS_AMANECIDA_AXE_DEFEATED',canBeatJondoBoss:'SANTOS_AMANECIDA_FACCATA_DEFEATED',canBeatPatioBoss:'SANTOS_AMANECIDA_BOW_DEFEATED',canBeatWallBoss:'SANTOS_AMANECIDA_LANCE_DEFEATED',canBeatHallBoss:'SANTOS_LAUDES_DEFEATED'};
export const KEY_VARIABLES={elderKey:'QI58',bronzeKey:'QI69',silverKey:'QI70',goldKey:'QI71',peaksKey:'QI72',woodKey:'QI204',cloth:'QI66',hand:'QI67',hatchedEgg:'QI14',egg:'QI13',cord:'QI01',scapular:'QI203',trueHeart:'HE201',emptyThimble:'QI59',fullThimble:'QI57',driedFlowers:'QI68',bell:'QI106',wheel:'RB203',guiltBead:'RB41',ruby:'RB105',debla:'PR03',lorquiana:'PR07',zarabanda:'PR08',taranto:'PR09',verdiales:'PR14',cante:'PR12',cantina:'PR201',tiento:'PR11'};
const logicCache=new Map();
export function parseCondition(source=''){
 if(logicCache.has(source))return logicCache.get(source);
 if(!source.trim())return {type:'literal',value:true};
 const tokens=source.match(/D\d+[A-Z0-9]*\[[^\]]+\]|[A-Za-z_][A-Za-z_0-9]*|\d+(?:\.\d+)?|&&|\|\||>=|<=|==|!=|[!()<>]/g)??[];
 if(tokens.join('').replace(/\s/g,'')!==source.replace(/\s/g,''))throw new Error('Condición no compatible');
 let i=0;
 function atom(){const t=tokens[i++];if(t==='!')return {type:'not',child:atom()};if(t==='('){const v=or();if(tokens[i++]!==')')throw new Error('Paréntesis incompleto');return v;}if(!t)throw new Error('Falta condición');return /^\d/.test(t)?{type:'literal',value:Number(t)}:{type:'variable',name:t};}
 function comparison(){let a=atom();if(['>=','<=','>','<','==','!='].includes(tokens[i])){const op=tokens[i++];a={type:op,left:a,right:atom()};}return a;}
 function and(){let a=comparison();while(tokens[i]==='&&'){i++;a={type:'and',left:a,right:comparison()};}return a;}
 function or(){let a=and();while(tokens[i]==='||'){i++;a={type:'or',left:a,right:and()};}return a;}
 const tree=or();if(i!==tokens.length)throw new Error('Condición sobrante');logicCache.set(source,tree);return tree;
}
export function evaluateCondition(tree,resolve){
 const combine=(value,reasons=[],uses=[])=>({value,reasons:[...new Set(reasons)],uses:[...new Set(uses)]});
 if(tree.type==='literal')return combine(tree.value);
 if(tree.type==='variable')return resolve(tree.name);
 if(tree.type==='not'){const a=evaluateCondition(tree.child,resolve);return combine(a.value===null?null:!a.value,a.reasons,a.uses);}
 const a=evaluateCondition(tree.left,resolve),b=evaluateCondition(tree.right,resolve);
 if(tree.type==='and')return combine(a.value===false||b.value===false?false:a.value===null||b.value===null?null:Boolean(a.value&&b.value),[...(a.value===true?[]:a.reasons),...(b.value===true?[]:b.reasons)],[...a.uses,...b.uses]);
 if(tree.type==='or'){
  if(a.value===true||b.value===true){const ok=a.value===true&&b.value===true?(a.uses.length<=b.uses.length?a:b):a.value===true?a:b;return combine(true,[],ok.uses);}
  return combine(a.value===null||b.value===null?null:false,[a.reasons.join(' + '),b.reasons.join(' + ')].filter(Boolean).length>1?['Alternativas: '+[a.reasons.join(' + '),b.reasons.join(' + ')].join(' / ')]:[...a.reasons,...b.reasons]);
 }
 if(a.value===null||b.value===null)return combine(null,[...a.reasons,...b.reasons]);
 const value={'>=':()=>a.value>=b.value,'<=':()=>a.value<=b.value,'>':()=>a.value>b.value,'<':()=>a.value<b.value,'==':()=>a.value===b.value,'!=':()=>a.value!==b.value}[tree.type]();
 return combine(value,value?[]:[...a.reasons,...b.reasons].concat('Mínimo: '+b.value),[...a.uses,...b.uses]);
}
export function conditionVariables(tree){if(tree.type==='variable')return [tree.name];if(tree.child)return conditionVariables(tree.child);return tree.left?[...conditionVariables(tree.left),...conditionVariables(tree.right)]:[];}
export function accessContext(data,analysis,model,{equipmentOnly=false}={}){
 const c=data.commonElements, inv=c.ID_INVENTORY,flags=c.ID_EVENT_MANAGER?.flags??{},rows=new Map(analysis.rows.map(r=>[r.id,r]));
 const own=new Set(Object.keys(inv).filter(k=>/^(own|wear|historical)/.test(k)).flatMap(k=>Array.isArray(inv[k])?inv[k]:[]));
 const has=id=>own.has(id)||rows.get(id)?.status==='obtained';
 const worn=new Set(['wearRellics','wearRelics'].flatMap(k=>inv[k]??[]));
 const name=id=>rows.get(id)?.name??id;
 const flag=k=>typeof flags[k]==='boolean'?flags[k]:null;
 const count=ids=>ids.filter(has).length;
 const value=(v,reasons=[],uses=[])=>({value:v,reasons,uses});
 const visited=new Set(),seed=new Set(['D17Z01S01[E]']);
 for(const [room,scene]of Object.entries(data.sceneElements??{}))for(const o of Object.values(scene??{})){
  if(o?.objectUsed!==true)continue;
  const match=o.debugName?.match(/^ACT_Door_(D\d+[A-Z0-9]+)\s*\(([^)]+)\)/i);
  if(match){seed.add(room.toUpperCase()+'['+match[2]+']');visited.add(room.toUpperCase());}
 }
 for(const cell of analysis.mapCells??[])if(cell.room)visited.add(cell.room);
 const skills=c.ID_SKILLS?.Skills;const skill=p=>skills?Object.entries(skills).filter(([k,v])=>k.startsWith(p+'_')&&v===true).length:null;
 const getNumber=(v)=>Number.isFinite(v)?v:null;
 const money=getNumber(c.ID_STATS?.currentValues?.Purge),donations=getNumber(c.ID_ALMS?.tears);
 const namedCounts={cherubs:analysis.cherubsKnown?analysis.rescued:null,bones:analysis.rows.filter(r=>r.group==='bones'&&r.status==='obtained').length,holyWounds:count(['QI38','QI39','QI40']),masks:count(['QI60','QI61','QI62']),ceremonyItems:count(['QI10','QI11','QI12']),tentudiaRemains:count(['QI06','QI07','QI08']),marksOfRefuge:count(['QI02','QI03','QI04']),traitorEyes:count(['QI201','QI202']),herbs:count(['QI19','QI20','QI37','QI63','QI64','QI65']),verses:count(['QI107','QI108','QI109','QI110']),limestones:count(['RB20','RB21','RB22']),redWax:has('RB19')?3:has('RB18')?2:has('RB17')?1:0,blueWax:has('RB26')?3:has('RB25')?2:has('RB24')?1:0,tears:money,knots:getNumber(c.ID_STATS?.permanetBonus?.BeadSlots)};
 let reached=new Set(seed);const resolving=new Set();
 function resolve(variable){
  if(/^D\d/.test(variable)&&variable.includes('['))return value(reached.has(variable),['Paso previo '+variable]);
  if(RELIC_VARIABLES[variable]){const id=RELIC_VARIABLES[variable],yes=has(id)&&(variable==='ownsRoots'||!equipmentOnly||worn.has(id));return value(yes,[has(id)?'Equipar '+name(id):name(id)],[id]);}
  if(KEY_VARIABLES[variable]){const id=KEY_VARIABLES[variable];return value(has(id),[name(id)],[id]);}
  if(variable in namedCounts)return value(namedCounts[variable],['Cantidad '+variable+': '+(namedCounts[variable]??'desconocida')]);
  if(variable in BOSS_FLAGS)return value(flag(BOSS_FLAGS[variable]),['Victoria de jefe pendiente: '+variable.replace('canBeat','')]);
  if(['dash','wallClimb','airImpulse'].includes(variable))return value(true);
  if(['boots','doubleJump','canAirStall','canDawnJump','canDiveLaser','canEnemyBounce','canEnemyUpslash','upwarpSkipsAllowed','mourningSkipAllowed','enemySkipsAllowed','obscureSkipsAllowed','preciseSkipsAllowed'].includes(variable))return value(false,['Técnica de mod/glitch excluida']);
  if(/^canCrossGap/.test(variable)){const normal=['canCrossGap1','canCrossGap2'].includes(variable);return value(normal&&has('RB203'),[normal?'Rueda del Joven Alba':'Técnica avanzada excluida en recorrido normal']);}
  if(variable==='chargeBeam'||variable==='rangedAttack'){const n=skill(variable==='chargeBeam'?'CHARGED':'RANGED');return value(n===null?null:n>=(variable==='chargeBeam'?3:1),['Habilidad '+(variable==='chargeBeam'?'carga nivel 3':'ataque a distancia')]);}
  if(variable==='canBreakHoles'){const known=skills!==undefined;return value([...own].some(id=>/^PR/.test(id))||known&&(skill('CHARGED')>0||skill('VERTICAL')>0||skill('LUNGE')>=3)?true:known?false:null,['Ataque cargado, caída o rezo']);}
  if(variable==='pillar')return evaluateCondition(parseCondition('debla || taranto || ruby'),resolve);
  if(variable==='aubade'||variable==='tirana'){const id=variable==='aubade'?'PR101':'PR203',fervour=getNumber(c.ID_STATS?.permanetBonus?.Fervour);return value(has(id)?fervour===null?null:60+fervour+10*namedCounts.blueWax>=(variable==='aubade'?100:90):false,[name(id)+' y fervor suficiente'],[id]);}
  if(variable==='eggOffered')return value(flag('ALTASGRACIAS_EGG_OFFERED'),['Colocar el huevo en el árbol']);
  if(variable==='altasEggBroken')return value(flag('ALTASGRACIAS_EGG_BROKEN'),['Entregar las tres ofrendas']);
  if(variable==='redentoFinal')return value(flag('REDENTO_LOCATION_5')===true||flag('REDENTO_STATUE_DISCOVERED')===true?true:flag('REDENTO_LOCATION_5'),['Completar los cinco pasos de Redento']);
  if(variable==='miriamCompleted')return value([1,2,3,4,5].every(n=>flag('MIRIAM_CHALLENGE_'+n)===true)?true:[1,2,3,4,5].some(n=>flag('MIRIAM_CHALLENGE_'+n)===false)?false:null,['Completar cinco desafíos de Miriam']);
  if(variable==='crisantaLiberated')return value(flag('CRISANTA_LIBERATED'),['Liberar a Crisanta con el corazón verdadero equipado']);
  if(variable==='esdrasAlive')return value(flag('D08Z01S01_BOSSDEAD')===null?null:!flag('D08Z01S01_BOSSDEAD'),['Escapulario antes de derrotar a Esdras: oportunidad perdida en esta vuelta']);
  if(variable==='esdrasSpared')return value(!has('QI203')||flag('D08Z01S01_BOSSDEAD')===true?false:flag('PONTIFF_BRIDGE_EVENT')===true&&flag('D08Z01S01_BOSSDEAD')===false?true:null,['Evitar el combate de Esdras con el escapulario y hablar con él en el puente']);
  if(variable==='chalice')return value(has('QI77')||flag('D01Z05S23_CHALICEPUZZLE')===true,['Llenar el cáliz sin morir ni teletransportarse']);
  // These counts in the mod describe reachable rooms, not completed vanilla tasks.
  if(['redentoRooms','miriamRooms','amanecidaRooms','guiltRooms','chaliceRooms'].includes(variable))return value(null,['Progreso de misión '+variable+' requiere comprobación']);
  if(variable==='swordRooms')return value(getNumber(c.ID_STATS?.permanetBonus?.MeaCulpa),['Altares de Mea Culpa']);
  if(variable==='openedWOTWCave')return value(flag('GEMINO_ENTRANCE_OPEN'),['Abrir la cueva de Gémino o ruta alternativa']);
  if(model.eventExpressions[variable]&&!resolving.has(variable)){resolving.add(variable);const r=evaluateCondition(parseCondition(model.eventExpressions[variable]),resolve);resolving.delete(variable);return r;}
  return value(null,['Condición pendiente de verificar: '+variable]);
 }
 const byRoom=new Map();for(const d of model.doors){const room=d.id.split('[')[0];if(!byRoom.has(room))byRoom.set(room,[]);byRoom.get(room).push(d);}
 function gate(door){
  const room=door.id.split('[')[0];
  if(room==='D08Z01S01'&&flag('PONTIFF_BRIDGE_EVENT')===true)return value(true);
  // Vanilla Diosdado door needs the actual reveal quest; randomizer auto-enables this room.
  if(door.id==='D05Z01S03[Frontal]'&&flag('SERENO_DOOR_REVEALED')!==true&&flag('SERENO_DLC2QUEST_FINISHED')!==true)return value(flag('SERENO_DOOR_REVEALED'),['Resolver la misión del ruido de Diosdado y entregar la llave de madera']);
  let r=evaluateCondition(parseCondition(door.logic??''),resolve);
  const vf=String(door.visibilityFlags??'');
  const known=reached.has(door.id),required=door.requiredDoors?.some(p=>reached.has(p));
  if(vf&&((vf.includes('ThisDoor')&&!known)||(vf.includes('RequiredDoors')&&!required))&&r.value===true){r=value(false,['Puerta direccional / mecanismo previo '+door.id]);}
  if(!analysis.ngplus&&/^D(?:08Z0[23]|1[018])/.test(room)&&/bell|amanecida|canBeatHall/.test(door.logic??''))r=value(false,['Contenido de Nueva Partida+']);
  return r;
 }
 const reachRooms=()=>new Set([...reached].map(p=>p.split('[')[0]));
 for(let pass=0;pass<150;pass++){
  let changed=false;
  for(const room of reachRooms())for(const door of byRoom.get(room)??[])if(gate(door).value===true){
   for(const p of [door.id,door.originalDoor])if(p&&!reached.has(p)){reached.add(p);changed=true;}
  }
  if(!changed)break;
 }
 const reachableRooms=reachRooms();
 return {has,name,resolve,gate,reached,reachableRooms,seed,flags,flag,money,donations,worn,own,equipmentOnly,byRoom};
}
export function analyzeAccess(data,analysis,model,options={}){
 const ctx=accessContext(data,analysis,model,options),out=new Map();
 for(const row of analysis.rows){
  const loc=model.items[row.id]??{}, room=loc.room||row.room;
  let condition=loc.logic??'',local=evaluateCondition(parseCondition(condition),ctx.resolve),notes=[];
  if(model.prices[row.id]){const price=model.prices[row.id];notes.push('Compra: '+price.toLocaleString('es-ES')+' lágrimas');if(ctx.money===null)local={...local,value:local.value===false?false:null,reasons:[...local.reasons,'Dinero actual desconocido']};else if(ctx.money<price)local={...local,value:false,reasons:[...local.reasons,'Faltan '+Math.ceil(price-ctx.money)+' lágrimas para comprarlo']};}
  if(['RB104','RB105'].includes(row.id)){const goal=row.id==='RB104'?5000:50000,missing=ctx.donations===null?null:Math.max(0,goal-ctx.donations);condition='';local={value:missing===null?null:missing===0||ctx.money!==null&&ctx.money>=missing,reasons:missing===null?['Donaciones acumuladas desconocidas']:['Donar '+missing.toLocaleString('es-ES')+' lágrimas adicionales en Albero'],uses:[]};notes.push('Donaciones acumuladas: '+(ctx.donations??'desconocidas'));}
  if(row.id==='PR15'){
   if(ctx.flags.D05Z01S15_THREEBOOKSPUZZLE!==true&&data.commonElements.ID_INVENTORY.wearSwords?.includes('HE201'))local={value:false,reasons:['El corazón verdadero equipado no se puede retirar en esta vuelta'],uses:[]};
   else local={value:true,reasons:[],uses:[]};notes.push('Puzzle: fervor lleno, quitar todos los equipos y esperar 10 segundos.');
  }
  if(loc.questUncertain||loc.variablePosition){local={...local,value:local.value===false&&loc.questUncertain?null:local.value===false?false:null};notes.push(loc.variablePosition?'Esta mejora se recoge en una de las velas restantes de su color; ubicación variable.':'La recompensa o su ubicación depende de la misión. Consulta la guía y sus alternativas.');}
  if(['RB34','RB35','RB36','HE10'].includes(row.id))notes.push('Completar las arenas de los confesores; alcanzar la sala no prueba la victoria.');
  let state=local.value===false?'blocked':local.value===null?'unknown':ctx.reachableRooms.has(room)?'available':'unknown';
  if(!ctx.reachableRooms.has(room)&&local.value!==false)notes.push('La ruta hasta esta sala no está confirmada con tus puertas, llaves y victorias actuales.');
  if(row.status==='obtained')state='obtained';if(row.status==='later')state='later';
  const equip=local.uses.filter(id=>/^RE/.test(id)&&ctx.has(id)&&!ctx.worn.has(id));
  if(equip.length)notes.push('Equipar para esta ruta: '+equip.map(ctx.name).join(', '));
  if(local.value===true&&['relics','quest','upgrades'].includes(row.group)&&state==='available')notes.push('Puedes llegar y cumplir los requisitos detectados; puede quedar un diálogo, entrega o puzzle.');
  const reasons=state==='obtained'||state==='later'?[]:[...local.reasons,...notes];
  out.set(row.id,{state,reasons,uses:local.uses,equip,room,condition,routeKnown:ctx.reachableRooms.has(room)});
 }
 const barriers=model.doors.filter(d=>conditionVariables(parseCondition(d.logic??'')).some(v=>RELIC_VARIABLES[v])).map(d=>({id:d.id,room:d.id.split('[')[0],target:d.originalDoor?.split('[')[0],direction:d.direction,logic:d.logic,relics:[...new Set(conditionVariables(parseCondition(d.logic)).map(v=>RELIC_VARIABLES[v]).filter(Boolean))],...ctx.gate(d),kind:'path'}));
 return {items:out,barriers,context:ctx};
}
