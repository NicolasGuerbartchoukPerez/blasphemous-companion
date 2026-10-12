import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractMapCells,markersFor,boundsFor} from '../map-model.mjs';
const mapData=JSON.parse(fs.readFileSync(new URL('../map-data.json',import.meta.url)));
const catalog=JSON.parse(fs.readFileSync(new URL('../catalog.json',import.meta.url)));
test('lee solo el mapa activo, filtra casillas inválidas y duplicadas',()=>{
 const data={commonElements:{ID_NEW_MAPS:{currentMapId:'CvstodiaDLC3',Maps:{Cvstodia:{RevealedCells:[{X:1,Y:1}]},CvstodiaDLC3:{RevealedCells:[{X:23,Y:37},{X:23,Y:37},{X:'3',Y:4},{X:0,Y:null},{X:1001,Y:2}]}}}}};
 assert.deepEqual(extractMapCells(data),{id:'CvstodiaDLC3',cells:[{x:23,y:37}]});
 assert.deepEqual(extractMapCells({}),{id:null,cells:[]});
 delete data.commonElements.ID_NEW_MAPS.currentMapId;assert.equal(extractMapCells(data).id,'CvstodiaDLC3');
});
test('agrupa objetos de una casilla y no inventa marcadores sin coordenadas',()=>{
 const rows=[{id:'a'},{id:'b'},{id:'c'}];
 assert.deepEqual(markersFor(rows,{a:[{x:1,y:2},{x:1,y:2}],b:[{x:1,y:2}],c:[]}),[{key:'1:2',x:1,y:2,rows:[rows[0],rows[1]]}]);
 assert.equal(markersFor([rows[1]],{a:[{x:1,y:2}]}).length,0);
});
test('convierte el eje vertical del juego al del SVG',()=>{
 assert.deepEqual(boundsFor([{x:10,y:40},{x:20,y:30}],2),{x:8,y:-42,width:14,height:14});
 assert.ok(boundsFor([]).width>0);
});
test('cobertura de 217 objetos y posiciones de los pasos de raíces',()=>{
 const ids=new Set(catalog.map(r=>r.id));assert.equal(Object.keys(mapData.positions).length,217);
 for(const [id,points] of Object.entries(mapData.positions)){assert.ok(ids.has(id));assert.ok(points.length);for(const p of points){assert.ok(Number.isInteger(p.x));assert.ok(Number.isInteger(p.y));}}
 assert.deepEqual(mapData.positions.RE10,[{x:30,y:41}]);
 assert.deepEqual(mapData.positions.QI14,[{x:23,y:37}]);
 assert.deepEqual(mapData.positions.QI13,[{x:22,y:16}]);
});
