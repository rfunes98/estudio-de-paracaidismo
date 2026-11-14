import fs from 'node:fs/promises';
import { marked } from 'marked';
import { modules, topics } from '../data/catalog.js';
import { pageTopic } from '../core.js';

const markdownName='CURSO DE PARACAIDISMO - FESAPADE_2025.md';
const pdfName='CURSO DE PARACAIDISMO - FESAPADE_2025.pdf';
const text=await fs.readFile(markdownName,'utf8');
const pages=[...text.matchAll(/<!-- Página (\d+) del PDF -->([\s\S]*?)(?=<!-- Página \d+ del PDF -->|$)/g)].map(match=>{
  const number=Number(match[1]);
  const markdown=match[2].replace(/\n---\s*$/,'').trim();
  const topic=pageTopic(number,topics);
  const module=modules.find(m=>number>=m.start&&number<=m.end)?.id||'';
  const title=markdown.match(/^#{1,4}\s+(.*)/m)?.[1].replace(/[*_]/g,'') || topic?.title || (number<9?'Presentación del manual':'Recursos y créditos');
  const images=[...markdown.matchAll(/!\[.*?\]\((.*?)\)/g)].map(m=>m[1]);
  let html=marked.parse(markdown);
  html=html.replace(/<img src="([^"]+)" alt="[^"]*"/g,(_,src)=>`<img src="${src}" alt="Ilustración del manual, página ${number-1}" loading="lazy"`);
  return {number,printed: number>1?number-1:null,title,module,topic:topic?.id||'',images,html,search:markdown.replace(/!\[.*?\]\(.*?\)/g,'').replace(/<[^>]+>|[*#_>|]/g,' ').replace(/\s+/g,' ').trim()};
});
if(pages.length!==78)throw new Error('Se esperaban 78 páginas');
let questions=JSON.parse(await fs.readFile('data/questions-original.json','utf8')).map((q,i)=>{
  const printed=Number(q.source.match(/págs?\. (\d+)/)?.[1]);
  const page=printed+1;
  const topic=pageTopic(page,topics);
  let imagePage=page;
  if(/altímetro/i.test(q.q))imagePage=24;
  if(/postura|boca abajo/.test(q.q))imagePage=33;
  if(/patrón de aterrizaje|elementos deben quedar definidos/.test(q.q))imagePage=63;
  if(/métodos A y B/.test(q.q))imagePage=39;
  if(/Tres S/.test(q.q))imagePage=37;
  return {...q,id:`q${String(i+1).padStart(3,'0')}`,page,topic:topic.id,module:topic.module,images:pages[imagePage-1].images};
});
const extra=JSON.parse(await fs.readFile('data/questions-extra.json','utf8'));
questions.push(...extra.map((q,i)=>{const topic=topics.find(t=>t.id===q.topic);return {...q,id:`extra${i+1}`,module:topic.module,source:`Manual FESAPADE 2025, pág. ${q.page-1}`,images:pages[q.imagePage ? q.imagePage-1:q.page-1].images};}));
for(const q of questions){
  if(!q.options.length||!q.correct.length||q.correct.some(i=>i<0||i>=q.options.length)||!q.explanation||!q.page)throw new Error(`Pregunta inválida ${q.id}`);
}
const dist='dist';await fs.mkdir(dist,{recursive:true});await fs.mkdir(`${dist}/data`,{recursive:true});
await fs.writeFile(`${dist}/data/manual.json`,JSON.stringify({pages,pdf:pdfName}));
await fs.writeFile(`${dist}/data/questions.json`,JSON.stringify(questions));
for(const name of ['index.html','styles.css','app.js','core.js',markdownName,pdfName])await fs.copyFile(name,`${dist}/${name}`);
await fs.copyFile('data/catalog.js',`${dist}/data/catalog.js`);
await fs.cp('curso-paracaidismo-imagenes',`${dist}/curso-paracaidismo-imagenes`,{recursive:true});
await fs.writeFile(`${dist}/.nojekyll`,'');
console.log(`Web lista: ${pages.length} páginas, ${questions.length} preguntas y ${pages.reduce((n,p)=>n+p.images.length,0)} imágenes.`);
