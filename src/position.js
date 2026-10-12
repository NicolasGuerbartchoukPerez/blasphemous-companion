const LOCAL_RUNTIME=location.protocol==='http:'&&location.hostname==='127.0.0.1';
async function localRequest(path){const response=await fetch(path,{headers:{'X-Cvstodia-Local':'1'},signal:AbortSignal.timeout(4000),cache:'no-store'});if(!response.ok)throw Error('La aplicación local no responde ('+response.status+'). Vuelve a abrir DiarioDeCvstodia.exe.');return response.json();}
async function connectLocalPosition(){if(demoMode||!current)return;stopPosition(false);const token=positionGeneration;positionFeedback('Conectando con la aplicación local…','Comprobando el lector integrado.');try{const info=await localRequest('/local/info');if(token!==positionGeneration)return;if(info.app!=='cvstodia-portable'||info.protocol!==1)throw Error('Versión del lector local no compatible.');positionLocalConnection=true;$('position-disconnect').hidden=false;$('position-connect').disabled=true;await pollPosition(token);}catch(error){if(token===positionGeneration)positionFeedback('No se pudo conectar',error.message);}}
async function loadLocalArtwork(){if(!LOCAL_RUNTIME)return;try{const response=await fetch('/local/art',{headers:{'X-Cvstodia-Local':'1'},signal:AbortSignal.timeout(4000)});if(!response.ok)return;const art=await response.json(),valid=value=>typeof value==='string'&&value.length<2000000&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(value);if(art.protocol!==1||!Object.keys(art.tiles??{}).length)return;for(const group of ['tiles','icons'])for(const [key,value]of Object.entries(art[group]??{}))if(Object.hasOwn(GAME_MAP[group],key)&&valid(value))GAME_MAP[group][key]=value;if(current)renderMap();document.querySelector('[data-pref="art"]').parentElement.lastChild.textContent=' Fondo original importado del juego';}catch{/* El mapa propio sigue disponible si no se importan gráficos. */}}
let positionDirectory=null,positionLocalConnection=false,positionTimer=null,positionGeneration=0,livePosition=null;
const positionVisited=new Set();
function positionDeadline(promise,ms=4000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{const error=new Error('La lectura local no ha respondido. Comprueba el lector y vuelve a conectar su carpeta live.');error.name='TimeoutError';reject(error);},ms);})]).finally(()=>clearTimeout(timer));}
function positionError(error){if(error.name==='NotAllowedError')return 'Chrome no permite leer esta carpeta. Vuelve a conectarla y acepta el permiso de lectura.';if(error.name==='NotFoundError')return 'No existe position.json en esta carpeta. Ejecuta Iniciar-posicion.cmd desde la misma carpeta del lector que has seleccionado; después elige su carpeta live.';if(error.name==='SecurityError')return 'Abre la web en una pestaña propia de Chrome o Edge y permite leer la carpeta live.';return error.message||'No se pudo conectar la carpeta del lector.';}
async function resolvePositionDirectory(directory){try{await positionDeadline(directory.getFileHandle('position.json'));return directory;}catch(error){if(error.name!=='NotFoundError')throw error;}try{return await positionDeadline(directory.getDirectoryHandle('live'));}catch(error){if(error.name!=='NotFoundError')throw error;if(directory.name==='live')return directory;throw error;}}
function positionFeedback(title,note){$('position-state').textContent=title;$('position-note').textContent=note;}
function positionIsFresh(){return livePosition?.state==='playing'&&Date.now()-livePosition.updatedAt<=2500;}
function allExploredKeys(){return new Set([...exploredMap.cells.map(c=>c.x+':'+c.y),...positionVisited]);}
function paintPosition(){
 if(!current)return;const active=positionIsFresh(),cell=active?livePosition:null,altar=(roomCells.get(current.scene)??[]).find(c=>c.type===1)??roomCells.get(current.scene)?.[0];
 $('map-player').innerHTML=(altar?'<image class="saved-altar" x="'+(altar.x+.2)+'" y="'+(-altar.y-.8)+'" width=".6" height=".6" href="'+GAME_MAP.icons['map-cursor']+'"><title>Último altar del guardado; no es tu posición actual</title></image>':'')+(cell?'<g class="live-player" transform="translate('+(cell.x+.5)+' '+(-cell.y-.5)+')"><circle class="player-halo" r=".48"/><image x="-.34" y="-.34" width=".68" height=".68" href="'+GAME_MAP.icons['map-cursor']+'"/><title>Estás aquí · '+esc(areaForRoom(cell.room))+'</title></g>':'');
 $('map-player').setAttribute('aria-label',active?'Posición actual: '+areaForRoom(cell.room):'Sin posición actual; se indica únicamente el último altar del guardado');
 $('map-here').disabled=!active;
 if(cell&&$('follow-position').checked)setMapView({x:cell.x-9,y:-cell.y-7,width:18,height:14});
}
function stopPosition(announce=true){positionGeneration++;clearTimeout(positionTimer);positionTimer=null;positionDirectory=null;positionLocalConnection=false;livePosition=null;$('position-connect').disabled=false;$('position-disconnect').hidden=true;$('position-disconnect').textContent='Desconectar posición';$('position-state').textContent='Posición sin conectar';$('position-note').textContent='El cursor tenue indica el último altar del guardado. Conecta el lector local para ver tu casilla actual.';paintPosition();if(announce)tell('Posición desconectada. El análisis del guardado se conserva.');}
async function pollPosition(token){
 if(token!==positionGeneration||!(positionDirectory||positionLocalConnection))return;
 try{
  const payload=positionLocalConnection?await localRequest('/local/position'):await positionDeadline((async()=>{const file=await(await positionDirectory.getFileHandle('position.json')).getFile();if(file.size>4096)throw Error('La señal de posición es demasiado grande.');return JSON.parse(await file.text());})());if(token!==positionGeneration)return;
  const next=validatePosition(payload,GAME_MAP),previous=livePosition;livePosition=next;
  $('position-state').textContent=next.state==='playing'?'Posición en directo · '+areaForRoom(next.room):next.state==='waiting'?'Esperando al juego':next.state==='stale'?'Lector detenido o sin respuesta':'Posición no disponible';
  $('position-note').textContent=next.state==='playing'?'Tu casilla se actualiza cada 250 ms mientras el navegador lo permite. El panel de progreso indica si el inventario y las misiones proceden del juego o del guardado.':next.message;
  if(next.state==='playing'){const key=next.x+':'+next.y,newCell=!positionVisited.has(key);positionVisited.add(key);if(newCell||previous?.room!==next.room)renderMap();else paintPosition();}else paintPosition();
 }catch(error){if(token!==positionGeneration)return;if(!positionIsFresh()){livePosition=null;paintPosition();positionFeedback(error.name==='NotFoundError'?'Esperando al archivo del lector':'No se puede leer la posición',error instanceof SyntaxError?'El lector está actualizando el archivo. Se volverá a intentar.':positionError(error));}}
 finally{if(token===positionGeneration&&(positionDirectory||positionLocalConnection))positionTimer=setTimeout(()=>pollPosition(token),250);}
}
$('position-connect').addEventListener('click',async()=>{
 if(demoMode){positionFeedback('Carga tu partida real','El ejemplo no se puede conectar a la posición del juego.');return;}
 if(LOCAL_RUNTIME){await connectLocalPosition();return;}
 if(!('showDirectoryPicker'in window)){positionFeedback('Navegador no compatible','Conectar posición requiere Chrome o Edge en una pestaña propia por HTTPS o localhost.');return;}
 stopPosition(false);const token=positionGeneration;$('position-connect').disabled=true;$('position-disconnect').hidden=false;$('position-disconnect').textContent='Cancelar conexión';positionFeedback('Selecciona la carpeta del lector','Elige live, junto a Iniciar-posicion.cmd, en la ventana de Chrome.');
 try{let directory=await window.showDirectoryPicker({id:'blasphemous-position',mode:'read'});if(token!==positionGeneration)return;positionFeedback('Comprobando la carpeta…','Buscando position.json en la carpeta seleccionada.');directory=await resolvePositionDirectory(directory);if(token!==positionGeneration)return;positionDirectory=directory;$('position-disconnect').textContent='Desconectar posición';positionFeedback('Leyendo la posición…','Carpeta conectada: '+(directory.name??'live')+'.');await pollPosition(token);}
 catch(error){if(token!==positionGeneration)return;stopPosition(false);if(error.name!=='AbortError')positionFeedback('No se ha conectado el lector',positionError(error));else positionFeedback('Conexión cancelada','Puedes volver a elegir la carpeta live cuando quieras.');}
});
$('position-disconnect').addEventListener('click',()=>stopPosition());
$('map-here').addEventListener('click',()=>{if(positionIsFresh())setMapView({x:livePosition.x-9,y:-livePosition.y-7,width:18,height:14});});
$('follow-position').addEventListener('change',paintPosition);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&(positionDirectory||positionLocalConnection)){clearTimeout(positionTimer);pollPosition(++positionGeneration);}});
window.addEventListener('pagehide',()=>{clearTimeout(positionTimer);});

loadLocalArtwork();
