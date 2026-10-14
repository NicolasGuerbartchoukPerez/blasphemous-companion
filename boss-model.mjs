import {accessContext,BOSS_FLAGS,RELIC_VARIABLES,KEY_VARIABLES} from './access-model.mjs';

// Jefes: dónde están, si ya los has derrotado, si basta con llegar o hacen falta objetos concretos.
// - Las banderas de derrota son las del propio juego (las mismas que usa la lógica de rutas).
// - La ubicación en el mapa sale de las casillas reales de la sala de la arena, cuando existen en tu instalación.
// - «Qué hace falta para llegar» se calcula con las rutas y puertas (sin técnicas avanzadas); los textos de
//   cada jefe proceden del wiki de la comunidad y están marcados con su origen.

export const BOSS_FILTERS=[
 {id:'pending',label:'Pendientes'},
 {id:'reachable',label:'Puedo llegar ya'},
 {id:'requires',label:'Con requisitos'},
 {id:'defeated',label:'Derrotados'},
 {id:'all',label:'Todos'}
];
export const BOSS_STATE_LABEL={defeated:'Derrotado',pending:'Pendiente',unknown:'Sin confirmar'};

const WIKI='Wiki de la comunidad';
export const BOSSES=[
 {id:'warden',name:'Guardián del Lamento Mudo',englishName:'Warden of the Silent Sorrow',flag:'D17Z01_BOSSDEAD',room:null,area:'Hermandad del Lamento Mudo',
  notes:['Es el primer jefe: aparece al comenzar la partida.']},
 {id:'ten-piedad',name:'Ten Piedad',englishName:'Ten Piedad',flag:'D01Z06S01_BOSSDEAD',room:'D01Z06S01',
  notes:['Duerme en las manos de una estatua de la Dama; al despertar la rompe y empieza el combate.','Al derrotarlo recibes la Santa Llaga de la Atrición, una de las tres que abren la puerta del Puente de los Tres Calvarios.']},
 {id:'our-lady',name:'Nuestra Señora de la Faz Denegrida',englishName:'Our Lady of the Charred Visage',flag:'D02Z05S01_BOSSDEAD',room:'D02Z05S01',area:'Convento de la Faz Denegrida',
  notes:['Está cerca del final del Convento. Las Tres Humillaciones se pueden hacer en cualquier orden, pero el wiki recomienda dejarla la última por la misión de Gémino, que lleva a una zona secreta.']},
 {id:'tres-angustias',name:'Tres Angustias',englishName:'Tres Angustias',flag:'D03Z04S01_BOSSDEAD',room:'D03Z04S01',area:'Asciende el Quejido',
  fightRequirements:{ids:['RB13'],mode:'all',text:'Sin la Protección de Perpetva no se llega normalmente a la arena: sirve para defenderte de las lanzas.'},
  notes:['El wiki recomienda hacerlo el segundo por el Huevo de la Deformidad, que lleva a una reliquia importante.']},
 {id:'esdras',name:'Esdras',englishName:'Esdras, of the Anointed Legion',flag:'D08Z01S01_BOSSDEAD',room:'D08Z01S01',
  fightRequirements:{ids:['QI38','QI39','QI40'],mode:'all',text:'Aparece tras las Tres Humillaciones: necesitas las tres Santas Llagas.'},
  notes:['No es obligatorio pelear con él: con el Escapulario Incompleto se evita el combate y te da la llave de Diosdado. Si lo derrotas se pierde esa ruta (misiones de Diosdado y del final C).']},
 {id:'melquiades',name:'Melquíades, el Arzobispo Exhumado',englishName:'Melquíades, The Exhumed Archbishop',flag:'D04Z04S01_BOSSDEAD',room:'D04Z04S01',area:'Madre de Madres',
  notes:['Hay que derrotarlo para obtener la Máscara Deforme de Orestes, una de las tres necesarias para avanzar por los Altos de la Archicatedral. Las tres máscaras se pueden conseguir en cualquier orden.']},
 {id:'exposito',name:'Expósito',englishName:'Expósito, Scion of Abjuration',flag:'D05Z01S13_BOSSDEAD',room:'D05Z01S13',
  notes:['Entrega la Máscara Labrada de Crescente. El wiki lo sitúa en Lienzos Durmientes; la sala de la arena figura en los datos del juego como parte de la Biblioteca de las Palabras Negadas.']},
 {id:'quirce',name:'Quirce',englishName:'Quirce, Returned by The Flames',flag:'D09Z01S03_BOSSDEAD',room:'D09Z01S03',
  notes:['A diferencia de Melquíades y Expósito, no se puede afrontar el primero: hace falta al menos una máscara para llegar a la Muralla.','Al derrotarlo recibes la Llave de las Cumbres (para el ascensor de las Cumbres) y se abre el acceso a la Máscara Reflejada de Dolphos.']},
 {id:'crisanta',name:'Crisanta',englishName:'Crisanta of the Wrapped Agony',flag:'D06Z01S25_BOSSDEAD',room:'D06Z01S25',
  notes:['Con el Corazón Apodíctico de Mea Culpa equipado gana una tercera fase: es la ruta del final C, y la Herida Santa de la Abnegación se entrega después de derrotarla.']},
 {id:'escribar',name:'Su Santidad Escribar',englishName:'His Holiness Escribar',flag:'D07Z01S02_BOSSDEAD',room:'D07Z01S02',
  notes:['Es el jefe final. Después se sube la Montaña de Ceniza con Deogracias y, según lo que hayas preparado, llegas al final A o al B (ver la misión «Final A»).']},
 {id:'isidora',name:'Isidora, Voz de los Muertos',englishName:'Isidora, Voice of the Dead',flag:'D01BZ08S01_BOSSDEAD',room:'D01BZ08S01',area:'Osario (Albero y Aljibe Profanado)',dlc:true,
  notes:['Se encuentra en el Osario: se llega rompiendo el muro derecho de la planta baja del hospicio de los Besadores de Llagas, en Albero, o subiendo desde la sala de Nacimiento en Aljibe Profanado.','Según el wiki, el combate se activa entregando 30 huesos al Coleccionista, que está en el mismo Osario (Isidora surge de un incensario). El catálogo indica que su derrota da el Ojo Derecho Cercenado del Traidor (final C).']}
];

