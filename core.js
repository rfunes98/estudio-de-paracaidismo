export function sameAnswer(chosen, correct) {
  return chosen.length === correct.length && [...chosen].sort((a,b)=>a-b).every((x,i)=>x === [...correct].sort((a,b)=>a-b)[i]);
}
export function randomInt(max, cryptoSource = globalThis.crypto) {
  if (!Number.isInteger(max) || max < 1 || max > 0x100000000) throw new RangeError('Rango inválido');
  const limit = 0x100000000 - (0x100000000 % max);
  const bytes = new Uint32Array(1);
  do { cryptoSource.getRandomValues(bytes); } while(bytes[0] >= limit);
  return bytes[0] % max;
}
export function shuffle(items, rand = randomInt) {
  const result = [...items];
  for (let i=result.length-1;i>0;i--) { const j=rand(i+1); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function signature(entries) {
  return entries.map(e => `${e.id}:${e.order.join(',')}`).join('|');
}
export function createExam(bank, count, recent = [], rand = randomInt) {
  if (!bank.length) throw new Error('No hay preguntas');
  count = Math.max(1,Math.min(Number(count)||20,bank.length));
  for(let attempt=0;attempt<128;attempt++) {
    const entries=shuffle(bank,rand).slice(0,count).map(q=>({id:q.id,order:shuffle(q.options.map((_,i)=>i),rand)}));
    if (!recent.includes(signature(entries))) return entries;
  }
  throw new Error('No se pudo generar una combinación nueva. Inténtalo otra vez.');
}
export function grade(entries, answers, bank) {
  const byId=new Map(bank.map(q=>[q.id,q]));
  return entries.map(e=>({id:e.id,chosen:answers[e.id]||[],correct:sameAnswer(answers[e.id]||[],byId.get(e.id).correct)}));
}
export function filterBank(bank, module='', topic='', wrongIds=null) {
  return bank.filter(q=>(!module||q.module===module)&&(!topic||q.topic===topic)&&(!wrongIds||wrongIds.includes(q.id)));
}
export function pageTopic(page, topics) {
  // Page 67 opens chapter 11 after finishing chapter 10.
  return [...topics].reverse().find(t=>page>=t.start&&page<=t.end);
}
