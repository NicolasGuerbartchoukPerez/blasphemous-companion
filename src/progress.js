let progressTimer=null,progressGeneration=0,progressSignature='',progressSource='save';
function progressFeedback(message){$('progress-note').textContent=message;}
function stopProgress(restore=true){progressGeneration++;clearTimeout(progressTimer);progressTimer=null;progressSignature='';progressSource='save';
 if(restore&&saveData&&current){current=analyze(saveData,CATALOG);refreshAccessibility(saveData);updateProgressSummary();render();}
}
async function pollProgress(token){
 if(token!==progressGeneration||!$('progress-enabled').checked||!current||demoMode)return;
 try{
  const payload=await localRequest('/local/state');if(token!==progressGeneration)return;
  const data=validateLiveState(payload,saveData,fileName),signature=JSON.stringify([payload.pid,payload.slot,payload.inventory,payload.events]);
  progressSource='game';
  if(signature!==progressSignature){progressSignature=signature;current=analyze(data,CATALOG);refreshAccessibility(data);updateProgressSummary();render();}
  progressFeedback('Inventario y misiones leídos del juego · '+new Date().toLocaleTimeString('es-ES')+'. Las recogidas de salas, habilidades y lágrimas se confirman al guardar.');
 }catch(error){if(token!==progressGeneration)return;if(progressSource==='game'){progressSource='save';progressSignature='';current=analyze(saveData,CATALOG);refreshAccessibility(saveData);updateProgressSummary();render();}progressFeedback(error.message+' Se muestra el último archivo cargado.');}
 finally{if(token===progressGeneration&&$('progress-enabled').checked)progressTimer=setTimeout(()=>pollProgress(token),1200);}
}
function startProgress(){stopProgress(false);if(!$('progress-enabled').checked||!current||demoMode){progressFeedback(demoMode?'El ejemplo no se conecta al juego.':'Inventario y misiones del último guardado cargado.');return;}if(!LOCAL_RUNTIME){progressFeedback('La lectura del juego requiere abrir DiarioDeCvstodia.exe. Los archivos se pueden analizar aquí sin lector.');return;}progressFeedback('Comprobando que el juego y el guardado sean la misma partida…');pollProgress(progressGeneration);}
function updateProgressSummary(){$('root-next').textContent=current.rootNext;$('summary-title').textContent=current.relicCount+'/7 reliquias · '+current.rescued+(current.cherubsKnown?'/38':' confirmados')+' querubines';}
$('progress-enabled').addEventListener('change',()=>{$('progress-enabled').checked?startProgress():stopProgress();if(!$('progress-enabled').checked)progressFeedback('Lectura del juego desconectada. Se muestra el guardado cargado.');});
window.addEventListener('pagehide',()=>stopProgress(false));