const unique=list=>[...new Set(list)];
// Objetos y eventos que la lógica de rutas puede exigir (los que la persona puede conseguir).
export const ROUTE_ITEMS=unique([...Object.values(RELIC_VARIABLES),...Object.values(KEY_VARIABLES),'QI38','QI39','QI40','QI60','QI61','QI62']);
export const ROUTE_FLAGS=unique(Object.values(BOSS_FLAGS).filter(f=>/_BOSSDEAD$/.test(f)));

const OWN_FIELD=id=>/^RE/.test(id)?'ownRellics':/^RB/.test(id)?'ownBeads':/^PR/.test(id)?'ownPrayers':/^HE/.test(id)?'ownSwords':/^CO/.test(id)?'ownCollectibleItems':'ownQuestItems';

function withItems(data,ids){
 const inv={...data.commonElements.ID_INVENTORY};
 for(const id of ids){const field=OWN_FIELD(id);inv[field]=[...(Array.isArray(inv[field])?inv[field]:[]),id];}
 return {...data,commonElements:{...data.commonElements,ID_INVENTORY:inv}};
}
function withFlags(data,keys){
 const events=data.commonElements.ID_EVENT_MANAGER??{};
 return {...data,commonElements:{...data.commonElements,ID_EVENT_MANAGER:{...events,flags:{...(events.flags??{}),...Object.fromEntries(keys.map(k=>[k,true]))}}}};
}

// Para cada sala pedida: ¿se llega con todo el equipo y los jefes previos? y, si es así, qué objetos o victorias son
// imprescindibles (sin ellos no hay ninguna ruta). Cuesta unas decenas de cálculos de rutas: se llama una sola vez por partida.
export function computeRouteNeeds({data,analysis,model,rooms,items=ROUTE_ITEMS,flags=ROUTE_FLAGS}){
 const owned=new Set(accessContext(data,analysis,model).own);
 const missingItems=items.filter(id=>!owned.has(id));
 const knownFlags=data.commonElements.ID_EVENT_MANAGER?.flags??{};
 const missingFlags=flags.filter(k=>knownFlags[k]!==true);
 const everything=withFlags(withItems(data,missingItems),missingFlags);
 const best=accessContext(everything,analysis,model).reachableRooms;
 const result=new Map(rooms.map(room=>[room,{possible:best.has(room),required:[]}]));
 const trial=(dropItem,dropFlag)=>accessContext(withFlags(withItems(data,missingItems.filter(i=>i!==dropItem)),missingFlags.filter(k=>k!==dropFlag)),analysis,model).reachableRooms;
 for(const id of missingItems){const reach=trial(id,null);for(const room of rooms){const r=result.get(room);if(r.possible&&!reach.has(room))r.required.push({type:'item',id});}}
 for(const key of missingFlags){const reach=trial(null,key);for(const room of rooms){const r=result.get(room);if(r.possible&&!reach.has(room))r.required.push({type:'boss',flag:key});}}
 return result;
}

