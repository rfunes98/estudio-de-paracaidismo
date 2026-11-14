import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { sameAnswer, createExam, grade, filterBank, randomInt, shuffle, signature } from '../core.js';
import { topics } from '../data/catalog.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const bank=JSON.parse(fs.readFileSync('dist/data/questions.json','utf8'));
test('las respuestas múltiples requieren coincidencia exacta y no dependen del orden',()=>{
 assert.ok(sameAnswer([3,0,2],[0,2,3]));assert.ok(!sameAnswer([0,2],[0,2,3]));assert.ok(!sameAnswer([0,1,2,3],[0,2,3]));
});
test('cada examen mantiene preguntas únicas y todas las opciones al mezclarlas',()=>{
 const recent=[];
 for(let i=0;i<100;i++){
  const entries=createExam(bank,20,recent);assert.equal(entries.length,20);assert.equal(new Set(entries.map(e=>e.id)).size,20);
  assert.ok(!recent.includes(signature(entries)));recent.push(signature(entries));
  for(const e of entries){const q=bank.find(q=>q.id===e.id);assert.deepEqual([...e.order].sort((a,b)=>a-b),q.options.map((_,i)=>i));}
 }
});
test('mezclar opciones mantiene la corrección lógica y los blancos puntúan cero',()=>{
 const entries=createExam(bank,bank.length),answers=Object.fromEntries(bank.map(q=>[q.id,[...q.correct].reverse()]));
 assert.ok(grade(entries,answers,bank).every(r=>r.correct));assert.ok(grade(entries,{},bank).every(r=>!r.correct));
});
test('no se acepta una combinación reciente incluso si el generador la repite',()=>{
 const fixed=max=>max-1,one=createExam(bank,2,[],fixed);
 assert.throws(()=>createExam(bank,2,[signature(one)],fixed),/combinación nueva/);
});
test('el filtro combina módulo, tema y errores sin alterar el banco',()=>{
 const subset=bank.filter(q=>q.module==='III'&&q.topic==='anormalidades');
 assert.deepEqual(filterBank(bank,'III','anormalidades',subset.slice(0,2).map(q=>q.id)),subset.slice(0,2));
 assert.equal(filterBank(bank,'I','anormalidades').length,0);assert.equal(filterBank(bank,'','',[]).length,0);
});
test('muestreo criptográfico rechaza el tramo sesgado',()=>{
 let calls=0;const values=[0xffffffff,7];const source={getRandomValues(a){a[0]=values[calls++];}};
 assert.equal(randomInt(10,source),7);assert.equal(calls,2);assert.throws(()=>randomInt(0));assert.deepEqual(shuffle([],()=>0),[]);
});
test('manual, preguntas e imágenes tienen referencias válidas',()=>{
 const manual=JSON.parse(fs.readFileSync('dist/data/manual.json','utf8'));
 assert.equal(manual.pages.length,78);assert.equal(bank.length,60);assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
 for(const topic of topics)assert.ok(bank.some(q=>q.topic===topic.id),`Sin preguntas: ${topic.id}`);
 for(const q of bank){assert.ok(q.correct.length>0);assert.ok(q.correct.every(i=>i>=0&&i<q.options.length));assert.ok(q.page>0&&q.page<=78);for(const src of q.images)assert.ok(fs.existsSync('dist/'+src));}
 for(const p of manual.pages){assert.ok(!p.html.includes('\ufffd'));for(const src of p.images)assert.ok(fs.existsSync('dist/'+src));}
});
