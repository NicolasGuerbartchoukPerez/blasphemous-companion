const DEFAULT_PREFS={geometry:'full',specialCells:true,specialOnlyUnexplored:true,art:true,labels:false,services:true,barriers:true,itemBarriers:false,barrierOnlyMissing:true,markerStyle:'game',markerSize:6,unexploredOpacity:55,showList:true,showPriority:true,showQuests:true,showAcquired:false,available:true,blocked:true,unknown:true,showNg:false,equipmentOnly:false,showPersonalPins:true,compact:false,showIDs:false,colors:'standard',categories:['relics','bones','cherubs','beads','prayers','hearts','upgrades','quest'],relicLayers:['RE01','RE03','RE04','RE05','RE07','RE10']};
function sanitizePrefs(raw={}){
 const out=structuredClone(DEFAULT_PREFS);
 for(const key of Object.keys(out)){
  const v=raw[key];if(typeof out[key]==='boolean'&&typeof v==='boolean')out[key]=v;
  if(Array.isArray(out[key])&&Array.isArray(v))out[key]=[...new Set(v.filter(x=>DEFAULT_PREFS[key].includes(x)))];
 }
 for(const [k,options]of Object.entries({geometry:['full','explored'],markerStyle:['game','dots'],colors:['standard','contrast']}))if(options.includes(raw[k]))out[k]=raw[k];
 for(const [k,min,max]of [['markerSize',4,10],['unexploredOpacity',10,100]])if(Number.isFinite(raw[k]))out[k]=Math.max(min,Math.min(max,raw[k]));
 return out;
}
let prefs=(()=>{try{return sanitizePrefs(JSON.parse(localStorage.getItem('cvstodia:settings:v2')??'{}'));}catch{return sanitizePrefs();}})();
function persistPrefs(){try{localStorage.setItem('cvstodia:settings:v2',JSON.stringify(prefs));}catch{if(typeof tell==='function')tell('El navegador no permite conservar la configuración. Tus cambios se mantienen durante esta sesión.');}}
function syncPrefs(){for(const el of document.querySelectorAll('[data-pref]')){const key=el.dataset.pref;if(el.dataset.value)el.checked=prefs[key].includes(el.dataset.value);else if(el.type==='checkbox')el.checked=prefs[key];else el.value=prefs[key];}}
function applyPrefs(){document.body.classList.toggle('compact',prefs.compact);document.body.classList.toggle('show-ids',prefs.showIDs);document.body.classList.toggle('high-contrast',prefs.colors==='contrast');document.querySelector('.priority').hidden=!prefs.showPriority;document.getElementById('quest-panel').hidden=!prefs.showQuests;document.getElementById('item-list').hidden=!prefs.showList;syncPrefs();}
document.getElementById('map-settings').addEventListener('change',e=>{
 const key=e.target.dataset.pref;if(!key)return;
 if(e.target.dataset.value){const set=new Set(prefs[key]);e.target.checked?set.add(e.target.dataset.value):set.delete(e.target.dataset.value);prefs[key]=[...set];}
 else prefs[key]=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value):e.target.value;
 prefs=sanitizePrefs(prefs);if(key==='showAcquired'&&prefs.showAcquired)document.getElementById('status').value='all';persistPrefs();applyPrefs();if(current){refreshAccessibility();render();}
});
document.getElementById('settings-reset').addEventListener('click',()=>{prefs=sanitizePrefs();persistPrefs();applyPrefs();if(current){refreshAccessibility();render();}});
document.getElementById('map-preset').addEventListener('change',e=>{
 const p=e.target.value;if(p==='game')Object.assign(prefs,{geometry:'explored',art:true,labels:false,services:true,barriers:false,itemBarriers:false,showAcquired:false,markerStyle:'game'});
 if(p==='search')Object.assign(prefs,{geometry:'full',art:true,labels:true,services:true,barriers:true,itemBarriers:false,available:true,blocked:false,unknown:false,showAcquired:false,markerStyle:'dots'});
 if(p==='relics')Object.assign(prefs,{geometry:'full',barriers:true,itemBarriers:true,barrierOnlyMissing:true,available:true,blocked:true,unknown:true,categories:['relics','quest'],markerStyle:'game'});
 if(p==='all')prefs=sanitizePrefs();
 persistPrefs();applyPrefs();if(current){refreshAccessibility();render();}e.target.value='custom';
});
document.getElementById('settings-export').addEventListener('click',()=>downloadSettings(JSON.stringify(prefs,null,2),'cvstodia-configuracion.json'));
document.getElementById('settings-import').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>50000)throw new Error('Configuración demasiado grande');prefs=sanitizePrefs(JSON.parse(await f.text()));persistPrefs();applyPrefs();if(current){refreshAccessibility();render();}tell('Configuración importada.');}catch{tell('No se pudo importar la configuración. Selecciona el archivo JSON exportado desde esta aplicación.',true);}e.target.value='';});
function downloadSettings(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const categoryOptions=document.getElementById('category-layer-options'),relicOptions=document.getElementById('relic-layer-options');
categoryOptions.innerHTML=Object.entries(GROUPS).map(([id,name])=>'<label class="check-filter"><input type="checkbox" data-pref="categories" data-value="'+id+'"> '+name+'</label>').join('');
relicOptions.innerHTML=DEFAULT_PREFS.relicLayers.map(id=>'<label class="check-filter"><input type="checkbox" data-pref="relicLayers" data-value="'+id+'"> '+CATALOG.find(r=>r.id===id).name+'</label>').join('');
applyPrefs();
