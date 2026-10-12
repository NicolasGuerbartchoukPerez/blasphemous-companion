// Exact actor identity matters: two collectibles in the same room are independent.
export function pickupEvidence(data,id,verification){
 const actors=verification?.actors?.filter(a=>a.id===id)??[];
 const scenes=new Map(Object.entries(data.sceneElements??{}).map(([room,objects])=>[room.toUpperCase(),objects]));
 const results=actors.map(actor=>({actor,value:scenes.get(actor.room)?.[actor.guid]?.[actor.field]}));
 const positive=results.find(r=>r.value===true);
 if(positive)return {value:true,kind:'pickup',text:'El registro de la sala confirma que recogiste este objeto.',room:positive.actor.room};
 if(results.length&&results.every(r=>r.value===false))return {value:false,kind:'pickup',text:'El registro de sus puntos de recogida confirma que aún sigue sin recoger.'};
 return null;
}
export function additionalEvidence(data,id,verification){
 const inv=data.commonElements.ID_INVENTORY, flags=data.commonElements.ID_EVENT_MANAGER?.flags??{};
 const own=new Set(Object.entries(inv).filter(([k,v])=>/^(own|wear)/.test(k)&&Array.isArray(v)).flatMap(([,v])=>v));
 const ngplus=data.commonElements.ID_PERSISTENT_MANAGER?.IsNewGamePlus===true;
 const transformed={QI13:ngplus?['QI14']:['QI14','RE10'],QI14:ngplus?[]:['RE10'],QI66:ngplus?[]:['RE04'],QI67:ngplus?[]:['RE02'],QI59:['QI57'],QI75:['QI76','QI77']};
 if(transformed[id]?.some(next=>own.has(next)))return {value:true,kind:'transformed',text:'Ya obtuviste su forma posterior: este objeto fue adquirido y transformado.'};
 if(['QI59','QI57'].includes(id)&&flags.GEMINO_QI57_OWNED===true)return {value:true,kind:'transformed',text:'El evento de Gémino confirma que ya llenaste el dedal.'};
 if(['QI10','QI11','QI12'].includes(id)&&(ngplus?['QI13','QI14']:['QI13','QI14','RE10']).some(next=>own.has(next)))return {value:true,kind:'delivered',text:'La recompensa de Altasgracias confirma que entregaste las tres ofrendas.'};
 if(id==='QI75'&&flags.D01Z05S23_CHALICEPUZZLE===true)return {value:true,kind:'delivered',text:'El altar del cáliz está abierto: completaste y entregaste el cáliz.'};
 if(id==='QI56'&&typeof flags.TIRSO_LASTREWARD_DONE==='boolean')return {value:flags.TIRSO_LASTREWARD_DONE,kind:'reward',text:flags.TIRSO_LASTREWARD_DONE?'Tirso ya entregó la recompensa final.':'El evento confirma que Tirso aún no ha entregado esta recompensa.'};
 if(!ngplus&&id==='QI201'&&flags.D01BZ08S01_BOSSDEAD===false&&!own.has(id))return {value:false,kind:'boss',text:'Isidora aún no ha sido derrotada: no se ha obtenido su ojo.'};
 if(!ngplus&&id==='QI202'&&flags.D20Z02S08_BOSSDEAD===false&&!own.has(id))return {value:false,kind:'boss',text:'Sierpes aún no ha sido derrotado: no se ha obtenido su ojo.'};
 if(['QI60','QI61','QI62'].includes(id)&&flags.ELEVATOR_FULL_UNLOCKED===true)return {value:true,kind:'delivered',text:'El ascensor completamente desbloqueado confirma la entrega de las tres máscaras.'};
 if(['QI201','QI202'].includes(id)&&(!ngplus&&own.has('HE201')||flags.ABNEGATION_EYES_RETRIEVED===true))return {value:true,kind:'delivered',text:'La entrega de ambos ojos al Traidor está confirmada.'};
 if(id==='QI204'&&flags.SERENO_DOOR_REVEALED===true)return {value:true,kind:'delivered',text:'Diosdado completó la apertura de la puerta oculta con esta llave.'};
 if(id==='QI68'&&(own.has('PR04')||flags.GEMINO_OFFERING_DONE===true))return {value:true,kind:'delivered',text:'La ofrenda del sepulcro o su recompensa confirma que obtuviste y usaste las flores.'};
 const delivery={};
 if(['QI02','QI03','QI04'].includes(id)&&flags.SOCORRO_STATE_GONE===true&&flags.SOCORRO_STATE_KILLED===false)return {value:true,kind:'delivered',text:'Socorro fue liberada mediante las tres marcas: ya las entregaste.'};
 const marks=['QI02','QI03','QI04'];
 if(!ngplus&&marks.includes(id)&&!own.has(id)&&flags.SOCORRO_STATE_GONE===false&&flags.SOCORRO_STATE_KILLED===false){
  const offered=flags.SOCORRO_SECOND_OFFERING===true?2:flags.SOCORRO_FIRST_OFFERING===true&&flags.SOCORRO_SECOND_OFFERING===false?1:0;
  if(offered>0&&marks.filter(mark=>own.has(mark)).length===3-offered)return {value:true,kind:'delivered',text:'Las ofrendas registradas y las marcas restantes en tu inventario identifican esta marca como ya entregada a Socorro.'};
 }
 if(['QI06','QI07','QI08'].includes(id)&&flags.LVDOVICO_QUEST_DONE===true)return {value:true,kind:'delivered',text:'La misión de Lvdovico confirma la entrega de los tres restos de Tentudía.'};
 if(delivery[id]&&flags[delivery[id]]===true)return {value:true,kind:'delivered',text:'Un evento de la misión confirma que ya lo entregaste.'};
 return pickupEvidence(data,id,verification);
}
export const STATE_INVENTORY_FIELDS=['ownRellics','ownBeads','ownQuestItems','ownPrayers','ownCollectibleItems','ownSwords'];
export function validateLiveState(payload,save,fileName,now=Date.now()){
 if(payload?.protocol!==1||payload.kind!=='blasphemous-state'||payload.state!=='playing')throw Error('Progreso en directo no disponible. Se conserva el guardado.');
 const date=Date.parse(payload.updatedAt);if(!Number.isFinite(date)||now-date>4000||date-now>2000)throw Error('La lectura del juego está desactualizada. Se conserva el guardado.');
 const slot=fileName.match(/^savegame_([012])(?:\.save|\.save_backup)$/i);
 if(!slot||Number(slot[1])!==payload.slot)throw Error('Carga el archivo savegame_'+payload.slot+'.save de la partida activa para conectar su progreso.');
 const anchor=payload.anchor,common=save.commonElements,p=common.ID_PERSISTENT_MANAGER;
 if(!anchor||!Number.isFinite(anchor.Time)||!Number.isFinite(p?.Time)||Math.abs(p.Time-anchor.Time)>.25||p.IsNewGamePlus!==anchor.IsNewGamePlus||common.ID_CHECKPOINT_MANAGER?.activePrieDieuScene!==anchor.checkpoint)throw Error('El guardado cargado no coincide con la partida activa. Guarda en un altar y vuelve a cargar su archivo.');
 const canonical=a=>JSON.stringify([...a].filter(Boolean).sort());
 for(const field of STATE_INVENTORY_FIELDS){
  const a=anchor.inventory?.[field],b=common.ID_INVENTORY[field],live=payload.inventory?.[field];
  if(!Array.isArray(a)||!Array.isArray(b)||canonical(a)!==canonical(b)||!Array.isArray(live)||live.length>512||live.some(id=>typeof id!=='string'||!/^(RE|QI|RB|PR|HE|CO)\d+$/.test(id)))throw Error('No se puede vincular este guardado al inventario de la partida activa. Guarda y vuelve a cargar.');
 }
 if(!payload.events?.flags||typeof payload.events.flags!=='object'||Array.isArray(payload.events.flags)||Object.keys(payload.events.flags).length>10000||Object.values(payload.events.flags).some(v=>typeof v!=='boolean'))throw Error('La lectura de eventos no es compatible.');
 for(const field of ['wearRellics','wearBeads','wearPrayers','wearSwords'])if(!Array.isArray(payload.inventory[field])||payload.inventory[field].length>16||payload.inventory[field].some(id=>typeof id!=='string'||id!==''&&!/^(RE|RB|PR|HE)\d+$/.test(id)))throw Error('El equipo leído no es compatible.');
 const data=structuredClone(save);data.commonElements.ID_INVENTORY={...common.ID_INVENTORY,...payload.inventory};
 data.commonElements.ID_EVENT_MANAGER={...common.ID_EVENT_MANAGER,...payload.events};
 return data;
}
