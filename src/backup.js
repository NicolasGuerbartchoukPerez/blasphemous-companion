// Copia de seguridad y restauración del seguimiento y la configuración (lógica en backup-model.mjs).
function localEntries(){
 const out=[];
 try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key!==null&&isBackupKey(key))out.push([key,localStorage.getItem(key)]);}}catch{/* almacenamiento no disponible */}
 return out;
}
$('backup-export').addEventListener('click',()=>{
 const backup=createBackup(localEntries()),summary=backupSummary(backup.entries);
 if(!Object.keys(backup.entries).length){tell('Todavía no hay nada que guardar: marca algún objeto o misión para seguir.',true);return;}
 const stamp=backup.exportedAt.slice(0,10);
 downloadSettings(JSON.stringify(backup,null,2),'cvstodia-copia-'+stamp+'.json');
 tell('Copia guardada: '+summary.profiles+' partida(s) con seguimiento, '+summary.questLists+' lista(s) de misiones seguidas'+(summary.settings?' y tu configuración':'')+'.');
});
$('backup-import').addEventListener('change',async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 if(file.size>MAX_BACKUP_BYTES){tell('El archivo es demasiado grande para ser una copia de la aplicación.',true);return;}
 const result=parseBackup(await file.text());
 if(!result.ok){tell(result.error,true);return;}
 const count=Object.keys(result.entries).length;
 if(!count){tell('La copia no contiene datos que se puedan restaurar.',true);return;}
 const existing=Object.fromEntries(localEntries());
 try{for(const [key,value] of Object.entries(planRestore(result.entries,existing)))localStorage.setItem(key,value);}
 catch{tell('El navegador no permite guardar la copia restaurada.',true);return;}
 prefs=(()=>{try{return sanitizePrefs(JSON.parse(localStorage.getItem(SETTINGS_KEY)??'{}'));}catch{return sanitizePrefs();}})();
 applyPrefs();
 if(current){loadTracking(profile);loadQuestTracking();updateTracking();refreshAccessibility();render();}
 const summary=backupSummary(result.entries);
 tell('Copia restaurada: '+summary.profiles+' partida(s), '+summary.questLists+' lista(s) de misiones'+(summary.settings?' y configuración':'')+'.'+(result.skipped?' Se ignoraron '+result.skipped+' datos no válidos.':''));
});
