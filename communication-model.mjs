import {RELIC_VARIABLES,KEY_VARIABLES,parseCondition} from './access-model.mjs';

export const RELIC_HELP={
 RE10:{label:'Raíces',symbol:'♧',action:'Cruzar puentes de raíces y escalar las raíces de las paredes.',instruction:'Equipa Tres Lenguas Nudosas y acércate a las raíces para que crezcan.',obtain:'Haz eclosionar el Huevo de la Deformidad en el árbol de Perpetva y bendícelo en la fuente de Albero.'},
 RE05:{label:'Caída por abismo',symbol:'↓',action:'Dejarte caer por un abismo que normalmente te mata y llegar a la sala inferior.',instruction:'Equipa el Lienzo de Hilo de Oro antes de saltar. Funciona en los abismos con una conexión a otra sala; no convierte todas las caídas en seguras.',obtain:'Rescata al menos 20 querubines y habla con Jocinero en Lienzos Durmientes.'},
 RE01:{label:'Plataformas de sangre',symbol:'●',action:'Saltar sobre las plataformas que aparecen en los puntos rojos suspendidos.',instruction:'Equipa Sangre Perpetuada en Arena para que aparezcan las plataformas.',obtain:'Consigue la Llave del Hermano Mayor en la tienda de Candelaria de Sueños de Misericordia y abre su habitación en la Hermandad.'},
 RE03:{label:'Agua y barro',symbol:'≈',action:'Moverte y saltar en agua y barro sin quedar frenado.',instruction:'Equipa la Uña Arrancada del Barro para superar el tramo de agua o barro.',obtain:'Completa la peregrinación de Redento y equipa sus tres cuentas de piedra ante la estatua de Madre de Madres.'},
 RE07:{label:'Miasma venenoso',symbol:'☁',action:'Atravesar el gas venenoso sin recibir su daño.',instruction:'Equipa el Pulmón Plateado de Dolphos antes de entrar en el miasma.',obtain:'Se encuentra en la parte alta de Asciende el Quejido.'},
 RE04:{label:'Pistas de cadáveres',symbol:'✝',action:'Escuchar las pistas de los cadáveres para secretos y acertijos.',instruction:'Equipa el Sudario de los Pecados Soñados para escuchar al cadáver. Escucharlo no equivale a resolver su acertijo.',obtain:'Lleva el Paño de Lino a la fuente de Albero para bendecirlo.'},
 RE02:{label:'Aviso de secretos',symbol:'♪',action:'Oír una campanilla cerca de los secretos.',instruction:'La Mano Incorrupta avisa de secretos; no es una llave necesaria para romper paredes.',obtain:'Lleva la Mano Cortada a la fuente de Albero para bendecirla.'}
};
const BOSS_NAMES={Brotherhood:'Guardián del Lamento Mudo',Mercy:'Ten Piedad',Convent:'Nuestra Señora de la Faz Denegrida',Grievance:'Tres Angustias',Bridge:'Esdras',Mothers:'Melquíades',Canvases:'Expósito',Prison:'Quirce',Rooftops:'Crisanta',Ossuary:'Isidora',Mourning:'Sierpes',Graveyard:'la Amanecida del Cementerio',Jondo:'la Amanecida de Jondo',Patio:'la Amanecida del Patio',Wall:'la Amanecida de la Muralla',Hall:'Laudes',Perpetua:'Perpetva',Legionary:'el legionario'};
const COUNT_NAMES={cherubs:'querubines rescatados',bones:'huesos obtenidos',holyWounds:'santas llagas',masks:'máscaras del ascensor',ceremonyItems:'ofrendas de Altasgracias',tentudiaRemains:'restos de Tentudía',marksOfRefuge:'marcas del refugio',traitorEyes:'ojos del Traidor',herbs:'hierbas de Tirso',verses:'versos de las Amanecidas',limestones:'cuentas de piedra de Redento',redWax:'nivel de la cera roja',blueWax:'nivel de la cera azul',tears:'lágrimas',knots:'ranuras de rosario'};
const ACTION_NAMES={dash:'Deslizarte',wallClimb:'Escalar paredes',chargeBeam:'Usar el ataque cargado de nivel 3',rangedAttack:'Usar Sangre Fervorosa, el ataque a distancia',canBreakHoles:'Romper el suelo con un ataque cargado, una caída o un rezo',pillar:'Usar un rezo que alcance hacia arriba o el Rubí',eggOffered:'Colocar el huevo en el árbol de Perpetva',altasEggBroken:'Entregar las tres ofrendas a Altasgracias',redentoFinal:'Completar la peregrinación de Redento',miriamCompleted:'Completar los cinco desafíos de Miriam',crisantaLiberated:'Liberar a Crisanta con el corazón verdadero equipado',esdrasAlive:'Recoger el escapulario antes de derrotar a Esdras',esdrasSpared:'Evitar el combate de Esdras con el escapulario y hablar con él en el puente',chalice:'Llenar el cáliz sin morir ni teletransportarte',openedWOTWCave:'Abrir la entrada a la tumba de Gémino',openedDCGateW:'Abrir la reja occidental de Aljibe Profanado',openedDCGateE:'Abrir la reja oriental de Aljibe Profanado',openedDCLadder:'Desplegar la escalera de Aljibe Profanado',rodeGotPElevator:'Usar el ascensor del Cementerio de las Cumbres',openedConventLadder:'Desplegar la escalera del Convento',brokeJondoBellW:'Romper el soporte de la campana occidental de Jondo',brokeJondoBellE:'Romper el soporte de la campana oriental de Jondo',openedMoMLadder:'Desplegar la escalera de Madre de Madres',openedTSCGate:'Abrir la reja de Lienzos Durmientes',openedARLadder:'Desplegar la escalera de Altos de la Archicatedral',brokeBotTCStatue:'Romper la estatua del Puente de los Tres Calvarios',openedWotHPGate:'Abrir la reja de la Muralla de las Santas Prohibiciones',openedBotSSLadder:'Desplegar la escalera de la Hermandad del Lamento Mudo',redentoRooms:'Comprobar el progreso de la peregrinación de Redento',miriamRooms:'Comprobar los desafíos completados de Miriam',amanecidaRooms:'Comprobar las Amanecidas vencidas',guiltRooms:'Completar las arenas de los confesores',chaliceRooms:'Matar los tres enemigos del cáliz en el mismo recorrido',swordRooms:'Mejorar Mea Culpa en sus altares',aubade:'Usar Alborada con fervor suficiente',tirana:'Usar Tirana con fervor suficiente'};
const EXCLUDED=new Set(['boots','doubleJump','canAirStall','canDawnJump','canDiveLaser','canEnemyBounce','canEnemyUpslash','upwarpSkipsAllowed','mourningSkipAllowed','enemySkipsAllowed','obscureSkipsAllowed','preciseSkipsAllowed',...Array.from({length:9},(_,i)=>'canCrossGap'+(i+3))]);

