import http from 'node:http';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

// Servidor local de desarrollo: sirve dist/index.html y, si existe, el lector de posición.
// Escucha solo en 127.0.0.1. El puerto no cambia solo a propósito: el navegador guarda el
// seguimiento por dirección y puerto, así que moverse a otro puerto lo dejaría "vacío".
const SECURITY_HEADERS={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin'};

export function createServer({root=new URL('./dist/',import.meta.url)}={}){
 const send=(res,status,type,body,extra={})=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store',...SECURITY_HEADERS,...extra});res.end(body);};
 return http.createServer((req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'text/plain; charset=utf-8','Método no permitido',{Allow:'GET, HEAD'});
  let path;try{path=decodeURIComponent((req.url??'/').split('?')[0].split('#')[0]);}catch{return send(res,400,'text/plain; charset=utf-8','Dirección no válida');}
  const head=req.method==='HEAD';
  const serve=(name,type,extra)=>{
   let body;try{body=fs.readFileSync(new URL(name,root));}catch{return send(res,name==='index.html'?503:404,'text/plain; charset=utf-8',name==='index.html'?'Falta dist/index.html. Ejecuta «npm run build» y recarga.':'No encontrado');}
   send(res,200,type,head?'':body,{'Content-Length':body.length,...extra});
  };
  if(path==='/'||path==='/index.html')return serve('index.html','text/html; charset=utf-8');
  if(path==='/downloads/lector-posicion.zip')return serve('downloads/lector-posicion.zip','application/zip',{'Content-Disposition':'attachment; filename="lector-posicion.zip"'});
  return send(res,404,'text/plain; charset=utf-8','No encontrado');
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT??8765);
 if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT no es un puerto válido: '+process.env.PORT);process.exit(1);}
 const server=createServer();
 server.on('error',error=>{
  if(error.code==='EADDRINUSE')console.error('El puerto '+port+' ya está en uso. Si es esta misma aplicación, ábrela en http://127.0.0.1:'+port+'. Para usar otro puerto: PORT=8766 npm start (el seguimiento guardado en el navegador depende del puerto; guarda una copia en «Personalizar mapa y vista → Guardar copia de seguridad» y restáurala en el nuevo puerto).');
  else console.error(error.message);
  process.exit(1);
 });
 server.listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
}
