let pathFilter='all',selectedCellKey=null,quadrantPaths=[];
const QUADRANTS=createQuadrantModel(GAME_MAP,ACCESS_DATA,COMMUNICATION);
let mapView=null, selectedMapKey=null, selectedBarrier=null, mapMarkers=[], mapBarriers=[], mapProfile=null;
const mapPointers=new Map();let mapDrag=null, mapPinch=null, draggedMap=false;
const areaNames=[...new Set(CATALOG.filter(r=>MAP_DATA.positions[r.id]?.length).map(r=>r.area))].sort((a,b)=>a.localeCompare(b,'es'));
for(const area of areaNames)$('map-area').add(new Option(area,area));
const gameGrid=new Map(GAME_MAP.cells.map(c=>[c.x+':'+c.y,c]));
const roomCells=new Map();for(const c of GAME_MAP.cells){if(!roomCells.has(c.room))roomCells.set(c.room,[]);roomCells.get(c.room).push(c);}
const zoneNames=new Map(CATALOG.filter(r=>r.room).map(r=>[r.room.replace(/S\d+$/,''),r.area]));
function areaForRoom(room){return COMMUNICATION.areaForRoom(room);}
const SERVICE_ICONS={1:'map-priedieu',2:'map-teleport',3:'map-mea-culpa-altar',4:'map-soledad',5:'map-nacimiento',6:'map-confessor',7:'map-flask',8:'map-miriam'};
const RELIC_GLYPHS=Object.fromEntries(Object.entries(RELIC_HELP).map(([id,r])=>[id,r.symbol]));
function resetMapState(){selectedCellKey=null;positionVisited.clear();mapView=null;selectedMapKey=null;selectedBarrier=null;mapProfile=null;pathFilter='all';$('map-area').value='all';}
function gameBounds(){return boundsFor(GAME_MAP.cells.filter(c=>!c.ngplus||current?.ngplus||prefs.showNg),3);}
function setMapView(view){
 const ratio=$('world-map').clientWidth/Math.max(1,$('world-map').clientHeight);
 const cx=view.x+view.width/2,cy=view.y+view.height/2;
 let width=Math.max(5,Math.min(180,view.width)),height=width/(ratio||1.5);
 if(height<view.height){height=Math.max(4,Math.min(180,view.height));width=height*(ratio||1.5);}
 mapView={x:cx-width/2,y:cy-height/2,width,height};applyMapView();
}
function applyMapView(){
 if(!mapView)return;const svg=$('world-map');svg.setAttribute('viewBox',[mapView.x,mapView.y,mapView.width,mapView.height].join(' '));
 const unit=mapView.width/Math.max(1,svg.clientWidth),r=Math.max(.26,unit*prefs.markerSize),hit=Math.max(.55,unit*22);
 for(const marker of $('map-markers').children){marker.querySelector('.pin-dot')?.setAttribute('r',r+unit);marker.querySelector('.pin-hit')?.setAttribute('r',hit);marker.querySelector('.pin-ring')?.setAttribute('r',r+unit*3);marker.querySelector('.pin-count')?.setAttribute('font-size',Math.max(.6,unit*10));const icon=marker.querySelector('.pin-icon');if(icon){icon.setAttribute('x',-r);icon.setAttribute('y',-r);icon.setAttribute('width',r*2);icon.setAttribute('height',r*2);}}
 for(const marker of $('map-barriers').children){marker.querySelector('.barrier-hit')?.setAttribute('r',hit);const g=marker.querySelector('.barrier-symbol');if(g)g.setAttribute('transform','scale('+Math.max(.34,unit*8)+')');}
 const labels=[];
 for(const label of $('map-area-labels').children){
  label.style.display='';label.setAttribute('font-size',Math.max(.6,unit*11));
  const b=label.getBBox(),pad=unit*4,box={x:b.x-pad,y:b.y-pad,width:b.width+pad*2,height:b.height+pad*2};
  const outside=box.x<mapView.x||box.y<mapView.y||box.x+box.width>mapView.x+mapView.width||box.y+box.height>mapView.y+mapView.height;
  const overlap=labels.some(a=>box.x<a.x+a.width&&box.x+box.width>a.x&&box.y<a.y+a.height&&box.y+box.height>a.y);
  if(outside||overlap)label.style.display='none';else labels.push(box);
 }
}
function tileFor(cell,grid=gameGrid){
 const directions=[[-1,0,2],[0,1,0],[1,0,3],[0,-1,1]];
 let mask=directions.map(([dx,dy,i])=>cell.doors[i]?'D':cell.walls[i]||!grid.has((cell.x+dx)+':'+(cell.y+dy))?'W':'_').join('');
 for(let turn=0;turn<4;turn++){if(GAME_MAP.tiles[mask])return {href:GAME_MAP.tiles[mask],turn};mask=mask.slice(1)+mask[0];}
 return {href:GAME_MAP.tiles.WWWW,turn:0};
}
function gatePosition(gate){
 const cells=roomCells.get(gate.room)??[],targets=roomCells.get(gate.target)??[];if(!cells.length)return null;
 const tag=gate.id.match(/\[([^\]]+)\]/)?.[1],direction=tag==='N'?0:tag==='S'?1:tag==='W'?2:tag==='E'?3:gate.direction===1?2:gate.direction===2?3:gate.direction===0?0:1;
 const [dx,dy]=gate.direction===6?[0,-1]:[[0,1],[0,-1],[-1,0],[1,0]][direction];
 const exact=cells.filter(c=>c.doors[direction]&&gameGrid.get((c.x+dx)+':'+(c.y+dy))?.room===gate.target);
 let candidates=gate.direction===6?cells.filter(c=>c.y===Math.min(...cells.map(p=>p.y))):exact.length?exact:cells.filter(c=>c.doors[direction]);if(!candidates.length)candidates=cells;
 const score=c=>targets.length?Math.min(...targets.map(t=>Math.hypot(t.x-c.x,t.y-c.y))):direction===0?-c.y:direction===1?c.y:direction===2?c.x:-c.x;
 const chosen=candidates.reduce((a,b)=>score(a)<=score(b)?a:b);
 return {x:chosen.x+.5+dx*.45,y:-chosen.y-.5-dy*.45,cellX:chosen.x,cellY:chosen.y,approximate:exact.length!==1};
}
function mapStatus(rows){const states=rows.map(r=>accessibility.items.get(r.id)?.state??'unknown');return states.includes('available')?'available':states.includes('blocked')?'blocked':states.includes('unknown')?'unknown':'obtained';}
function mapVisible(row){const state=accessibility.items.get(row.id)?.state??'unknown';return prefs.categories.includes(row.group)&&(state==='obtained'?prefs.showAcquired:state==='later'?prefs.showNg:prefs[state]);}
// Las capas de casillas y servicios solo se repintan si su contenido cambia: no tienen estado propio y son lo más caro de dibujar.
const layerCache=new WeakMap();
function setLayerHTML(element,html){if(layerCache.get(element)===html)return;layerCache.set(element,html);element.innerHTML=html;}
function renderMap(){
 if(!current)return;
 const show=$('spoilers').checked;$('map-panel').hidden=!show;$('map-root-step').hidden=!show;if(!show)return;
 const area=$('map-area').value,rows=visible.filter(r=>(area==='all'||r.area===area)&&mapVisible(r));
 const revealed=allExploredKeys();quadrantPaths=QUADRANTS.specialPaths(accessibility.context);
 mapMarkers=markersFor(rows,MAP_DATA.positions).filter(m=>prefs.geometry==='full'||revealed.has(m.key));
 const activeGrid=new Map(gameGrid),savedSecrets=saveData.commonElements.ID_NEW_MAPS?.Maps?.[exploredMap.id]?.Secrets??[];
 for(const name of Array.isArray(savedSecrets)?savedSecrets:[])for(const cell of GAME_MAP.secrets?.[name]??[]){const key=cell.x+':'+cell.y;cell.remove?activeGrid.delete(key):activeGrid.set(key,cell);}
 const cells=[...activeGrid.values()].filter(c=>(!c.ngplus||current.ngplus||prefs.showNg)&&(prefs.geometry==='full'||revealed.has(c.x+':'+c.y)));
 setLayerHTML($('map-cells'),cells.map(c=>{const tile=tileFor(c,activeGrid),known=revealed.has(c.x+':'+c.y);return '<image class="game-tile'+(known?' explored':' unexplored')+'" x="'+c.x+'" y="'+(-c.y-1)+'" width="1" height="1" transform="rotate('+(tile.turn*90)+' '+(c.x+.5)+' '+(-c.y-.5)+')" opacity="'+(known?1:prefs.unexploredOpacity/100)+'" href="'+tile.href+'"/>';}).join(''));
 let serviceLayer=prefs.services?cells.filter(c=>SERVICE_ICONS[c.type]).map(c=>'<image x="'+(c.x+.16)+'" y="'+(-c.y-.84)+'" width=".68" height=".68" href="'+GAME_MAP.icons[SERVICE_ICONS[c.type]]+'"/>').join(''):'';
 if(prefs.showPersonalPins){const marks=saveData.commonElements.ID_NEW_MAPS?.Maps?.[exploredMap.id]?.Marks??[];for(const mark of Array.isArray(marks)?marks:[]){const x=mark.Key?.X??mark.Cell?.X??mark.X,y=mark.Key?.Y??mark.Cell?.Y??mark.Y,key='map-marker-'+({Cherub:'cherub',Npc:'npc',Chest:'chest',Question:'question',Enemy:'enemy',Red:'red',Green:'green',Blue:'blue'}[mark.Value]??'blue');if(Number.isInteger(x)&&Number.isInteger(y))serviceLayer+='<image class="personal-pin" x="'+(x+.18)+'" y="'+(-y-.82)+'" width=".64" height=".64" href="'+GAME_MAP.icons[key]+'"/>';}}
 setLayerHTML($('map-services'),serviceLayer);
 document.querySelector('.map-canvas').style.backgroundImage=prefs.art?'url("'+GAME_MAP.icons.cvstodiaMapBG+'")':'none';
 $('map-area-labels').innerHTML=prefs.labels?MAP_DATA.areas.filter(a=>area==='all'||a.name===area).map(a=>'<text x="'+a.x+'" y="'+(-a.y-1.8)+'" text-anchor="middle" class="area-label">'+esc(a.name)+'</text>').join(''):'';
 mapBarriers=[];
 if(prefs.barriers)for(const gate of accessibility.barriers){const point=gatePosition(gate);if(!point)continue;const presentation=COMMUNICATION.pathPresentation(gate,accessibility.context),ids=presentation.requirements.map(r=>r.id).filter(id=>prefs.relicLayers.includes(id));if(!ids.length||(pathFilter!=='all'&&!ids.includes(pathFilter))||prefs.barrierOnlyMissing&&!presentation.requirements.some(r=>!r.owned||prefs.equipmentOnly&&!r.equipped)||prefs.geometry==='explored'&&!revealed.has(point.cellX+':'+point.cellY))continue;
  const roomArea=areaForRoom(gate.room);if(area!=='all'&&roomArea!==area)continue;
  mapBarriers.push({...gate,...point,relics:ids,presentation});
 }
 if(prefs.itemBarriers&&pathFilter==='all')for(const row of rows){const a=accessibility.items.get(row.id),requirements=COMMUNICATION.relicRequirements(a.condition,accessibility.context),ids=requirements.map(r=>r.id).filter(id=>prefs.relicLayers.includes(id));if(!ids.length||prefs.barrierOnlyMissing&&!requirements.some(r=>!r.owned||prefs.equipmentOnly&&!r.equipped))continue;for(const p of MAP_DATA.positions[row.id]??[]){if(prefs.geometry==='explored'&&!revealed.has(p.x+':'+p.y))continue;mapBarriers.push({id:'item:'+row.id,room:row.room,x:p.x+.85,y:-p.y-.15,value:a.state==='available'?true:a.state==='blocked'?false:null,relics:ids,approximate:false,kind:'item',row,reasons:a.reasons});}}
 if(!mapBarriers.some(b=>b.id===selectedBarrier))selectedBarrier=null;
 $('map-barriers').innerHTML=mapBarriers.map(b=>{const p=b.presentation??COMMUNICATION.pathPresentation({...b,logic:accessibility.items.get(b.row?.id)?.condition??''},accessibility.context);const name=p.title+' · '+p.place+' · '+b.relics.map(id=>accessibility.context.name(id)).join(' / '),state=b.value===true?'available':b.value===false?'blocked':'unknown';return '<g class="map-barrier '+state+(selectedBarrier===b.id?' selected':'')+'" transform="translate('+b.x+' '+b.y+')" role="button" tabindex="0" data-barrier="'+esc(b.id)+'" aria-label="'+esc((b.kind==='item'?'Requisito de objeto: ':'Paso: ')+name)+'"><title>'+esc(name)+'</title><circle class="barrier-hit" r=".5"/><g class="barrier-symbol"><path d="M 0 -1 L 1 0 L 0 1 L -1 0 Z"/><text y=".07" dominant-baseline="central" text-anchor="middle">'+RELIC_GLYPHS[b.presentation?.primary??b.relics[0]]+'</text></g></g>';}).join('');
 if(!mapMarkers.some(m=>m.key===selectedMapKey))selectedMapKey=null;
 $('map-markers').innerHTML=mapMarkers.map(marker=>{
  const followed=marker.rows.some(r=>tracked.has(r.id)),selected=marker.key===selectedMapKey,status=mapStatus(marker.rows);
  const label=marker.rows.map(r=>r.name+' ('+ACCESS_LABEL[accessibility.items.get(r.id).state]+')').join(', '),group=marker.rows[0].group;
  const icon=GAME_MAP.icons[group==='cherubs'?'map-marker-cherub':group==='quest'?'map-marker-npc':'map-marker-chest'];
  return '<g role="button" tabindex="0" class="map-pin '+status+(followed?' followed':'')+(selected?' selected':'')+'" data-point="'+marker.key+'" transform="translate('+(marker.x+.5)+' '+(-marker.y-.5)+')" aria-label="'+esc(label)+'" aria-pressed="'+selected+'"><title>'+esc(label)+'</title><circle class="pin-hit" r=".8"/><circle class="pin-ring" r=".7"/><circle class="pin-dot" r=".4"/>'+(prefs.markerStyle==='game'?'<image class="pin-icon" href="'+icon+'" x="-.4" y="-.4" width=".8" height=".8"/>':'')+(marker.rows.length>1?'<text class="pin-count" text-anchor="middle" dominant-baseline="central" font-size=".7">'+marker.rows.length+'</text>':'')+'</g>';
 }).join('');
 paintPosition();renderQuadrantHighlights(cells,revealed);
 const positioned=rows.filter(r=>MAP_DATA.positions[r.id]?.length).length,unplaced=rows.length-positioned;
 $('map-count').textContent=mapMarkers.length+' puntos de objetos · '+mapBarriers.length+' pasos / requisitos'+(unplaced?' · '+unplaced+' objetos sin posición fija':'');
 $('map-no-position').hidden=mapMarkers.length>0||mapBarriers.length>0;$('map-no-position').textContent='No hay marcadores visibles. Prueba a restablecer los filtros de la lista, elegir otra zona o activar más capas del mapa.';
 $('map-exploration-note').textContent=exploredMap.cells.length+' casillas exploradas · '+cells.length+' visibles · '+(prefs.geometry==='full'?'salas sin explorar atenuadas':'solo lo explorado')+'. Sigue los filtros de la lista y la configuración del mapa.';
 renderPathNavigation();renderMapDetail();if(!mapView||mapProfile!==profile){mapProfile=profile;setMapView(gameBounds());}else applyMapView();
}
function renderPathNavigation(){
 const ctx=accessibility.context;
 $('relic-path-toolbar').innerHTML=[['all','Todos los caminos'],['RE10','♧ Raíces'],['RE05','↓ Caídas por abismo'],['RE01','Plataformas de sangre'],['RE03','Agua y barro'],['RE07','Miasma'],['RE04','Pistas']].map(([id,label])=>'<button data-path-filter="'+id+'" aria-pressed="'+(pathFilter===id)+'" '+(pathFilter===id?'class="active"':'')+'>'+label+'</button>').join('');
 $('path-filter-note').textContent=pathFilter==='all'?'Los caminos de reliquia se filtran por zona y capas del mapa, independientemente de los objetos de la lista.':RELIC_HELP[pathFilter].label+' — '+COMMUNICATION.name(pathFilter)+'. '+RELIC_HELP[pathFilter].action;
 const paths=mapBarriers.filter(b=>b.kind==='path');
 $('path-list-title').textContent=paths.length+' caminos de reliquia: ver zonas y requisitos';
 $('path-list').innerHTML=paths.length?paths.map(b=>{const p=b.presentation;return '<button class="path-list-row" data-path-select="'+esc(b.id)+'"><strong>'+esc(p.title)+'</strong><span>'+esc(p.place)+'</span><small>'+esc(p.requirements.map(r=>r.name).join(' / '))+'</small><small>'+esc(p.status)+'</small></button>';}).join(''):'<p class="muted">No hay caminos con estas capas. Activa «Pasos que requieren reliquia», revisa la zona o desmarca «Solo rutas con reliquias que me faltan».</p>';
}
function renderSelectedRoute(barrier){
 if(!barrier||barrier.kind!=='path'){$('map-route').innerHTML='';return;}
 const target=roomCells.get(barrier.target)??[];if(!target.length){$('map-route').innerHTML='';return;}
 const closest=target.reduce((a,b)=>Math.hypot(a.x+.5-barrier.x,-a.y-.5-barrier.y)<=Math.hypot(b.x+.5-barrier.x,-b.y-.5-barrier.y)?a:b);
 $('map-route').innerHTML='<path class="selected-route" d="M '+barrier.x+' '+barrier.y+' L '+(closest.x+.5)+' '+(-closest.y-.5)+'" marker-end="url(#route-arrow)"/>';
}
function renderQuadrantHighlights(cells,revealed){
 const marks=new Map();for(const p of quadrantPaths){if(!p.position)continue;for(const c of [p.position.cell,p.position.arrival].filter(Boolean)){const key=c.x+':'+c.y;if(!marks.has(key))marks.set(key,{cell:c,paths:[]});marks.get(key).paths.push(p);}}
 $('map-cell-highlights').innerHTML=prefs.specialCells?cells.filter(c=>marks.has(c.x+':'+c.y)&&(!prefs.specialOnlyUnexplored||!revealed.has(c.x+':'+c.y))).map(c=>'<rect class="special-cell-highlight'+(revealed.has(c.x+':'+c.y)?' discovered':'')+'" x="'+c.x+'" y="'+(-c.y-1)+'" width="1" height="1"/>').join(''):'';
 const selected=QUADRANTS.grid.get(selectedCellKey);$('map-selected-cell').innerHTML=selected?'<rect class="selected-quadrant" x="'+selected.x+'" y="'+(-selected.y-1)+'" width="1" height="1"/>':'';
}
function selectQuadrant(key){
 const c=QUADRANTS.grid.get(key);if(!c||c.ngplus&&!current.ngplus&&!prefs.showNg||prefs.geometry==='explored'&&!allExploredKeys().has(key))return;
 selectedCellKey=key;selectedMapKey=null;selectedBarrier=null;$('follow-position').checked=false;renderMap();$('world-map').focus({preventScroll:true});
}
function renderQuadrantDetail(){
 const info=QUADRANTS.describeCell(selectedCellKey,accessibility.context,allExploredKeys(),quadrantPaths);if(!info){selectedCellKey=null;return;}
 const pathHTML=(p,direction)=>'<article class="quadrant-path"><h4>'+esc(p.presentation.title)+'</h4><p>'+esc(direction==='incoming'?'Desde '+areaForRoom(p.room):'Hacia '+areaForRoom(p.target))+'</p><span class="access-badge '+(p.value===true?'available':p.value===false?'blocked':'unknown')+'">'+esc(p.presentation.status)+'</span>'+requirementHTML(p.requirements)+p.extras.map(a=>'<p><strong>'+esc(a.label)+'</strong><br>'+esc(a.value===true?'El guardado acredita este requisito.':a.value===false?'Requisito pendiente según el guardado.':'Comprueba el mecanismo o la misión en el juego.')+'</p>').join('')+'<details><summary>Entradas y alternativas</summary>'+routesHTML(p.routes)+'</details><button data-cell-route="'+esc(p.id)+'">Ver origen y destino</button>'+(p.position?.approximate?'<p class="quadrant-note">La flecha orienta entre salas; el punto del paso es aproximado.</p>':'')+'</article>';
 $('map-detail').innerHTML='<p class="eyebrow">CASILLA SELECCIONADA</p><h3>'+esc(info.area)+'</h3><p class="access-badge '+(info.explored?'obtained':'unknown')+'">'+(info.explored?'Descubierta':'Sin descubrir')+'</p>'+(info.special?'<p class="quadrant-note">Estos pasos pertenecen a la sala de esta casilla. No todas sus casillas o entradas exigen la misma reliquia.</p>'+(info.regularEntrance?'<p class="next-action">También hay una entrada sin requisito especial catalogado. Las rutas siguientes son alternativas o tramos concretos.</p>':'')+(info.incoming.length?'<h4>Accesos especiales a esta sala</h4>'+info.incoming.map(p=>pathHTML(p,'incoming')).join(''):'')+(info.within.length?'<details '+(!info.incoming.length?'open':'')+'><summary>Pasos especiales desde esta sala</summary>'+info.within.map(p=>pathHTML(p,'outgoing')).join('')+'</details>':''):'<p>No hay un requisito especial catalogado para esta sala. Usa las puertas que aparecen en el mapa.</p>')+'<p class="quadrant-note">La accesibilidad usa el último guardado cargado. Una sala sin descubrir puede tener una entrada alcanzable que todavía no hayas recorrido.</p><p class="item-code">Sala '+esc(info.cell.room)+' · Casilla '+info.cell.x+', '+info.cell.y+'</p>';
}
$('map-detail').addEventListener('click',e=>{const button=e.target.closest('[data-cell-route]');if(!button)return;const p=quadrantPaths.find(p=>p.id===button.dataset.cellRoute);if(!p?.position)return;$('follow-position').checked=false;const source=p.position.cell;renderSelectedRoute({...p,x:source.x+.5,y:-source.y-.5});setMapView(boundsFor([source,p.position.arrival].filter(Boolean),3));});
function renderMapDetail(){
 const barrier=mapBarriers.find(b=>b.id===selectedBarrier);renderSelectedRoute(barrier);
 if(selectedCellKey){renderQuadrantDetail();return;}
 if(barrier){
  const p=barrier.presentation??COMMUNICATION.pathPresentation({...barrier,logic:accessibility.items.get(barrier.row?.id)?.condition??''},accessibility.context);
  $('map-detail').innerHTML='<p class="eyebrow">'+(barrier.kind==='item'?'REQUISITO DEL OBJETO':'CAMINO DE RELIQUIA')+'</p><h3>'+esc(p.title)+'</h3><p class="path-place">'+esc(barrier.kind==='item'?barrier.row.name:p.place)+'</p><span class="access-badge '+(barrier.value===true?'available':p.missing.length?'blocked':'unknown')+'">'+esc(p.status)+'</span>'+(p.fall?'<p class="next-action"><strong>Cómo pasar</strong><br>Equipa el Lienzo de Hilo de Oro antes de dejarte caer. Bajarás a la sala inferior. Esta caída es de una sola dirección: para volver tendrás que usar otro camino.</p>':'')+requirementHTML(p.requirements)+((barrier.reasons??[]).length?'<ul class="access-reasons">'+barrier.reasons.map(COMMUNICATION.friendlyReason).filter(Boolean).map(x=>'<li>'+esc(x)+'</li>').join(''):'')+'<details><summary>Entradas y alternativas de esta ruta</summary>'+routesHTML(p.routes)+'</details>'+(barrier.approximate?'<p class="muted access-note">El marcador orienta sobre el tramo dentro de la sala. Su posición es aproximada.</p>':'')+'<p class="muted access-note">Estos requisitos describen este camino. No significan que toda la zona exija las mismas reliquias.</p><p class="item-code">'+esc(barrier.id)+'</p>';
  return;
 }
 const marker=mapMarkers.find(m=>m.key===selectedMapKey);
 if(!marker){$('map-detail').innerHTML='<p class="eyebrow">QUÉ NECESITAS PARA PASAR</p><h3>Elige un objeto o un camino</h3><p>Los marcadores <strong>♧</strong> señalan raíces: requieren <strong>Tres Lenguas Nudosas</strong>.</p><p>Los marcadores <strong>↓</strong> señalan caídas a salas inferiores: usa el <strong>Lienzo de Hilo de Oro</strong> para atravesar el abismo sin morir.</p><p class="muted">Pulsa «Raíces» o «Caídas por abismo» encima del mapa para aislar esos caminos. Abre la lista de caminos para ver los nombres de las zonas y centrar uno.</p>';return;}
 $('map-detail').innerHTML='<p class="eyebrow">OBJETOS DEL PUNTO SELECCIONADO</p><h3>'+esc([...new Set(marker.rows.map(r=>r.area))].join(' / '))+'</h3>'+marker.rows.map(row=>'<article class="map-object"><span class="state '+row.status+'">'+esc(STATUS_LABEL[row.status])+'</span><h4>'+esc(row.name)+'</h4>'+accessHTML(row,true)+'<p class="item-code">'+esc(row.id)+(row.room?' · '+esc(row.room):'')+'</p>'+(row.description?'<p>'+esc(row.description)+'</p>':'')+(guideFor(row)?'<details><summary>Dónde encontrarlo</summary><p>'+esc(guideFor(row))+'</p></details>':'')+questLinksHTML(row.id)+'<label class="track-label"><input type="checkbox" data-map-track="'+esc(row.id)+'" aria-label="Seguir '+esc(row.name)+' desde el mapa" '+(tracked.has(row.id)?'checked':'')+'> Seguir</label><a target="_blank" rel="noopener noreferrer" href="https://blasphemous.wiki.gg/wiki/'+encodeURIComponent((row.englishName??'Children of Moonlight').replaceAll(' ','_'))+'">Guía del objeto ↗</a></article>').join('');
}
$('relic-path-toolbar').addEventListener('click',e=>{
 const b=e.target.closest('[data-path-filter]');if(!b)return;pathFilter=b.dataset.pathFilter;selectedCellKey=null;selectedBarrier=null;selectedMapKey=null;
 if(pathFilter!=='all'){prefs.barriers=true;prefs.relicLayers=[...new Set([...prefs.relicLayers,pathFilter])];applyPrefs();}
 renderMap();
 if(mapBarriers.length)setMapView(boundsFor(mapBarriers.map(b=>({x:b.cellX??b.x,y:b.cellY??-b.y})),3));
});
$('path-list').addEventListener('click',e=>{
 const b=e.target.closest('[data-path-select]');if(!b)return;selectedCellKey=null;selectedBarrier=b.dataset.pathSelect;selectedMapKey=null;renderMap();const p=mapBarriers.find(p=>p.id===selectedBarrier);if(p)setMapView({x:p.x-8,y:p.y-6,width:16,height:12});$('world-map').focus({preventScroll:true});
});
function selectMapPoint(key){selectedCellKey=null;const restore=svg.contains(document.activeElement);selectedBarrier=null;selectedMapKey=key;renderMap();if(restore)svg.querySelector('[data-point="'+key+'"]')?.focus({preventScroll:true});}
function focusMapItem(id,adjustFilters=false){selectedCellKey=null;
 const point=MAP_DATA.positions[id]?.[0];if(!point)return;
 if(adjustFilters){$('category').value='all';$('access-filter').value='all';$('status').value='all';$('search').value=current.rows.find(r=>r.id===id).name;$('tracked-only').checked=false;}
 $('map-area').value='all';$('spoilers').checked=true;selectedBarrier=null;prefs.categories=[...new Set([...prefs.categories,current.rows.find(r=>r.id===id).group])];const state=accessibility.items.get(id).state;if(state==='obtained')prefs.showAcquired=true;else if(state==='later')prefs.showNg=true;else prefs[state]=true;prefs.geometry='full';applyPrefs();selectedMapKey=point.x+':'+point.y;render();
 if(adjustFilters)tell('Mostrando «'+current.rows.find(r=>r.id===id).name+'» en el mapa. Los filtros de la lista se han ajustado para localizarlo; usa «Limpiar filtros» para volver.');
 setMapView({x:point.x-9,y:-point.y-7,width:18,height:14});
 $('map-panel').scrollIntoView({block:'start',behavior:'instant'});
 $('world-map').focus({preventScroll:true});
}
function zoomMap(factor,point){
 if(!mapView)return;$('follow-position').checked=false;const anchor=point??{x:mapView.x+mapView.width/2,y:mapView.y+mapView.height/2};
 const width=Math.max(5,Math.min(180,mapView.width*factor)),scale=width/mapView.width;
 mapView={x:anchor.x+(mapView.x-anchor.x)*scale,y:anchor.y+(mapView.y-anchor.y)*scale,width,height:mapView.height*scale};applyMapView();
}
function screenToMap(x,y){const matrix=$('world-map').getScreenCTM();return matrix?new DOMPoint(x,y).matrixTransform(matrix.inverse()):{x:0,y:0};}
$('map-zoom-in').addEventListener('click',()=>zoomMap(.75));$('map-zoom-out').addEventListener('click',()=>zoomMap(1/.75));
$('map-reset').addEventListener('click',()=>{$('follow-position').checked=false;setMapView(gameBounds());});
$('map-undiscovered').addEventListener('click',()=>{$('follow-position').checked=false;prefs.geometry='full';prefs.specialCells=true;prefs.specialOnlyUnexplored=true;$('map-area').value='all';applyPrefs();renderMap();const cells=quadrantPaths.flatMap(p=>[p.position?.cell,p.position?.arrival]).filter(c=>c&&!allExploredKeys().has(c.x+':'+c.y));setMapView(cells.length?boundsFor(cells,2):gameBounds());tell(cells.length?'Casillas con pasos especiales sin descubrir resaltadas. Pulsa una para ver sus requisitos.':'No hay casillas sin descubrir con pasos especiales catalogados.');});
$('map-fit').addEventListener('click',()=>{if(mapMarkers.length)setMapView(boundsFor(mapMarkers,2));});
$('map-altar').addEventListener('click',()=>{const cell=(roomCells.get(current.scene)??[]).find(c=>c.type===1)??roomCells.get(current.scene)?.[0];if(cell)setMapView({x:cell.x-9,y:-cell.y-7,width:18,height:14});else tell('El último altar no tiene una posición compatible.');});
$('map-fullscreen').addEventListener('click',()=>{document.body.classList.toggle('map-expanded');$('map-fullscreen').textContent=document.body.classList.contains('map-expanded')?'Cerrar vista ampliada':'Ampliar vista';});
$('map-detail').addEventListener('click',e=>{const b=e.target.closest('[data-detail-locate]');if(b)focusMapItem(b.dataset.detailLocate,true);});
$('map-area').addEventListener('change',()=>{renderMap();if(mapMarkers.length)setMapView(boundsFor(mapMarkers,2));});
$('map-root-step').addEventListener('click',()=>{if(!current)return;focusMapItem(current.rootStep>=3?'RE10':current.rootStep===2?'QI14':'QI13',true);});
$('map-detail').addEventListener('change',e=>{const id=e.target.dataset.mapTrack;if(!id)return;e.target.checked?tracked.add(id):tracked.delete(id);saveTracking();render();});
const svg=$('world-map');
svg.addEventListener('click',e=>{
 if(draggedMap){draggedMap=false;return;}
 const gate=e.target.closest('[data-barrier]');if(gate){selectedCellKey=null;selectedMapKey=null;selectedBarrier=gate.dataset.barrier;renderMap();return;}const pin=e.target.closest('[data-point]');if(!pin){const point=screenToMap(e.clientX,e.clientY),key=Math.floor(point.x)+':'+Math.floor(-point.y);selectQuadrant(key);return;}
 const point=screenToMap(e.clientX,e.clientY);
 const nearest=mapMarkers.reduce((best,m)=>{const distance=Math.hypot(m.x+.5-point.x,-m.y-.5-point.y);return !best||distance<best.distance?{key:m.key,distance}:best;},null);
 selectMapPoint(nearest?.key??pin.dataset.point);
});
svg.addEventListener('keydown',e=>{
 const gate=e.target.closest('[data-barrier]');if(gate&&['Enter',' '].includes(e.key)){e.preventDefault();selectedCellKey=null;selectedBarrier=gate.dataset.barrier;selectedMapKey=null;renderMap();svg.querySelector('[data-barrier=\"'+CSS.escape(selectedBarrier)+'\"]')?.focus({preventScroll:true});return;}const pin=e.target.closest('[data-point]');if(pin&&['Enter',' '].includes(e.key)){e.preventDefault();selectMapPoint(pin.dataset.point);return;}
 if(!mapView)return;
 if(e.key==='Enter'&&e.target===svg){e.preventDefault();if(selectedCellKey)renderMapDetail();else selectQuadrant(Math.floor(mapView.x+mapView.width/2)+':'+Math.floor(-mapView.y-mapView.height/2));return;}
 const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(directions[e.key]){e.preventDefault();$('follow-position').checked=false;if(selectedCellKey){const c=QUADRANTS.grid.get(selectedCellKey),[dx,dy]=directions[e.key],next=(c.x+dx)+':'+(c.y-dy);if(QUADRANTS.grid.has(next)){selectQuadrant(next);return;}}const [dx,dy]=directions[e.key];mapView.x+=dx*mapView.width*.08;mapView.y+=dy*mapView.height*.08;applyMapView();}
 if(['+','=','-'].includes(e.key)){e.preventDefault();zoomMap(e.key==='-'?1/.75:.75);}
 if(e.key==='Escape'){document.body.classList.remove('map-expanded');$('map-fullscreen').textContent='Ampliar vista';selectedCellKey=null;selectedBarrier=null;selectedMapKey=null;renderMap();svg.focus();}
});
svg.addEventListener('wheel',e=>{if(!e.ctrlKey||!mapView)return;e.preventDefault();zoomMap(e.deltaY>0?1.12:1/1.12,screenToMap(e.clientX,e.clientY));},{passive:false});
svg.addEventListener('pointerdown',e=>{
 if(!mapView||e.button>0)return;
 mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});draggedMap=false;
 if(mapPointers.size===1)mapDrag={id:e.pointerId,screen:{x:e.clientX,y:e.clientY},point:screenToMap(e.clientX,e.clientY),view:{...mapView}};
 if(mapPointers.size===2){mapDrag=null;const [a,b]=[...mapPointers.values()];mapPinch={distance:Math.hypot(a.x-b.x,a.y-b.y),view:{...mapView}};draggedMap=true;}
});
svg.addEventListener('pointermove',e=>{
 if(!mapPointers.has(e.pointerId))return;mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(mapPointers.size===2&&mapPinch){const [a,b]=[...mapPointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);mapView={...mapPinch.view};zoomMap(mapPinch.distance/Math.max(1,distance));draggedMap=true;}
 else if(mapDrag&&mapDrag.id===e.pointerId){const moved=Math.hypot(e.clientX-mapDrag.screen.x,e.clientY-mapDrag.screen.y);if(moved<4&&!draggedMap)return;draggedMap=true;$('follow-position').checked=false;svg.setPointerCapture(e.pointerId);const units=mapDrag.view.width/Math.max(1,svg.clientWidth);mapView={...mapDrag.view,x:mapDrag.view.x-(e.clientX-mapDrag.screen.x)*units,y:mapDrag.view.y-(e.clientY-mapDrag.screen.y)*units};applyMapView();}
});
function releaseMapPointer(e){mapPointers.delete(e.pointerId);mapDrag=null;mapPinch=null;if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);}
window.addEventListener('pointerup',releaseMapPointer);window.addEventListener('pointercancel',releaseMapPointer);
new ResizeObserver(()=>{if(mapView){const ratio=svg.clientWidth/Math.max(1,svg.clientHeight),height=mapView.width/(ratio||1.5);mapView={...mapView,y:mapView.y+mapView.height/2-height/2,height};applyMapView();}}).observe(svg);