export function createCommunication(catalog,model){
 const rows=new Map(catalog.map(r=>[r.id,r])),zones=new Map(catalog.filter(r=>r.room&&!['Zona no catalogada','Consultar guía del objeto'].includes(r.area)).map(r=>[r.room.replace(/S\d+$/,''),r.area]));
 const areaForRoom=room=>zones.get((room??'').replace(/S\d+$/,''))??'Cvstodia';
 const name=id=>rows.get(id)?.name??'objeto de misión';
 function approach(ref){
  const room=ref.split('[')[0],tag=ref.match(/\[([^\]]*)\]/)?.[1]??'',area=areaForRoom(room),d=model.doors.find(d=>d.id===ref);
  if(d?.direction===6)return 'Bajar por el abismo de '+area+' con el Lienzo de Hilo de Oro';
  const side={W:'izquierda',E:'derecha',N:'superior',S:'inferior',NW:'superior izquierda',NE:'superior derecha',SW:'inferior izquierda',SE:'inferior derecha',Cherubs:'inferior',church:'de la iglesia',Sword:'del altar de Mea Culpa',Redento:'de la estatua de Redento'}[tag];
  return side?'Llegar por la entrada '+side+' de '+area:'Abrir el camino desde la otra entrada de '+area;
 }
 function variableLabel(v){
  if(RELIC_VARIABLES[v])return name(RELIC_VARIABLES[v]);if(KEY_VARIABLES[v])return name(KEY_VARIABLES[v]);
  if(v.includes('['))return approach(v);if(COUNT_NAMES[v])return COUNT_NAMES[v];
  if(/^canBeat/.test(v))return 'Vencer a '+(BOSS_NAMES[v.replace(/^canBeat/,'').replace(/Boss$/,'')]??'ese jefe');
  if(['canCrossGap1','canCrossGap2'].includes(v))return 'Ampliar el salto con la Rueda del Joven Alba';
  return ACTION_NAMES[v]??'Comprobar el estado de esta misión en el juego';
 }
 function friendlyReason(reason){
  let s=String(reason??'');
  s=s.replace(/(?:Paso previo|Puerta direccional \/ mecanismo previo|Paso)\s+(D\d+[A-Z0-9]*\[[^\]]*\])/g,(_,ref)=>approach(ref));
  s=s.replace(/D\d+[A-Z0-9]*\[[^\]]*\]/g,approach);
  s=s.replace(/Victoria de jefe pendiente:\s*(\w+)/g,(_,v)=>'Derrota pendiente: '+(BOSS_NAMES[v.replace(/Boss$/,'')]??'jefe de esta zona'));
  s=s.replace(/Cantidad (\w+):\s*([^/]+)/g,(_,v,n)=>(COUNT_NAMES[v]??'Progreso de misión')+': '+n.trim());
  s=s.replace(/Condición pendiente de verificar:\s*(\w+)/g,(_,v)=>'No se puede confirmar: '+variableLabel(v));
  s=s.replace(/Progreso de misión (\w+) requiere comprobación/g,(_,v)=>variableLabel(v)+'. Alcanzar la sala no demuestra que hayas terminado la misión.');
  s=s.replace(/Técnica (?:de mod\/glitch|avanzada) excluida(?: en recorrido normal)?/g,'');
  s=s.replace(/\s*\/\s*$/,'').replace(/Alternativas:\s*\//,'Alternativas: ');
  return s.trim();
 }
 function options(tree,ctx){
  if(tree.type==='literal')return tree.value?[[]]:[];
  if(tree.type==='variable'){
   if(EXCLUDED.has(tree.name))return [];
   if(['dash','wallClimb','airImpulse'].includes(tree.name))return [[]];
   const atom={variable:tree.name,label:variableLabel(tree.name),relic:RELIC_VARIABLES[tree.name]??null,satisfied:ctx.resolve(tree.name).value};
   if(tree.name.includes('[')){
    const fall=model.doors.find(d=>d.originalDoor===tree.name&&d.direction===6&&d.logic==='linen');
    if(fall)return [[{variable:'linen',label:name('RE05'),relic:'RE05',satisfied:ctx.resolve('linen').value},atom]];
   }
   return [[atom]];
  }
  if(tree.type==='or')return [...options(tree.left,ctx),...options(tree.right,ctx)].slice(0,40);
  if(tree.type==='and'){const a=options(tree.left,ctx),b=options(tree.right,ctx);return a.flatMap(x=>b.map(y=>[...x,...y])).slice(0,40);}
  if(tree.type==='not')return [[{label:'No haber completado aún: '+variableLabel(tree.child.name),satisfied:null}]];
  const left=tree.left,right=tree.right;if(left?.type==='variable'&&right?.type==='literal'){
   const n=ctx.resolve(left.name).value,comparisons={'>=':()=>n>=right.value,'<=':()=>n<=right.value,'>':()=>n>right.value,'<':()=>n<right.value,'==':()=>n===right.value,'!=':()=>n!==right.value},labels={'>=':'mínimo','<=':'máximo','>':'más de','<':'menos de','==':'exactamente','!=':'distinto de'};
   return [[{variable:left.name,label:variableLabel(left.name)+': '+labels[tree.type]+' '+right.value,satisfied:n===null?null:comparisons[tree.type]()}]];
  }
  return [[{label:'Comprobar el acertijo en el juego',satisfied:null}]];
 }
 function conditionRoutes(condition,ctx){
  const alternatives=options(parseCondition(condition??''),ctx).map(list=>[...new Map(list.map(a=>[a.relic??a.variable??a.label,a])).values()]);
  const seen=new Set();return alternatives.filter(list=>{const key=list.map(a=>a.label).sort().join('|');if(seen.has(key))return false;seen.add(key);return true;});
 }
 function relicRequirements(condition,ctx){
  const routes=conditionRoutes(condition,ctx),ids=[...new Set(routes.flat().map(a=>a.relic).filter(Boolean))];
  return ids.map(id=>({id,name:name(id),...RELIC_HELP[id],owned:ctx.has(id),equipped:ctx.worn.has(id),optional:routes.some(route=>!route.some(a=>a.relic===id)),status:!ctx.has(id)?'Te falta':ctx.worn.has(id)?'Equipada':'La tienes; equípala para esta ruta'}));
 }
 function pathPresentation(gate,ctx){
  const requirements=relicRequirements(gate.logic??'',ctx),ids=requirements.map(r=>r.id);
  const fall=gate.direction===6&&ids.includes('RE05'),primary=fall?'RE05':ids.includes('RE10')?'RE10':ids[0];
  const title=fall?'Caída por abismo':primary?RELIC_HELP[primary].label:'Camino de exploración';
  const source=areaForRoom(gate.room),target=areaForRoom(gate.target),place=source===target?source:source+' → '+target;
  const missing=requirements.filter(r=>!r.owned),unequipped=requirements.filter(r=>r.owned&&!r.equipped);
  const routes=conditionRoutes(gate.logic??'',ctx),hasSatisfiedRoute=routes.some(route=>route.every(a=>a.satisfied===true));
  const mandatoryMissing=missing.filter(r=>!r.optional);
  const status=gate.value===true?(unequipped.length&&!ctx.equipmentOnly?'Puedes cruzar si equipas las reliquias de la ruta':missing.length?'Hay una alternativa de acceso disponible':'Puedes cruzar con tu equipo'):mandatoryMissing.length?'Te falta: '+mandatoryMissing.map(r=>r.name).join(' + '):missing.length&&!hasSatisfiedRoute?'Elige una ruta y consigue su reliquia':ctx.equipmentOnly&&unequipped.length?'Equipa: '+unequipped.map(r=>r.name).join(' / '):'Comprueba la entrada o el mecanismo';
  return {title,place,primary,fall,requirements,missing,status,routes:conditionRoutes(gate.logic??'',ctx)};
 }
 function itemPresentation(row,access,ctx){
  const requirements=relicRequirements(access.condition,ctx),reasons=[...new Set(access.reasons.map(friendlyReason).filter(r=>r&&!/^Alternativas:\s*$/.test(r)))];
  let next='';
  if(row.id==='RE10'&&!ctx.has('RE10'))next=ctx.has('QI14')?'Lleva el huevo eclosionado a la fuente de Albero y bendícelo.':ctx.has('QI13')?'Deja el huevo en el árbol de Perpetva, sal de la sala y vuelve para recogerlo eclosionado. Después llévalo a la fuente de Albero.':'Completa las ofrendas de Altasgracias para iniciar la misión de las raíces.';
  if(row.id==='RE05'&&!ctx.has('RE05')){const n=ctx.resolve('cherubs').value;next=n===null?'Rescata 20 querubines y habla con Jocinero en Lienzos Durmientes.':n<20?'Tienes '+n+' de 20 querubines. Rescata '+(20-n)+' más y habla con Jocinero en Lienzos Durmientes.':'Ya cumples los 20 querubines. Habla con Jocinero en Lienzos Durmientes para recibir la reliquia.';}
  if(row.id==='QI45'||row.id==='PR16')next='Dos rutas: cruza el agua y barro de Aljibe Profanado con la Uña Arrancada del Barro, o déjate caer desde Yermo de las Iglesias Enterradas con el Lienzo de Hilo de Oro equipado.';
  const titles={available:'Puedes llegar con los requisitos detectados',blocked:'Te falta cumplir un requisito',unknown:'No se puede confirmar el acceso',obtained:'Objeto obtenido',later:'Disponible en Nueva Partida+',lost:'Ya no se puede conseguir en esta partida'};
  const note=row.status==='unknown'?'El guardado no confirma si ya recogiste, entregaste o transformaste este objeto. El acceso y la posesión se comprueban por separado.':access.state==='unknown'?'El guardado no demuestra esta ruta o el progreso de su misión. No se afirma que falte una reliquia.':access.state==='available'?'Esto confirma la ruta y el equipo detectados; aún puede quedar recogerlo, hablar o resolver el acertijo.':'';
  return {title:titles[access.state],requirements,reasons,next,note,routes:conditionRoutes(access.condition,ctx)};
 }
 return {areaForRoom,name,approach,variableLabel,friendlyReason,conditionRoutes,relicRequirements,pathPresentation,itemPresentation};
}
