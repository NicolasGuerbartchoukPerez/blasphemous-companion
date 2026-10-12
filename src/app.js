const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COMMUNICATION=createCommunication(CATALOG,ACCESS_DATA);
const STATUS_LABEL = {missing:'No obtenido',obtained:'Obtenido',unknown:'Posesión sin confirmar',later:'Nueva Partida+'};
let current=null, tracked=new Set(), profile='', visible=[], liveDirectory=null, liveTimer=null, generation=0, liveText='', fileName='', busy=false, demoMode=false, exploredMap={id:null,cells:[]},saveData=null,analysisData=null,accessibility=null;
function refreshAccessibility(data=analysisData??saveData){if(current&&data){analysisData=data;accessibility=analyzeAccess(data,current,ACCESS_DATA,{equipmentOnly:prefs.equipmentOnly});}}
for(const [key,name] of Object.entries(GROUPS)) $('category').add(new Option(name,key));
function tell(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function loadTracking(key){profile=key;try{const a=JSON.parse(localStorage.getItem(key)??'[]');tracked=new Set(Array.isArray(a)?a.filter(x=>typeof x==='string'):[]);}catch{tracked=new Set();}}
function saveTracking(){try{localStorage.setItem(profile,JSON.stringify([...tracked]));}catch{tell('El navegador no permite guardar el seguimiento. Se conservará durante esta sesión.');}updateTracking();}
function updateTracking(){ $('track-root').checked=tracked.has('RE10');$('tracked-count').textContent='('+tracked.size+')'; }
function acceptText(text,name,mode='manual') {
 const data=decodeSave(text), result=analyze(data,CATALOG);
 const nextProfile='cvstodia:v1:'+name+':'+(result.ngplus?'ngplus':'normal')+':'+(mode==='demo'?'example':'save');
 const before=current?.rows.filter(r=>r.status==='obtained').map(r=>r.id)??[];
 const same=profile===nextProfile;
 if(!same){stopPosition(false);loadTracking(nextProfile);}
 stopProgress(false);current=result;saveData=data;analysisData=data;fileName=name;demoMode=mode==='demo';exploredMap=extractMapCells(data);refreshAccessibility();document.body.classList.add('loaded');
 if(!same)resetMapState();
 $('welcome').hidden=true;$('results').hidden=false;
 $('save-label').textContent=demoMode?'EJEMPLO FICTICIO · NO ES TU PARTIDA':name+(result.ngplus?' · NUEVA PARTIDA+':' · PARTIDA NORMAL');
 $('summary-title').textContent=result.relicCount+'/7 reliquias · '+result.rescued+(result.cherubsKnown?'/38':' confirmados')+' querubines';
 const hours=result.playtime===null?'':Math.floor(result.playtime/3600)+' h '+Math.floor(result.playtime%3600/60)+' min';
 $('save-meta').textContent=[result.progress===null?'':result.progress.toLocaleString('es-ES',{maximumFractionDigits:2})+' % indicado por el juego',hours,result.scene?'Último altar: '+COMMUNICATION.areaForRoom(result.scene):''].filter(Boolean).join(' · ');
 $('root-next').textContent=result.rootNext;
 updateTracking();render();startProgress();
 if(!same&&!demoMode&&LOCAL_RUNTIME)connectLocalPosition();
 if(mode==='live'&&same){const added=result.rows.filter(r=>r.status==='obtained'&&!before.includes(r.id));if(added.length)tell('Guardado actualizado. Nuevos: '+added.slice(0,5).map(r=>r.name).join(', ')+(added.length>5?'…':''));}
 else tell(demoMode?'Estás viendo datos de ejemplo. Carga tu archivo para analizar tu partida.':'Partida leída. '+result.warnings.join(' '));
}
function matches(row){const category=$('category').value,status=$('status').value,access=$('access-filter').value;const query=$('search').value.trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();const requirements=COMMUNICATION.relicRequirements(accessibility.items.get(row.id).condition,accessibility.context);const text=[row.name,row.englishName,row.area,row.description,row.guide,row.id,row.room,...requirements.flatMap(r=>[r.name,r.label,r.action,r.id==='RE05'?'caídas abismos precipicios':''])].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();return (category==='all'||row.group===category)&&(status==='all'||status==='pending'&&['missing','unknown'].includes(row.status)||row.status===status)&&(access==='all'||accessibility.items.get(row.id)?.state===access)&&(!$('tracked-only').checked||tracked.has(row.id))&&(!query||text.includes(query));}
function requirementHTML(requirements){return requirements.map(r=>'<article class="requirement-card" data-relic-requirement="'+r.id+'"><div><span class="requirement-kind">'+esc(r.label)+'</span><strong>'+esc(r.name)+'</strong><span class="requirement-status '+(r.owned?'owned':'missing')+'">'+esc(r.status)+'</span></div><p>'+esc(r.action)+'</p><p>'+esc(r.owned?r.instruction:r.obtain)+'</p>'+(r.optional?'<p class="muted">Es una alternativa de acceso; no todas las rutas exigen esta reliquia.</p>':'')+'<button class="text-button" data-detail-locate="'+r.id+'">'+(r.owned?'Ver reliquia':'Dónde conseguirla')+'</button></article>').join('');}
function routesHTML(routes){if(!routes.length)return '';return '<ol class="route-options">'+routes.slice(0,6).map(route=>'<li>'+esc(route.length?route.map(a=>a.label).join(' + '):'No requiere una reliquia adicional por esta entrada.')+'</li>').join('')+'</ol>'+(routes.length>6?'<p class="muted">Hay otras variantes de entrada. Se muestran las primeras rutas documentadas.</p>':'');}
function accessHTML(row,details=false){
 const a=accessibility?.items.get(row.id);if(!a)return '';const p=COMMUNICATION.itemPresentation(row,a,accessibility.context);
 if(!details&&['obtained','later'].includes(a.state))return '';
 return '<span class="access-badge '+a.state+'" title="'+esc(p.title)+'">'+esc(ACCESS_LABEL[a.state])+'</span>'+(details?'<p class="access-title">'+esc(p.title)+'</p>'+(p.next?'<p class="next-action"><strong>Qué hacer ahora</strong><br>'+esc(p.next)+'</p>':'')+requirementHTML(p.requirements)+(p.reasons.length?'<ul class="access-reasons">'+p.reasons.slice(0,7).map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul>':'')+(p.routes.length>1?'<details class="access-routes"><summary>Alternativas de acceso</summary>'+routesHTML(p.routes)+'</details>':'')+(p.note?'<p class="muted access-note">'+esc(p.note)+'</p>':''):'');
}
function locationHTML(row){return esc(row.area)+(prefs.showIDs&&row.room?'<span class="item-code">Sala '+esc(row.room)+'</span>':'');}
function guideFor(row){let guide=row.guide??'';if(row.id==='RE05'&&current.cherubsKnown)guide+=' Tu partida tiene '+current.rescued+' querubines: '+(current.rescued>=20?'ya cumples el mínimo; comprueba la entrega con Jocinero.':'te faltan '+(20-current.rescued)+' para el mínimo.');if(row.status==='unknown')guide+=' Falta un evento de entrega o un registro individual de recogida para confirmar este objeto. Guarda en un altar después de recogerlo o activa la lectura del juego.';return guide;}
function render(){
 if(!current)return;
 visible=current.rows.filter(matches).sort((a,b)=>(a.priority??100)-(b.priority??100)||a.group.localeCompare(b.group)||a.name.localeCompare(b.name,'es',{numeric:true}));
 $('collection-count').textContent=visible.length+' de '+current.rows.length+' objetos · filtros de la lista';$('empty').hidden=visible.length!==0;
 const pending=current.rows.filter(r=>!['obtained','later'].includes(r.status));$('access-summary').textContent=['available','blocked','unknown'].map(s=>pending.filter(r=>accessibility.items.get(r.id)?.state===s).length+' '+(s==='available'?'accesibles':s==='blocked'?'con requisitos pendientes':'por verificar')).join(' · ');
 const spoilers=$('spoilers').checked,openItems=new Set([...$('item-list').querySelectorAll('details[open]')].map(el=>el.dataset.item));
 $('item-list').innerHTML=visible.map(row=>{
  const guide=guideFor(row);
  const wiki=row.englishName?'https://blasphemous.wiki.gg/wiki/'+encodeURIComponent(row.englishName.replaceAll(' ','_')):'https://blasphemous.wiki.gg/wiki/Children_of_Moonlight';
  return '<article class="item-row"><div><div class="item-header"><span class="category-name">'+esc(GROUPS[row.group])+'</span><span class="item-code">'+esc(row.id)+'</span></div><h3>'+esc(row.name)+'</h3>'+(spoilers?'<p class="item-location">'+locationHTML(row)+'</p>':'')+(row.description?'<p class="item-description">'+esc(row.description)+'</p>':'')+(spoilers?'<details class="item-guide" data-item="'+esc(row.id)+'" '+(openItems.has(row.id)?'open':'')+'><summary>Requisitos y cómo encontrarlo</summary>'+accessHTML(row,true)+(row.proof?'<p class="verification-proof"><strong>Prueba de la partida:</strong> '+esc(row.proof.text)+'</p>':'')+(guide?'<p>'+esc(guide)+'</p>':'<p>Consulta la guía para los detalles del objeto.</p>')+'<a href="'+wiki+'" target="_blank" rel="noopener noreferrer">Consultar objeto ↗</a></details>':'')+'</div><div class="item-side"><span class="state '+row.status+'">'+esc(STATUS_LABEL[row.status])+'</span>'+accessHTML(row)+(row.equipped?'<span class="equipped">Equipado</span>':'')+'<label class="track-label"><input type="checkbox" data-track="'+esc(row.id)+'" aria-label="Seguir '+esc(row.name)+'" '+(tracked.has(row.id)?'checked':'')+'> Seguir</label>'+(spoilers&&MAP_DATA.positions[row.id]?.length?'<button class="text-button locate-item" data-map-item="'+esc(row.id)+'">Ver en mapa</button>':'')+'</div></article>';
 }).join('');
 renderMap();renderQuests();
}
$('item-list').addEventListener('change',e=>{const id=e.target.dataset.track;if(!id)return;e.target.checked?tracked.add(id):tracked.delete(id);saveTracking();if($('tracked-only').checked)render();else renderMap();});
$('item-list').addEventListener('click',e=>{const button=e.target.closest('[data-map-item]');if(button)focusMapItem(button.dataset.mapItem);});
$('item-list').addEventListener('click',e=>{const button=e.target.closest('[data-detail-locate]');if(button)focusMapItem(button.dataset.detailLocate,true);});
function clearFilters(){for(const id of ['category','access-filter','map-area'])$(id).value='all';$('status').value='pending';$('search').value='';$('tracked-only').checked=false;render();tell('Filtros de la lista restablecidos. Tus capas del mapa se conservan.');}
$('clear-filters').addEventListener('click',clearFilters);$('empty-clear').addEventListener('click',clearFilters);
$('track-root').addEventListener('change',e=>{e.target.checked?tracked.add('RE10'):tracked.delete('RE10');saveTracking();render();});
$('filters').addEventListener('submit',e=>e.preventDefault());$('filters').addEventListener('input',render);$('spoilers').addEventListener('change',render);
$('track-visible').addEventListener('click',()=>{for(const row of visible)if(row.status!=='obtained')tracked.add(row.id);saveTracking();render();});
$('untrack-visible').addEventListener('click',()=>{for(const row of visible)tracked.delete(row.id);saveTracking();render();});
async function readFile(file){if(!file)return;if(file.size>30*1024*1024){tell('El archivo supera los 30 MB.',true);return;}try{const text=await file.text();decodeSave(text);stopLive(false);acceptText(text,file.name);}catch(e){tell(readError(e),true);}}
$('save-file').addEventListener('change',async e=>{await readFile(e.target.files[0]);e.target.value='';});
for(const type of ['dragenter','dragover'])$('drop-target').addEventListener(type,e=>{e.preventDefault();$('drop-target').classList.add('drag');});
$('drop-target').addEventListener('dragleave',()=>$('drop-target').classList.remove('drag'));
$('drop-target').addEventListener('drop',e=>{e.preventDefault();$('drop-target').classList.remove('drag');readFile(e.dataTransfer.files[0]);});
$('demo').addEventListener('click',()=>{stopLive(false);const flags=Object.fromEntries(Array.from({length:38},(_,i)=>['RESCUED_CHERUB_'+String(i+1).padStart(2,'0'),i<12]));acceptText(JSON.stringify({commonElements:{ID_INVENTORY:{ownRellics:['RE01','RE07'],ownQuestItems:['QI13'],ownBeads:['RB01'],ownPrayers:['PR14'],ownSwords:[],ownCollectibleItems:['CO01']},ID_EVENT_MANAGER:{flags},ID_PERSISTENT_MANAGER:{Percent:35.2,Time:18000,IsNewGamePlus:false}}}),'ejemplo.save','demo');});
function readError(error){if(error.name==='NotAllowedError')return 'El navegador ya no permite leer la carpeta. Desconecta y vuelve a conectarla.';if(error.name==='NotFoundError')return 'No se encuentra el archivo seleccionado. Comprueba que la carpeta y la ranura siguen disponibles.';if(error.name==='NotReadableError')return 'El archivo no se puede leer en este momento. Espera a que el juego termine de guardar.';return error instanceof DOMException?'No se pudo acceder al archivo. Vuelve a seleccionar la carpeta de guardados.':error.message||'No se pudo leer el guardado. Vuelve a intentarlo.';}
function stopLive(announce=true){generation++;if(liveTimer)clearTimeout(liveTimer);liveTimer=null;liveDirectory=null;liveText='';$('live-bar').hidden=true;$('live-start').disabled=false;if(announce)tell('Modo en vivo desconectado. Se muestra la última lectura.');}
async function scanDirectory(handle){const saves=[];for await(const [name,entry]of handle.entries()){if(entry.kind==='file'&&/^savegame_[012]\.save$/i.test(name)){const file=await entry.getFile();saves.push({name,modified:file.lastModified});}}return saves.sort((a,b)=>b.modified-a.modified);}
async function pollLive(token){
 if(token!==generation||!liveDirectory)return;
 const slot=$('live-slot').value;
 try{const handle=await liveDirectory.getFileHandle(slot);const file=await handle.getFile();if(file.size>30*1024*1024)throw new Error('El archivo supera los 30 MB.');const text=await file.text();if(token!==generation||slot!==$('live-slot').value)return;if(text!==liveText){acceptText(text,slot,'live');liveText=text;}$('live-state').textContent='Leyendo la carpeta · cada 3 s';$('live-detail').textContent='Última comprobación: '+new Date().toLocaleTimeString('es-ES')+' · Archivo actualizado: '+new Date(file.lastModified).toLocaleString('es-ES');$('live-bar').classList.remove('stale');}
 catch(e){if(token!==generation)return;$('live-state').textContent='Lectura pendiente · último resultado conservado';$('live-detail').textContent=readError(e)+(e.name==='NotAllowedError'?'':' Se volverá a comprobar en 3 segundos.');$('live-bar').classList.add('stale');}
 finally{if(token===generation&&liveDirectory)liveTimer=setTimeout(()=>pollLive(token),3000);}
}
$('live-start').addEventListener('click',async()=>{
 if(!('showDirectoryPicker'in window)){tell('El modo en vivo requiere Chrome o Edge en una conexión segura (HTTPS o localhost). Puedes cargar archivos manualmente en este navegador.',true);return;}
 if(busy)return;busy=true;$('live-start').disabled=true;
 try{const directory=await window.showDirectoryPicker({id:'blasphemous-save-folder',mode:'read'});const saves=await scanDirectory(directory);if(!saves.length)throw new Error('Selecciona la carpeta numérica que contiene savegame_0.save, 1 o 2, dentro de Savegames.');stopLive(false);liveDirectory=directory;$('live-slot').replaceChildren(...saves.map(s=>new Option(s.name,s.name)));$('live-bar').hidden=false;liveText='';tell('Carpeta conectada. Leyendo el último guardado…');await pollLive(generation);}
 catch(e){if(e.name!=='AbortError')tell(e.name==='SecurityError'?'Abre la web en una pestaña propia de Chrome o Edge para dar acceso a la carpeta. En el panel integrado puede estar restringido.':readError(e),true);}
 finally{busy=false;$('live-start').disabled=false;}
});
$('live-stop').addEventListener('click',()=>stopLive());
$('live-slot').addEventListener('change',()=>{generation++;clearTimeout(liveTimer);liveText='';pollLive(generation);});
function reportText(){
 const spoilers=$('spoilers').checked,lines=['DIARIO DE CVSTODIA — '+(demoMode?'EJEMPLO FICTICIO':fileName),$('summary-title').textContent,$('save-meta').textContent,'','PRÓXIMO PASO — RAÍCES',current.rootNext,'','OBJETOS CON LOS FILTROS ACTUALES ('+visible.length+')'];
 for(const row of visible){const a=accessibility.items.get(row.id),p=COMMUNICATION.itemPresentation(row,a,accessibility.context);
  lines.push('','['+STATUS_LABEL[row.status]+' · '+ACCESS_LABEL[a.state]+'] '+row.name+(tracked.has(row.id)?' — SIGUIENDO':'')+(prefs.showIDs?' ('+row.id+')':''));
  if(spoilers){lines.push('Zona: '+row.area+(prefs.showIDs&&row.room?' · Sala '+row.room:''));if(p.next)lines.push('Qué hacer ahora: '+p.next);for(const r of p.requirements)lines.push((r.optional?'Alternativa: ':'Reliquia: ')+r.name+' — '+r.status+'. '+r.action+' '+(r.owned?r.instruction:r.obtain));for(const reason of p.reasons)lines.push('• '+reason);if(p.note)lines.push(p.note);}
 }
 lines.push('','MISIONES');for(const q of analyzeQuests(analysisData,current)){lines.push('['+QUEST_LABELS[q.state]+'] '+q.name);if(spoilers){lines.push(q.next);for(const s of q.steps)lines.push((s.value===true?'✓ ':s.value===false?'Pendiente: ':'Sin confirmar: ')+s.label);}}
 lines.push('','La posesión y el acceso se comprueban por separado. Los objetos se verifican también mediante sus recogidas, entregas y transformaciones. El acceso se estima para un recorrido normal y con los requisitos detectados. Este informe no modifica el guardado.');return lines.join('\n');
}
$('export').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([reportText()],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='cvstodia-'+fileName.replace(/[^a-zA-Z0-9_.-]/g,'_')+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
if(!('showDirectoryPicker'in window))$('live-start').title='Disponible en Chrome o Edge por HTTPS o localhost';
function renderQuests(){
 const quests=analyzeQuests(analysisData,current),filter=$('quest-filter').value,openQuests=new Set([...$('quest-list').querySelectorAll('details[open]')].map(el=>el.dataset.quest));
 $('quest-summary').textContent=quests.filter(q=>q.state==='completed').length+'/'+quests.length+' completadas · '+(progressSource==='game'?'eventos del juego en directo':'datos del guardado');
 const shown=quests.filter(q=>filter==='all'||filter==='pending'&&q.state!=='completed'||q.state===filter);
 $('quest-list').innerHTML=shown.length?shown.map(q=>'<details class="quest-row" data-quest="'+esc(q.id)+'" '+(openQuests.has(q.id)?'open':'')+'><summary><span>'+esc(q.name)+'</span><span class="state '+(q.state==='completed'?'obtained':q.state==='unknown'?'unknown':'missing')+'">'+esc(QUEST_LABELS[q.state])+'</span></summary><p class="next-action">'+esc(q.next)+'</p>'+(q.note?'<p class="muted">'+esc(q.note)+'</p>':'')+'<ol class="quest-steps">'+q.steps.map(s=>'<li><span class="step-state">'+(s.value===true?'✓ Confirmado':s.value===false?'Pendiente':'Sin confirmar')+'</span><span>'+esc(s.label)+'</span><small>'+esc(s.proof)+'</small></li>').join('')+'</ol>'+(q.url?'<a href="https://blasphemous.wiki.gg/wiki/'+encodeURIComponent(q.url)+'" target="_blank" rel="noopener noreferrer">Guía de la misión ↗</a>':'')+'</details>').join(''):'<p class="muted">No hay misiones con este filtro.</p>';
}
$('quest-filter').addEventListener('change',()=>{if(current)renderQuests();});