const FLAG_TO_BOSS=new Map(BOSSES.map(b=>[b.flag,b]));

export function analyzeBosses({data,analysis,model,access,cells=[],areaForRoom=()=>'',needs=null}){
 const ctx=access.context,rows=new Map(analysis.rows.map(r=>[r.id,r]));
 const nameOf=id=>rows.get(id)?.name??id;
 const rooms=new Set(model.doors.map(d=>d.id.split('[')[0]));
 return BOSSES.map(boss=>{
  const value=ctx.flag(boss.flag),state=value===true?'defeated':value===false?'pending':'unknown';
  const mine=boss.room?cells.filter(c=>c.room===boss.room):[];
  const position=mine.length?{x:Math.round(mine.reduce((s,c)=>s+c.x,0)/mine.length),y:Math.round(mine.reduce((s,c)=>s+c.y,0)/mine.length)}:null;
  const areaGuess=boss.room?areaForRoom(boss.room):'';
  const area=boss.area??(areaGuess&&areaGuess!=='Cvstodia'?areaGuess:'');
  // Ruta: solo se puede calcular si la sala de la arena figura en el grafo de rutas.
  const inGraph=boss.room!==null&&rooms.has(boss.room);
  let route='unknown',required=[],routeNote='';
  const open=state!=='defeated';
  if(!open){route='done';}
  else if(inGraph){
   if(ctx.reachableRooms.has(boss.room))route='reachable';
   else{
    route='blocked';
    const need=needs?.get(boss.room);
    if(need){
     if(!need.possible)routeNote='Hace falta progreso de misión o historia que esta herramienta no puede detallar.';
     else{
      required=need.required.map(r=>r.type==='item'?{type:'item',id:r.id,name:nameOf(r.id)}:{type:'boss',flag:r.flag,name:'Derrotar a '+(FLAG_TO_BOSS.get(r.flag)?.name??r.flag)});
      if(!required.length)routeNote='Hay varias rutas posibles y ninguna pieza es imprescindible por sí sola: te falta alguna reliquia o llave. Consulta los requisitos de los objetos de la zona.';
     }
    }
   }
  }
  let fight=null;
  if(boss.fightRequirements){
   const f=boss.fightRequirements,items=f.ids.map(id=>({id,name:nameOf(id),owned:ctx.has(id)}));
   fight={text:f.text,items,met:f.mode==='all'?items.every(i=>i.owned):items.some(i=>i.owned)};
  }
  const unmet=open&&(route==='blocked'||fight&&!fight.met);
  const needsLabel=state==='defeated'?'':route==='unknown'&&!fight?'Ruta no calculable':unmet?'Requiere objetos o progreso':route==='reachable'?'Basta con llegar':fight?.met?'Basta con llegar':'Ruta no calculable';
  return {
   id:boss.id,name:boss.name,englishName:boss.englishName,dlc:Boolean(boss.dlc),
   flag:boss.flag,state,stateLabel:BOSS_STATE_LABEL[state],area,room:boss.room,position,
   cellKey:position?position.x+':'+position.y:null,
   route,required,routeNote,fight,needsLabel,
   canReachNow:open&&!unmet&&route==='reachable',
   hasRequirements:open&&Boolean(unmet),
   notes:boss.notes,source:WIKI
  };
 });
}

export function bossMatchesFilter(view,filter){
 switch(filter){
  case 'all':return true;
  case 'pending':return view.state!=='defeated';
  case 'defeated':return view.state==='defeated';
  case 'reachable':return view.canReachNow;
  case 'requires':return view.hasRequirements;
  default:return true;
 }
}
export const filterBosses=(views,filter)=>views.filter(v=>bossMatchesFilter(v,filter));
export const bossFilterCounts=views=>Object.fromEntries(BOSS_FILTERS.map(f=>[f.id,filterBosses(views,f.id).length]));
