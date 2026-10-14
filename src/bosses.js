// Jefes: ubicación, estado, si basta con llegar o hacen falta objetos concretos, y salto al mapa.
// Los datos salen de boss-model; aquí solo se pintan y se gestionan las interacciones.
const BOSS_FILTER_STORE='cvstodia:boss-filter:v1';
let bossFilter=(()=>{try{const stored=localStorage.getItem(BOSS_FILTER_STORE);return BOSS_FILTERS.some(f=>f.id===stored)?stored:'pending';}catch{return 'pending';}})();
let bossNeeds=null,bossNeedsKey='',bossNeedsTimer=0,bossSignature='';

// Las rutas necesarias cuestan algún cálculo: solo se rehacen si cambia algo que las afecta
// (objetos de ruta, jefes derrotados o salas alcanzables), no con cada lectura del juego.
function bossRouteKey(){
 const ctx=accessibility.context;
 return JSON.stringify([ROUTE_ITEMS.filter(id=>ctx.has(id)),ROUTE_FLAGS.map(k=>ctx.flag(k)),[...ctx.reachableRooms].length]);
}
function bossInput(needs){
 return {data:analysisData,analysis:current,model:ACCESS_DATA,access:accessibility,cells:GAME_MAP.cells,areaForRoom:COMMUNICATION.areaForRoom,needs};
}
function scheduleBossNeeds(views,key){
 clearTimeout(bossNeedsTimer);
 const rooms=views.filter(v=>v.route==='blocked').map(v=>v.room);
 if(!rooms.length)return;
 bossNeedsTimer=setTimeout(()=>{
  if(!current||!analysisData||!accessibility||bossRouteKey()!==key)return;
  bossNeeds=computeRouteNeeds({...bossInput(),rooms});bossNeedsKey=key;renderBosses(true);
 },40);
}

function bossNeedHTML(view){
 const parts=[];
 if(view.fight)parts.push('<p class="boss-fight"><strong>Para el combate:</strong> '+esc(view.fight.text)+'</p><ul class="boss-reqs">'+view.fight.items.map(i=>'<li class="'+(i.owned?'owned':'missing')+'">'+(i.owned?'✓ ':'✗ ')+esc(i.name)+'</li>').join('')+'</ul>');
 if(view.route==='blocked'){
  parts.push('<p class="boss-route"><strong>Para llegar:</strong> '+(view.required.length?'te hace falta lo siguiente (sin ello no hay ruta):':esc(view.routeNote||'Calculando los requisitos…'))+'</p>'+(view.required.length?'<ul class="boss-reqs">'+view.required.map(r=>'<li class="missing">✗ '+esc(r.name)+'</li>').join('')+'</ul>':''));
 }else if(view.route==='unknown'&&view.state!=='defeated')parts.push('<p class="boss-route muted">No se puede calcular la ruta hasta la arena con los datos disponibles.</p>');
 return parts.join('');
}
function bossCardHTML(view){
 const cls=view.state==='defeated'?'obtained':view.canReachNow?'available':view.hasRequirements?'blocked':'unknown';
 const need=view.needsLabel?'<p class="boss-need"><span class="access-badge '+(view.canReachNow?'available':view.hasRequirements?'blocked':'unknown')+'">'+esc(view.needsLabel)+'</span></p>':'';
 return '<li class="boss-card boss-'+view.state+'" data-boss="'+esc(view.id)+'"><header class="boss-head"><strong>'+esc(view.name)+'</strong>'+(view.dlc?'<span class="boss-dlc">DLC</span>':'')+'<span class="state '+cls+'">'+esc(view.stateLabel)+'</span></header>'
  +'<p class="boss-en muted">'+esc(view.englishName)+'</p>'
  +'<p class="boss-where"><strong>Zona:</strong> '+esc(view.area||'sin zona catalogada')+(view.position?'':' <span class="muted">· sin casilla en el mapa</span>')+'</p>'
  +need+bossNeedHTML(view)
  +(view.notes.length?'<details class="boss-notes"><summary>Qué saber de este jefe</summary>'+view.notes.map(n=>'<p>'+esc(n)+'</p>').join('')+'<p class="muted boss-source">Fuente: '+esc(view.source)+'.</p></details>':'')
  +'<div class="boss-actions">'+(view.cellKey?'<button type="button" data-boss-map="'+esc(view.cellKey)+'" data-fk="map:'+esc(view.id)+'">Ver en el mapa</button>':'')+'</div></li>';
}

function renderBosses(force=false){
 if(!current||!analysisData||!accessibility||$('boss-panel').hidden)return;
 const key=bossRouteKey(),needs=bossNeedsKey===key?bossNeeds:null;
 const views=analyzeBosses(bossInput(needs));
 const signature=JSON.stringify([views.map(v=>[v.id,v.state,v.route,v.needsLabel,v.required.length,v.fight?.met]),bossFilter,Boolean(needs)]);
 if(!force&&signature===bossSignature)return;
 bossSignature=signature;
 if(!needs)scheduleBossNeeds(views,key);
 const focusKey=document.activeElement?.closest?.('#boss-panel')?document.activeElement.dataset.fk:null;
 const counts=bossFilterCounts(views),shown=filterBosses(views,bossFilter);
 const defeated=views.filter(v=>v.state==='defeated').length;
 $('boss-summary').textContent=defeated+' de '+views.length+' jefes derrotados · '+counts.reachable+' a los que puedes llegar ya · '+counts.requires+' con requisitos pendientes';
 $('boss-filters').innerHTML=BOSS_FILTERS.map(f=>'<button type="button" class="chip'+(bossFilter===f.id?' active':'')+'" data-boss-filter="'+f.id+'" data-fk="bchip:'+f.id+'" aria-pressed="'+(bossFilter===f.id)+'">'+esc(f.label)+' <span class="chip-count">'+counts[f.id]+'</span></button>').join('');
 $('boss-list').innerHTML=shown.length?shown.map(bossCardHTML).join(''):'<li class="muted quest-empty">No hay jefes con este filtro.</li>';
 if(focusKey)$('boss-panel').querySelector('[data-fk="'+CSS.escape(focusKey)+'"]')?.focus({preventScroll:true});
}

function focusMapCell(key){
 const [x,y]=key.split(':').map(Number);
 $('spoilers').checked=true;$('map-area').value='all';selectedMapKey=null;selectedBarrier=null;selectedCellKey=key;prefs.geometry='full';applyPrefs();render();
 setMapView({x:x-8,y:-y-6,width:16,height:12});
 $('map-panel').scrollIntoView({block:'start',behavior:'auto'});
}

$('boss-panel').addEventListener('click',e=>{
 const filter=e.target.closest('[data-boss-filter]');
 if(filter){bossFilter=filter.dataset.bossFilter;try{localStorage.setItem(BOSS_FILTER_STORE,bossFilter);}catch{/* El filtro solo se recuerda mientras la pestaña siga abierta. */}renderBosses(true);return;}
 const map=e.target.closest('[data-boss-map]');
 if(map)focusMapCell(map.dataset.bossMap);
});
