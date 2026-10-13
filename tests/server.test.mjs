import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from '../server.mjs';

function withServer(files,run){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cvstodia-'));
 for(const [name,content] of Object.entries(files)){fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});fs.writeFileSync(path.join(dir,name),content);}
 const server=createServer({root:pathToFileURL(dir+path.sep)});
 return new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',async()=>{
  try{await run('http://127.0.0.1:'+server.address().port);resolve();}catch(e){reject(e);}finally{server.close();fs.rmSync(dir,{recursive:true,force:true});}
 }));
}

test('sirve la aplicación con cabeceras de seguridad y sin caché',()=>withServer({'index.html':'<h1>hola</h1>'},async base=>{
 for(const p of ['/','/index.html','/?x=1','/#a']){const r=await fetch(base+p);assert.equal(r.status,200,p);assert.equal(await r.text(),'<h1>hola</h1>');}
 const r=await fetch(base+'/');
 assert.match(r.headers.get('content-type'),/text\/html/);assert.equal(r.headers.get('cache-control'),'no-store');
 assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('referrer-policy'),'no-referrer');
}));

test('HEAD no devuelve cuerpo y otros métodos se rechazan',()=>withServer({'index.html':'abc'},async base=>{
 const h=await fetch(base+'/',{method:'HEAD'});assert.equal(h.status,200);assert.equal(h.headers.get('content-length'),'3');assert.equal(await h.text(),'');
 const p=await fetch(base+'/',{method:'POST',body:'x'});assert.equal(p.status,405);assert.equal(p.headers.get('allow'),'GET, HEAD');
}));

test('rutas desconocidas o con intento de salir de la carpeta dan 404 o 400',()=>withServer({'index.html':'a'},async base=>{
 assert.equal((await fetch(base+'/server.mjs')).status,404);
 assert.equal((await fetch(base+'/..%2fserver.mjs')).status,404);
 assert.equal((await fetch(base+'/%E0%A4%A')).status,400);
}));

test('sin dist avisa con 503 y la descarga ausente da 404',()=>withServer({},async base=>{
 const r=await fetch(base+'/');assert.equal(r.status,503);assert.match(await r.text(),/npm run build/);
 assert.equal((await fetch(base+'/downloads/lector-posicion.zip')).status,404);
}));

test('la descarga del lector se sirve como archivo adjunto',()=>withServer({'index.html':'a','downloads/lector-posicion.zip':'PK'},async base=>{
 const r=await fetch(base+'/downloads/lector-posicion.zip');
 assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'application/zip');assert.match(r.headers.get('content-disposition'),/attachment/);
}));
