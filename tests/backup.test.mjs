import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackup,parseBackup,planRestore,backupSummary,isBackupKey,SETTINGS_KEY,BACKUP_APP,BACKUP_FORMAT} from '../backup-model.mjs';

const P='cvstodia:v1:slot1.save:normal:save';
const sample=[[SETTINGS_KEY,'{"compact":true}'],[P,'["RE01","QI13"]'],[P+':quests','["roots"]'],['cvstodia:quest-filter:v1','all'],['otra-app:dato','["x"]'],['cvstodia:v1:x',5]];

test('la copia solo incluye claves propias válidas con valores de texto',()=>{
 const b=createBackup(sample,new Date('2026-01-02T03:04:05Z'));
 assert.equal(b.app,BACKUP_APP);assert.equal(b.format,BACKUP_FORMAT);assert.equal(b.exportedAt,'2026-01-02T03:04:05.000Z');
 assert.deepEqual(Object.keys(b.entries).sort(),[SETTINGS_KEY,P,P+':quests'].sort());
 assert.equal(isBackupKey('cvstodia:quest-filter:v1'),false);
});

test('ida y vuelta: lo exportado se importa idéntico',()=>{
 const parsed=parseBackup(JSON.stringify(createBackup(sample)));
 assert.equal(parsed.ok,true);assert.equal(parsed.skipped,0);
 assert.deepEqual(backupSummary(parsed.entries),{settings:true,profiles:1,questLists:1});
});

test('rechaza archivos que no son una copia sin tocar nada',()=>{
 for(const bad of ['','   ','no json','[]','{"app":"otra","format":1,"entries":{}}',`{"app":"${BACKUP_APP}","format":99,"entries":{}}`,`{"app":"${BACKUP_APP}","format":1}`,`{"app":"${BACKUP_APP}","format":"1","entries":{}}`]){
  assert.equal(parseBackup(bad).ok,false,JSON.stringify(bad));
 }
 assert.equal(parseBackup('x'.repeat(2_000_001)).ok,false);
});

test('descarta entradas con claves ajenas, valores que no son listas de texto o configuración que no es un objeto',()=>{
 const text=JSON.stringify({app:BACKUP_APP,format:1,entries:{
  [P]:'["RE01"]',
  [P+':quests']:'[1,2]',
  [SETTINGS_KEY]:'[1]',
  'cvstodia:v1:a\nb':'["x"]',
  'localStorage':'["x"]',
  'cvstodia:v1:roto':'{no',
  'cvstodia:v1:largo':JSON.stringify(['x'.repeat(65)]),
  'cvstodia:v1:objeto':'{"a":1}',
  'cvstodia:v1:numero':5
 }});
 const r=parseBackup(text);
 assert.equal(r.ok,true);assert.deepEqual(Object.keys(r.entries),[P]);assert.equal(r.skipped,8);
});

test('un valor demasiado largo no se acepta',()=>{
 const r=parseBackup(JSON.stringify({app:BACKUP_APP,format:1,entries:{[P]:JSON.stringify(Array(30000).fill('abcdefgh'))}}));
 assert.equal(r.ok,true);assert.deepEqual(r.entries,{});assert.equal(r.skipped,1);
});

test('no se contamina el prototipo con claves especiales',()=>{
 const r=parseBackup('{"app":"'+BACKUP_APP+'","format":1,"entries":{"__proto__":"[]","constructor":"[]"}}');
 assert.equal(r.ok,true);assert.deepEqual(r.entries,{});assert.equal({}.polluted,undefined);
});

test('restaurar une las listas con lo que ya hay y sustituye la configuración',()=>{
 const plan=planRestore({[P]:'["RE01","QI13"]',[SETTINGS_KEY]:'{"compact":true}'},{[P]:'["QI13","BC05"]',[SETTINGS_KEY]:'{"compact":false}'});
 assert.deepEqual(JSON.parse(plan[P]).sort(),['BC05','QI13','RE01']);
 assert.equal(plan[SETTINGS_KEY],'{"compact":true}');
 assert.deepEqual(JSON.parse(planRestore({[P]:'["A"]'},{[P]:'roto'})[P]),['A']);
 assert.deepEqual(JSON.parse(planRestore({[P]:'["A"]'},{})[P]),['A']);
});
