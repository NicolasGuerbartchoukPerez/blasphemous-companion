// Copia de seguridad del seguimiento y la configuración que la aplicación guarda en el navegador.
// El almacenamiento local pertenece a un origen concreto (dirección + puerto): cambiar de puerto o
// borrar los datos del sitio lo vacía, así que conviene poder guardarlo y recuperarlo en un archivo.
export const BACKUP_APP='diario-de-cvstodia';
export const BACKUP_FORMAT=1;
export const BACKUP_PREFIX='cvstodia:';
export const SETTINGS_KEY='cvstodia:settings:v2';
export const MAX_BACKUP_BYTES=2_000_000;
const MAX_VALUE_CHARS=200_000;
const PROFILE_KEY=/^cvstodia:v1:[^\u0000-\u001f]{1,300}$/;

const isStringList=v=>Array.isArray(v)&&v.every(x=>typeof x==='string'&&x.length<=64);
const isPlainObject=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

// Qué se guarda: configuración y listas de seguimiento. El filtro de misiones es una comodidad
// de la pestaña y no se incluye.
export function isBackupKey(key){return key===SETTINGS_KEY||PROFILE_KEY.test(key);}

export function createBackup(entries,now=new Date()){
 const out={};
 for(const [key,value] of entries){if(typeof key==='string'&&typeof value==='string'&&isBackupKey(key))out[key]=value;}
 return {app:BACKUP_APP,format:BACKUP_FORMAT,exportedAt:now.toISOString(),entries:out};
}

// Valida un archivo de copia antes de tocar nada. Devuelve las entradas aceptadas y cuántas se descartaron.
export function parseBackup(text){
 if(typeof text!=='string'||!text.trim())return {ok:false,error:'El archivo está vacío.'};
 if(text.length>MAX_BACKUP_BYTES)return {ok:false,error:'El archivo es demasiado grande para ser una copia de la aplicación.'};
 let raw;try{raw=JSON.parse(text);}catch{return {ok:false,error:'El archivo no es JSON válido.'};}
 if(!isPlainObject(raw)||raw.app!==BACKUP_APP)return {ok:false,error:'No es una copia de seguridad del Diario de Cvstodia.'};
 if(!Number.isInteger(raw.format)||raw.format<1||raw.format>BACKUP_FORMAT)return {ok:false,error:'La copia procede de una versión más reciente de la aplicación.'};
 if(!isPlainObject(raw.entries))return {ok:false,error:'La copia no contiene datos.'};
 const entries={};let skipped=0;
 for(const [key,value] of Object.entries(raw.entries)){
  if(!isBackupKey(key)||typeof value!=='string'||value.length>MAX_VALUE_CHARS){skipped++;continue;}
  let parsed;try{parsed=JSON.parse(value);}catch{skipped++;continue;}
  if(key===SETTINGS_KEY?isPlainObject(parsed):isStringList(parsed))entries[key]=value;else skipped++;
 }
 return {ok:true,entries,skipped,exportedAt:typeof raw.exportedAt==='string'?raw.exportedAt:''};
}

// Qué escribir al restaurar sin perder lo que ya hay: las listas se unen (lo seguido en la copia y
// lo seguido ahora) y la configuración de la copia sustituye a la actual.
export function planRestore(backupEntries,existing){
 const writes={};
 for(const [key,value] of Object.entries(backupEntries)){
  if(key===SETTINGS_KEY){writes[key]=value;continue;}
  let current=[];try{const p=JSON.parse(existing[key]??'[]');if(isStringList(p))current=p;}catch{/* lista ilegible: se parte de la copia */}
  writes[key]=JSON.stringify([...new Set([...current,...JSON.parse(value)])]);
 }
 return writes;
}

export function backupSummary(entries){
 const keys=Object.keys(entries),lists=keys.filter(k=>k!==SETTINGS_KEY);
 return {settings:keys.includes(SETTINGS_KEY),profiles:lists.filter(k=>!k.endsWith(':quests')).length,questLists:lists.filter(k=>k.endsWith(':quests')).length};
}
