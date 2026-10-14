// Contenido que ya no se puede conseguir en esta partida (por jefes derrotados o PNJ que se han ido).
// Solo se declara algo perdido cuando un evento del guardado lo demuestra; si falta la prueba, no se afirma.
// Cada regla cita la fuente: las banderas son las del propio juego y los textos, el wiki de la comunidad.

// Qué desbloquea la puerta secreta de Diosdado en la Biblioteca (comprobado contra el grafo de salas:
// al abrirla solo pasan a ser alcanzables D05BZ01S01, D05Z01S22 y D04Z03S02).
export const ESDRAS_DOOR_ITEMS=['QI204','HE201','RB301'];

export function analyzeLost(data,analysis){
 const flags=data.commonElements?.ID_EVENT_MANAGER?.flags??{};
 const flagOf=key=>typeof flags[key]==='boolean'?flags[key]:null;
 const rows=new Map(analysis.rows.map(r=>[r.id,r]));
 const owned=id=>rows.get(id)?.status==='obtained';
 const items=new Map(),quests=new Map();
 const loseItem=(id,reason,source)=>{if(rows.has(id)&&!owned(id)&&!items.has(id))items.set(id,{reason,source});};
 const loseQuest=(id,reason)=>{if(!quests.has(id))quests.set(id,{reason});};

 // Esdras: el combate solo se evita con el Escapulario Incompleto; entonces se retira a la Hermandad y entrega la llave.
 const esdrasDefeated=flagOf('D08Z01S01_BOSSDEAD')===true;
 const keyPath=owned('QI204')||flagOf('SERENO_DOOR_REVEALED')===true||flagOf('ESDRAS_KEY_REWARD')===true;
 if(esdrasDefeated&&!keyPath){
  const why='Derrotaste a Esdras en el Puente de los Tres Calvarios. La llave solo se consigue perdonándole con el Escapulario Incompleto antes del combate.';
  const source='Wiki: Esdras, of the Anointed Legion (NPC) · bandera D08Z01S01_BOSSDEAD';
  loseItem('QI204',why,source);
  loseItem('HE201',why+' Sin la llave no se abre la puerta de Diosdado, donde espera el Traidor con el corazón.',source);
  loseItem('RB301',why+' Está en la sala secreta que abre esa puerta.',source);
  if(flagOf('CRISANTA_LIBERATED')!==true)loseItem('QI301',why+' Sin el Corazón Apodíctico no se puede liberar a Crisanta.',source);
  loseQuest('diosdado',why+' Ya has resuelto el ruido y recibido la rueda; la llave y la puerta oculta no se pueden conseguir.');
  loseQuest('eventide',why);
 }

 // Tirso: si mueren demasiados besadores se marcha de Cvstodia; sin él no hay entregas ni recompensa final.
 const tirsoGone=flagOf('TIRSO_TIRSO_DEAD')===true&&flagOf('TIRSO_LASTREWARD_DONE')!==true;
 if(tirsoGone){
  const why='La partida registra que Tirso ya no está en Albero (según el wiki, se marcha si mueren demasiados besadores de llagas). No se pueden entregar más hierbas ni cobrar la recompensa final.';
  loseItem('QI56',why,'Wiki Fandom: Tirso · bandera TIRSO_TIRSO_DEAD');
  loseQuest('tirso',why);
 }
 return {items,quests};
}
