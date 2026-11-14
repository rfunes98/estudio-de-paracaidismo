import { modules, topics, practical } from './data/catalog.js';
import { createExam, filterBank, grade, sameAnswer, signature } from './core.js';

const icons={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  book:'<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v15"/>',
  layers:'<path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m9 13 2 2 4-5M9 19h6"/>',
  chart:'<path d="M3 3v18h18M7 16v-5m5 5V7m5 9V4"/>',
  canopy:'<path d="M2 12a10 10 0 0 1 20 0H2Zm0 0 10 10 10-10M12 2v20M7 12C7 6 9 2 12 2s5 4 5 10"/>',
  plane:'<path d="m22 2-7 20-4-9-9-4L22 2ZM11 13 22 2"/>',
  shield:'<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Zm-4 10 3 3 5-6"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check:'<path d="m5 12 4 4L20 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  bookmark:'<path d="M6 3h12v19l-6-4-6 4V3Z"/>',
  flag:'<path d="M4 22V3m0 0c6-4 10 4 16 0v11c-6 4-10-4-16 0"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  refresh:'<path d="M20 7a9 9 0 1 0 1 8M20 2v6h-6"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.book}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const main=document.querySelector('main');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='estudio-paracaidismo-v1';
const defaults=()=>({version:1,read:[],bookmarks:[],lastPage:1,records:{},history:[],recent:[],practical:[],notes:'',practice:null,exam:null,practiceResult:null,examResult:null});
let state=defaults(),storageUnavailable=false;
try{const saved=JSON.parse(localStorage.getItem(KEY));if(saved?.version===1){state={...state,...saved};for(const key of ['read','bookmarks','history','recent','practical'])if(!Array.isArray(state[key]))state[key]=[];if(!state.records||typeof state.records!=='object')state.records={};}}catch{storageUnavailable=true;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{if(!storageUnavailable)toast('No se pudo guardar el progreso. Esta sesión seguirá disponible mientras mantengas la página abierta.');storageUnavailable=true;}}
let toastTimer;
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4500);}
let pages=[],questions=[],questionById=new Map(),pdf='';
let practiceFilter={module:'',topic:'',wrong:false},examFilter={module:'',count:20,minutes:30},searchTerm='';
const topicTitle=id=>topics.find(t=>t.id===id)?.title||'';
const imgPath=(page,index=0)=>pages[page-1]?.images[index]||'';
const heading=(title,description,extra='')=>`<div class="page-heading"><div><h1>${title}</h1><p class="muted">${description}</p></div>${extra}</div>`;
const link=(text,route,style='secondary')=>`<a class="${style}" href="#${route}">${text}</a>`;
const button=(text,action,style='secondary',attrs='')=>`<button class="${style}" data-action="${action}" ${attrs}>${text}</button>`;
const percent=(a,b)=>b?Math.round(a/b*100):0;
const wrongIds=()=>Object.entries(state.records).filter(([,r])=>!r.correct).map(([id])=>id);
const records=()=>Object.values(state.records);
const reviewed=()=>records().length;
const correctCount=()=>records().filter(r=>r.correct).length;
const modeSession=mode=>mode==='examen'?state.exam:state.practice;
const modeResult=mode=>mode==='examen'?state.examResult:state.practiceResult;
function route(){return location.hash.slice(1).split('/');}
function go(hash){if(location.hash==='#'+hash)render();else location.hash=hash;}
function stats(){return `<div class="stats">${[
  ['book',state.read.length+'/78','Páginas estudiadas'],['layers',reviewed()+'/'+questions.length,'Preguntas repasadas'],['target',percent(correctCount(),reviewed())+'%','Acierto en último intento'],['clipboard',state.history.length,'Simulacros completados']
].map(([i,n,t])=>`<div class="stat"><div class="stat-icon">${icon(i)}</div><div><strong>${n}</strong><small>${t}</small></div></div>`).join('')}</div>`;}
function moduleCards(){return modules.map(m=>{
 const read=state.read.filter(p=>p>=m.start&&p<=m.end).length,total=m.end-m.start+1;
 return `<a class="module-card" href="#manual/p${m.start}"><div class="module-top"><span class="module-number">MÓDULO ${m.id} / ${m.number}</span>${icon(m.icon)}</div><h3>${m.title}</h3><p>${m.description}</p><div class="progress-track" role="progressbar" aria-label="Lectura del módulo ${m.id}" aria-valuenow="${read}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${percent(read,total)}%"></span></div><div class="module-meta"><span>${total} páginas</span><span>${percent(read,total)}% estudiado</span></div></a>`;
}).join('');}
function home(){
 main.innerHTML=heading('Tu próximo salto empieza aquí.','Comprende, repasa y prepárate. A tu ritmo, desde tierra.',`<span class="pill">${icon('book')} EDICIÓN 2025 · FESAPADE</span>`)+`
 <section class="hero"><div class="hero-copy"><div class="eyebrow">CONOCIMIENTO QUE TE ACOMPAÑA EN CADA SALTO</div><h2>Más que memorizar.<br>Aprende a decidir.</h2><p>Tu manual, tus sesiones de repaso y tu preparación para el examen. Todo en un solo lugar.</p>${link('Continuar con el manual '+icon('arrow'),'manual/p'+state.lastPage,'primary')}</div><div class="hero-image"><img src="${imgPath(13)}" alt="Salto tándem, fotografía incluida en el manual FESAPADE"><span class="image-credit">IMAGEN DEL MANUAL · FESAPADE 2025</span></div></section>
 ${stats()}
 <div class="section-heading"><div><h2>Elige cómo aprender hoy</h2><p>Tres formas de avanzar, un mismo objetivo: comprender mejor.</p></div></div>
 <div class="mode-grid">
 ${[
 ['book','Manual digital','Explora los cuatro módulos, consulta ilustraciones y guarda lo que quieras volver a leer.','Abrir el manual','manual',''],
 ['layers','Repaso por temas','Practica a tu ritmo, vuelve a cualquier pregunta y entiende el porqué de cada respuesta.','Empezar a repasar','repaso',''],
 ['clipboard','Simulacro de examen','Pon a prueba lo aprendido con preguntas y opciones mezcladas. Revisa tus resultados al final.','Preparar un examen','examen','exam']
 ].map(([i,title,text,cta,hash,cls])=>`<a class="mode-card ${cls}" href="#${hash}">${cls?'<span class="card-tag">PONTE A PRUEBA</span>':''}<span class="mode-icon">${icon(i)}</span><h3>${title}</h3><p>${text}</p><span class="mode-link">${cta}${icon('arrow')}</span></a>`).join('')}
 </div>
 <div class="section-heading"><div><h2>Tu ruta de aprendizaje</h2><p>Del primer concepto al plan de aterrizaje.</p></div>${link('Ver todos los módulos '+icon('arrow'),'manual','text-button')}</div>
 <div class="module-grid">${moduleCards()}</div>
 <div class="bottom-note">${icon('shield')}<p><strong>La práctica también se prepara.</strong> En Mi progreso encontrarás una lista para organizar tus sesiones en tierra y las dudas para tu instructor.</p>${link(icon('arrow'),'progreso','text-button')}</div>`;
}
function reader(pageNumber){
 const page=pages[Math.max(0,Math.min(77,(Number(pageNumber)||state.lastPage)-1))];state.lastPage=page.number;save();
 const saved=state.bookmarks.includes(page.number),read=state.read.includes(page.number);
 main.innerHTML=heading('El manual, a tu ritmo.','Consulta el texto y las imágenes de la edición 2025.',link(icon('download')+' PDF original',encodeURI(pdf),'secondary').replace('href="#','href="./'))+`
 <div class="content-grid"><aside class="panel reader-sidebar"><label class="search-label" for="manual-search">Buscar en el manual</label><input class="search-field" type="search" id="manual-search" placeholder="Ej. altímetro, aterrizaje…" value="${escape(searchTerm)}"><div id="search-results" class="search-results" aria-live="polite"></div><div class="reader-nav">
 <a href="#manual/p1" class="${page.number<9?'current':''}">Presentación, créditos e índices</a>
 ${modules.map(m=>`<details ${page.module===m.id?'open':''}><summary>MÓDULO ${m.id} · ${m.title}</summary><a href="#manual/p${m.start}">Portada del módulo</a>${topics.filter(t=>t.module===m.id).map(t=>`<a class="${page.topic===t.id?'current':''}" href="#manual/p${t.start}">${t.title}</a>`).join('')}</details>`).join('')}
 <a href="#manual/p76">Recursos y créditos finales</a>
 <details ${state.bookmarks.length?'open':''}><summary>${icon('bookmark')} Mis marcadores (${state.bookmarks.length})</summary>${state.bookmarks.map(n=>`<a class="saved-link" href="#manual/p${n}">Pág. PDF ${n} · ${escape(pages[n-1]?.title||'Manual')}</a>`).join('')||'<p class="small muted">Guarda una página desde el lector.</p>'}</details>
 </div></aside>
 <article class="panel reader-article"><div class="reader-tools"><div><div class="reader-title">${page.module?'MÓDULO '+page.module:'MANUAL DEL ALUMNO'}</div><span class="reader-meta">Página PDF ${page.number} de 78${page.printed?' · Página impresa '+page.printed:''}</span></div><div class="actions">${button(icon('bookmark')+(saved?'Guardado':'Guardar página'),'bookmark','secondary',`aria-pressed="${saved}"`)}${page.topic?link('Repasar este tema','repaso/tema/'+page.topic,'secondary'):''}</div></div>
 <div class="manual-content">${page.html||'<h2>Módulo I</h2>'}</div>
 <div class="reader-bottom"><div class="actions">${button(read?icon('check')+' Página estudiada':'Marcar como estudiada','read','secondary',`aria-pressed="${read}"`)}<span class="reading-state">${state.read.length} de 78 páginas estudiadas</span></div><div class="actions sticky-end">${button('← Anterior','page-prev','secondary',page.number===1?'disabled':'')}<form id="page-form" class="page-picker"><label for="page-number">Página PDF</label><input type="number" id="page-number" min="1" max="78" value="${page.number}" required><button class="secondary" type="submit">Ir</button></form>${button('Siguiente →','page-next','secondary',page.number===78?'disabled':'')}</div></div></article></div>`;
 document.querySelector('#manual-search').addEventListener('input',e=>{searchTerm=e.target.value;searchManual();});
 document.querySelector('#page-form').addEventListener('submit',e=>{e.preventDefault();go('manual/p'+document.querySelector('#page-number').value);});
 main.querySelectorAll('.manual-content img').forEach(image=>{image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label','Ampliar '+image.alt);image.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openImage(image.src,image.alt);}});});
 searchManual();
}
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function searchManual(){
 const el=document.querySelector('#search-results');if(!el)return;
 const query=normalize(searchTerm.trim());if(query.length<2){el.innerHTML='';return;}
 const results=pages.filter(p=>normalize(p.search).includes(query));
 el.innerHTML=`<p class="small muted">${results.length} páginas encontradas</p>`+results.map(p=>{
  const at=normalize(p.search).indexOf(query),snippet=p.search.slice(Math.max(0,at-45),at+110);
  return `<button class="search-result" data-action="search-page" data-page="${p.number}"><strong>PDF ${p.number} · ${escape(p.title)}</strong><small>…${escape(snippet)}…</small></button>`;
 }).join('');
}
const moduleOptions=(value,all='Todos los módulos')=>`<option value="">${all}</option>`+modules.map(m=>`<option value="${m.id}" ${value===m.id?'selected':''}>Módulo ${m.id} · ${m.title}</option>`).join('');
function practiceSetup(){
 const filtered=filterBank(questions,practiceFilter.module,practiceFilter.topic,practiceFilter.wrong?wrongIds():null);
 main.innerHTML=heading('Cada pregunta, una oportunidad.','Elige un tema, responde y entiende la explicación.')+
 (state.practice?`<div class="resume"><p><strong>Tienes una sesión de repaso guardada.</strong><br>${Object.keys(state.practice.checked).length} de ${state.practice.entries.length} preguntas comprobadas.</p>${link('Continuar sesión','repaso/sesion','primary')}</div>`:'')+
 `<div class="setup-grid"><section class="panel"><span class="pill">${icon('layers')} REPASO GUIADO</span><h2 style="margin-top:22px">¿Qué quieres repasar?</h2><p>Navega entre preguntas libremente. Tus selecciones y las explicaciones comprobadas se conservan al volver atrás.</p><div class="filters"><div class="field"><label for="practice-module">Módulo</label><select id="practice-module">${moduleOptions(practiceFilter.module)}</select></div><div class="field"><label for="practice-topic">Tema</label><select id="practice-topic"><option value="">Todos los temas</option>${topics.filter(t=>!practiceFilter.module||t.module===practiceFilter.module).map(t=>`<option value="${t.id}" ${practiceFilter.topic===t.id?'selected':''}>${t.title}</option>`).join('')}</select></div></div><label class="inline-check"><input id="only-wrong" type="checkbox" ${practiceFilter.wrong?'checked':''}> Repasar solo mis errores (${wrongIds().length})</label><div class="setup-footer sticky-end"><span class="bank-count">${filtered.length} preguntas disponibles</span>${button('Empezar repaso '+icon('arrow'),'start-practice','primary',filtered.length?'':'disabled')}</div></section><aside class="panel"><img class="setup-image" src="${imgPath(21)}" alt="Partes del paracaídas ilustradas en el manual"><h3>Comprender antes de memorizar.</h3><ul class="feature-list"><li>${icon('check')}Preguntas de una o varias respuestas.</li><li>${icon('check')}Explicación y referencia a la página del manual.</li><li>${icon('check')}Imágenes ampliables cuando hay una referencia visual.</li><li>${icon('check')}Acceso directo a cualquier pregunta.</li></ul></aside></div>`;
 document.querySelector('#practice-module').onchange=e=>{practiceFilter.module=e.target.value;practiceFilter.topic='';practiceSetup();};
 document.querySelector('#practice-topic').onchange=e=>{practiceFilter.topic=e.target.value;practiceSetup();};
 document.querySelector('#only-wrong').onchange=e=>{practiceFilter.wrong=e.target.checked;practiceSetup();};
}
function examSetup(){
 const bank=filterBank(questions,examFilter.module),count=Math.min(examFilter.count,bank.length);
 main.innerHTML=heading('Pon a prueba lo aprendido.','Un simulacro distinto para entrenar tu comprensión.')+
 (state.exam?`<div class="resume"><p><strong>Hay un examen en curso.</strong><br>El tiempo sigue corriendo aunque salgas de esta sección.</p>${link('Retomar examen','examen/sesion','primary')}</div>`:'')+
 `<div class="setup-grid"><section class="panel"><span class="pill">${icon('clipboard')} SIMULACRO TEÓRICO</span><h2 style="margin-top:22px">Prepara tu sesión de examen</h2><p>Las preguntas y sus opciones cambian de orden en cada intento. Las respuestas correctas y las explicaciones se muestran al finalizar.</p><div class="filters"><div class="field"><label for="exam-module">Contenido</label><select id="exam-module">${moduleOptions(examFilter.module,'Manual completo')}</select></div><div class="field"><label for="exam-count">Número de preguntas</label><select id="exam-count">${[10,20,30,questions.length].map(n=>`<option value="${n}" ${examFilter.count===n?'selected':''}>${n===questions.length?'Todo el banco ('+n+')':n+' preguntas'}</option>`).join('')}</select></div><div class="field"><label for="exam-time">Tiempo disponible</label><select id="exam-time">${[15,30,45,60,0].map(n=>`<option value="${n}" ${examFilter.minutes===n?'selected':''}>${n?n+' minutos':'Sin límite de tiempo'}</option>`).join('')}</select></div></div><div class="note-box">${icon('refresh')} Se evitan las últimas 50 combinaciones guardadas en este navegador. Un banco finito no permite garantizar secuencias únicas para siempre.</div><div class="setup-footer sticky-end"><span class="bank-count">${count} preguntas · ${examFilter.minutes?examFilter.minutes+' min':'Sin límite'}</span>${button('Comenzar examen '+icon('arrow'),'start-exam','primary',state.exam?'disabled':'')}</div></section><aside class="panel"><img class="setup-image" src="${imgPath(27)}" alt="Salida desde una aeronave, imagen del manual"><h3>Conoce el formato.</h3><ul class="feature-list"><li>${icon('check')}Una o varias respuestas según la pregunta.</li><li>${icon('check')}Puedes retroceder y cambiar respuestas.</li><li>${icon('check')}Marca preguntas para revisarlas al final.</li><li>${icon('check')}Cada pregunta vale un punto; deben coincidir todas las opciones correctas.</li></ul><p class="small">Es una herramienta de estudio. El resultado no equivale a una evaluación oficial ni acredita habilidades prácticas.</p></aside></div>`;
 document.querySelector('#exam-module').onchange=e=>{examFilter.module=e.target.value;examSetup();};
 document.querySelector('#exam-count').onchange=e=>{examFilter.count=Number(e.target.value);examSetup();};
 document.querySelector('#exam-time').onchange=e=>{examFilter.minutes=Number(e.target.value);examSetup();};
}
function startPractice(bank){
 if(!bank.length)return;
 state.practice={entries:bank.map(q=>({id:q.id,order:q.options.map((_,i)=>i)})),answers:{},checked:{},flags:[],index:0,started:Date.now()};save();go('repaso/sesion');
}
function startExam(){
 if(state.exam)return go('examen/sesion');
 try{
 const entries=createExam(filterBank(questions,examFilter.module),examFilter.count,state.recent);
 state.recent=[signature(entries),...state.recent].slice(0,50);
 state.exam={entries,answers:{},flags:[],index:0,started:Date.now(),endAt:examFilter.minutes?Date.now()+examFilter.minutes*60000:null};save();go('examen/sesion');
 }catch(error){toast(error.message);}
}
function referenceImages(q){return q.images.length?`<details class="reference-images" open><summary>Referencia visual del manual · ${q.images.length} ${q.images.length===1?'imagen':'imágenes'} · pulsa para ampliar</summary><div class="reference-strip">${q.images.map((src,i)=>`<button class="reference-thumb" data-action="image" data-src="${escape(src)}" data-caption="Referencia del manual · ${escape(q.source)}"><img src="${escape(src)}" loading="lazy" alt="Referencia visual ${i+1} del manual"><span>Ampliar imagen ${i+1} ↗</span></button>`).join('')}</div></details>`:'';}
function session(mode){
 const s=modeSession(mode);if(!s)return go(mode);
 if(mode==='examen'&&s.endAt&&Date.now()>=s.endAt)return finish('examen',true);
 s.index=Math.max(0,Math.min(s.entries.length-1,s.index));
 const entry=s.entries[s.index],q=questionById.get(entry.id);if(!q){toast('La sesión anterior ya no corresponde a esta edición del banco.');if(mode==='examen')state.exam=null;else state.practice=null;save();return go(mode);}
 const chosen=s.answers[q.id]||[],checked=mode==='repaso'&&Boolean(s.checked[q.id]),isCorrect=checked&&sameAnswer(chosen,q.correct),answered=Object.values(s.answers).filter(a=>a.length).length;
 main.innerHTML=heading(mode==='examen'?'Simulacro en curso':'Una pregunta a la vez.',mode==='examen'?'Responde, revisa y entrega cuando estés listo.':'La explicación es parte del aprendizaje.',link(mode==='examen'?'Configuración':'Elegir otro tema',mode,'secondary'))+`
 <div class="session-header"><p><strong>Pregunta ${s.index+1} de ${s.entries.length}</strong> · ${answered} respondidas${mode==='repaso'?' · '+Object.keys(s.checked).length+' comprobadas':''}</p>${mode==='examen'?`<span class="timer" id="exam-timer">${icon('clock')}<span>—</span></span>`:`<span class="pill">${icon('layers')} MODO REPASO</span>`}</div><div class="progress-track"><span style="width:${percent(answered,s.entries.length)}%"></span></div>
 <div class="question-layout"><section class="panel question-card"><div class="question-badges"><span class="pill">MÓDULO ${q.module}</span><span class="pill">${escape(topicTitle(q.topic))}</span></div><h2 tabindex="-1" id="question-heading">${escape(q.q)}</h2><p class="help">${q.type==='multi'?'Selección múltiple: marca todas las respuestas correctas.':'Una respuesta: elige la mejor opción.'}</p><fieldset class="choices" style="border:0;padding:0;margin:0"><legend class="sr-only">Respuestas a la pregunta</legend>${entry.order.map((option,i)=>{
 const selected=chosen.includes(option),correct=q.correct.includes(option);let cls=selected?'selected':'';let mark='';
 if(checked){if(correct){cls+=' '+(selected?'correct':'missed');mark=selected?'✓ Respuesta correcta':'Respuesta correcta sin seleccionar';}else if(selected){cls+=' wrong';mark='✕ Respuesta incorrecta';}}
 return `<label class="choice ${cls}"><input type="${q.type==='multi'?'checkbox':'radio'}" name="answer" value="${option}" ${selected?'checked':''} ${checked?'disabled':''}><span class="choice-letter">${String.fromCharCode(65+i)}</span><span>${escape(q.options[option])}${mark?'<span class="choice-mark">'+mark+'</span>':''}</span></label>`;
 }).join('')}</fieldset>
 ${checked?`<div class="feedback ${isCorrect?'':'incorrect'}" role="status"><h3>${isCorrect?'✓ Correcto':'Revisa esta respuesta'}</h3><p>${escape(q.explanation)}</p><p class="small muted">${escape(q.source)}</p>${link('Consultar la página del manual '+icon('arrow'),'manual/p'+q.page,'text-button')}</div>`:''}
 ${referenceImages(q)}
 <div class="actions question-actions">${button('← Anterior','question-prev','secondary',s.index===0?'disabled':'')}${mode==='repaso'&&!checked?button('Comprobar','check','primary',chosen.length?'':'disabled'):''}${button(s.index===s.entries.length-1?'Ver resumen':'Siguiente →',s.index===s.entries.length-1?'finish':'question-next','primary')}</div></section>
 <aside class="panel question-map"><h3>Tu sesión</h3><div class="number-grid">${s.entries.map((e,i)=>{
  const done=(s.answers[e.id]||[]).length,failed=mode==='repaso'&&s.checked[e.id]&&!sameAnswer(s.answers[e.id]||[],questionById.get(e.id).correct);
  return `<button data-action="question-jump" data-index="${i}" class="${i===s.index?'current ':''}${done?'answered ':''}${failed?'failed ':''}${s.flags.includes(e.id)?'flagged':''}" aria-label="Pregunta ${i+1}${done?', respondida':''}${s.flags.includes(e.id)?', marcada para revisar':''}" ${i===s.index?'aria-current="step"':''}>${i+1}</button>`;
 }).join('')}</div><p class="map-legend">Verde: respondida · Borde oscuro: actual<br>Franja dorada: marcada para revisar${mode==='repaso'?'<br>Naranja: respuesta por repasar':''}</p>${button(icon('flag')+(s.flags.includes(q.id)?'Marcada para revisar':'Marcar para revisar'),'flag','secondary flag-button '+(s.flags.includes(q.id)?'flagged':''),`aria-pressed="${s.flags.includes(q.id)}"`)}<div class="sticky-end">${button(mode==='examen'?'Finalizar examen':'Terminar repaso','finish','secondary')}</div><p class="map-legend">${mode==='examen'?'La corrección aparecerá después de entregar.':'Puedes saltar a cualquier pregunta sin perder lo que ya respondiste.'}</p></aside></div>`;
 main.querySelectorAll('input[name="answer"]').forEach(input=>input.addEventListener('change',()=>{
   s.answers[q.id]=[...main.querySelectorAll('input[name="answer"]:checked')].map(el=>Number(el.value));save();
   const check=main.querySelector('[data-action="check"]');if(check)check.disabled=!s.answers[q.id].length;
   main.querySelectorAll('.choice').forEach(el=>el.classList.toggle('selected',el.querySelector('input').checked));
   const count=Object.values(s.answers).filter(a=>a.length).length;main.querySelector('.session-header p').innerHTML=`<strong>Pregunta ${s.index+1} de ${s.entries.length}</strong> · ${count} respondidas${mode==='repaso'?' · '+Object.keys(s.checked).length+' comprobadas':''}`;main.querySelector('.session-header + .progress-track span').style.width=percent(count,s.entries.length)+'%';
   const pos=s.entries.findIndex(e=>e.id===q.id),map=main.querySelector(`[data-index="${pos}"]`);map?.classList.toggle('answered',Boolean(s.answers[q.id].length));
 }));
 tick();
}
function recordAnswer(q,chosen){const previous=state.records[q.id];state.records[q.id]={correct:sameAnswer(chosen,q.correct),attempts:(previous?.attempts||0)+1,at:Date.now()};}
function check(){
 const s=state.practice;if(!s)return;const q=questionById.get(s.entries[s.index].id),chosen=s.answers[q.id]||[];
 if(!chosen.length||s.checked[q.id])return;s.checked[q.id]=true;recordAnswer(q,chosen);save();session('repaso');
 main.querySelector('.feedback')?.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function requestFinish(mode){
 const s=modeSession(mode);if(!s)return;
 if(mode==='repaso'){finish(mode);return;}
 const pending=s.entries.filter(e=>!(s.answers[e.id]||[]).length).length;
 document.querySelector('#confirm-message').textContent=`${pending?'Tienes '+pending+' preguntas sin responder. Se contarán como incorrectas. ':'Has respondido todas las preguntas. '}${s.flags.length?'Hay '+s.flags.length+' preguntas marcadas para revisar. ':''}Al entregar verás la corrección y no podrás cambiar las respuestas.`;
 document.querySelector('#confirm-dialog').showModal();
}
function finish(mode,expired=false){
 const s=modeSession(mode);if(!s)return;
 const result={...s,results:grade(s.entries,s.answers,questions),finished:Date.now(),expired,mode};
 if(mode==='examen'){
  for(const e of s.entries)recordAnswer(questionById.get(e.id),s.answers[e.id]||[]);
  state.examResult=result;state.history=[result,...state.history].slice(0,20);state.exam=null;
 }else{
  result.results=result.results.map(r=>({...r,checked:Boolean(s.checked[r.id])}));state.practiceResult=result;state.practice=null;
 }
 save();document.querySelector('#confirm-dialog').close();if(expired)toast('El tiempo terminó. Tu examen se ha corregido automáticamente.');go(mode+'/resultados');
}
function results(mode){
 const result=modeResult(mode);if(!result)return go(mode);
 const evaluated=mode==='repaso'?result.results.filter(r=>r.checked):result.results;
 const correct=evaluated.filter(r=>r.correct).length,total=evaluated.length,pct=percent(correct,total);
 main.innerHTML=heading(mode==='examen'?'Así fue tu simulacro.':'Lo que aprendiste hoy.',mode==='examen'?'Revisa cada decisión y vuelve al manual donde lo necesites.':'Tus errores son el punto de partida de la próxima sesión.')+`
 <section class="panel"><div class="results-score"><div class="score-circle"><strong>${pct}%</strong><span>DE ACIERTOS</span></div><div><span class="eyebrow">${mode==='examen'?'SIMULACRO FINALIZADO':'REPASO FINALIZADO'}</span><h2 style="margin:10px 0">${correct} de ${total} ${mode==='repaso'?'comprobadas':'preguntas'}</h2><p class="small muted">${result.expired?'Tiempo agotado · ':''}${mode==='repaso'?(result.entries.length-total)+' sin comprobar · ':''}${Math.max(1,Math.round((result.finished-result.started)/60000))} min de sesión${mode==='examen'?' · Resultado de práctica, sin calificación oficial':''}</p></div></div><div class="actions">${button('Repasar errores','retry-wrong','primary',evaluated.some(r=>!r.correct)?'':'disabled')}${link('Preparar otra sesión',mode,'secondary')}${link('Ver mi progreso','progreso','text-button')}</div></section>
 <div class="progress-grid sticky-end"><section class="panel"><h2>Revisión de preguntas</h2><p class="small muted">Abre una pregunta para consultar tu respuesta y su explicación.</p>${result.results.map((r,i)=>{
 const q=questionById.get(r.id);const checked=mode==='examen'||r.checked;
 return `<details class="review-item ${checked&&!r.correct?'failed':''}"><summary><strong>${!checked?'—':r.correct?'✓':'✕'}</strong><span>${i+1}. ${escape(q.q)}${!checked?'<small class="muted"> · Sin comprobar</small>':''}</span></summary><div class="answer-label">TU SELECCIÓN</div><p>${r.chosen.length?r.chosen.map(n=>escape(q.options[n])).join(' · '):'Sin respuesta'}</p><div class="answer-label">RESPUESTA CORRECTA</div><p>${q.correct.map(n=>escape(q.options[n])).join(' · ')}</p><p>${escape(q.explanation)}</p>${link(escape(q.source)+' '+icon('arrow'),'manual/p'+q.page,'text-button')}${referenceImages(q)}</details>`;
 }).join('')}</section><aside class="panel" style="align-self:start"><h2>Por módulo</h2>${modules.map(m=>{const rs=evaluated.filter(r=>questionById.get(r.id).module===m.id);if(!rs.length)return '';return `<div class="result-topic"><span>Módulo ${m.id}<br><small class="muted">${m.title}</small></span><strong>${rs.filter(r=>r.correct).length} / ${rs.length}</strong></div>`;}).join('')||'<p class="muted small">No se comprobaron preguntas en esta sesión.</p>'}<div class="note-box">${icon('book')} Vuelve a la página del manual desde cada explicación. Estudiar el contexto ayuda a comprender la respuesta.</div></aside></div>`;
}
function progress(){
 main.innerHTML=heading('Tu avance, a la vista.','Retoma lo pendiente y prepara tu próxima sesión de aprendizaje.',button(icon('download')+' Exportar progreso','export','secondary'))+stats()+`
 <div class="section-heading"><div><h2>Lectura por módulo</h2><p>Marca las páginas como estudiadas al terminar de leerlas.</p></div></div><div class="module-grid">${moduleCards()}</div>
 <div class="progress-grid sticky-end"><section class="panel"><div class="section-heading"><h2>Preparación práctica en tierra</h2><span class="pill">${state.practical.length} / ${practical.length}</span></div><p class="small muted">Lista personal de temas para ensayar y revisar con tu instructor. Marcar un tema no acredita dominio ni sustituye una evaluación práctica.</p><div class="practice-list">${practical.map(p=>`<div class="practice-check"><input type="checkbox" id="task-${p.id}" data-task="${p.id}" ${state.practical.includes(p.id)?'checked':''}><label for="task-${p.id}"><strong>${p.title}</strong><small>${p.description}</small></label>${link('Ver en el manual ↗','manual/p'+p.page,'text-button')}</div>`).join('')}</div><div class="notes"><label for="study-notes">Dudas para mi instructor</label><textarea id="study-notes" placeholder="Anota lo que quieras revisar en tu próxima sesión…">${escape(state.notes)}</textarea><small id="notes-status">Notas personales guardadas solo en este navegador.</small></div></section>
 <aside><section class="panel"><h2>Temas por reforzar</h2><p class="small muted">Basado en tu último intento de cada pregunta.</p>${topics.map(t=>{const wrong=wrongIds().filter(id=>questionById.get(id)?.topic===t.id);return wrong.length?`<div class="result-topic">${link(escape(t.title),'repaso/tema/'+t.id,'text-button')}<strong>${wrong.length}</strong></div>`:'';}).join('')||'<p class="empty">Todavía no tienes errores pendientes. Empieza una sesión de repaso para conocer tus avances.</p>'}${button('Repasar todos mis errores','all-wrong','primary',wrongIds().length?'':'disabled')}</section><section class="panel sticky-end"><h2>Últimos simulacros</h2>${state.history.map((h,i)=>{const correct=h.results.filter(r=>r.correct).length;return `<div class="history-item"><div><strong>${percent(correct,h.results.length)}% <span class="small muted">· ${correct}/${h.results.length}</span></strong><p>${new Date(h.finished).toLocaleDateString('es-SV',{day:'numeric',month:'short',year:'numeric'})}</p></div>${button('Revisar','history','text-button',`data-index="${i}"`)}</div>`;}).join('')||'<p class="empty">Tus simulacros aparecerán aquí al terminarlos.</p>'}</section></aside></div>`;
 main.querySelectorAll('[data-task]').forEach(input=>input.onchange=()=>{state.practical=input.checked?[...new Set([...state.practical,input.dataset.task])]:state.practical.filter(id=>id!==input.dataset.task);save();progress();});
 document.querySelector('#study-notes').oninput=e=>{state.notes=e.target.value;save();document.querySelector('#notes-status').textContent=storageUnavailable?'No se pudieron guardar las notas en este navegador.':'Notas guardadas en este navegador.';};
}
function tick(){
 const s=state.exam;if(!s)return;
 if(s.endAt&&Date.now()>=s.endAt){finish('examen',true);return;}
 const timer=document.querySelector('#exam-timer');if(!timer)return;
 if(!s.endAt){timer.querySelector('span').textContent='Sin límite';return;}
 const seconds=Math.max(0,Math.ceil((s.endAt-Date.now())/1000));timer.querySelector('span').textContent=`${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;timer.classList.toggle('urgent',seconds<120);
}
function render(){
 const [raw,sub,value]=route(),tab=['manual','repaso','examen','progreso'].includes(raw)?raw:'inicio';
 document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===tab);if(a.dataset.nav===tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 document.querySelector('#breadcrumb').textContent={inicio:'Vista general',manual:'Manual digital',repaso:'Repaso por temas',examen:'Simulacro de examen',progreso:'Mi progreso'}[tab];
 if(tab==='manual')reader(sub?.replace(/^p/,''));
 else if(tab==='repaso'&&sub==='tema'){
  const t=topics.find(t=>t.id===value);if(t)practiceFilter={module:t.module,topic:t.id,wrong:false};practiceSetup();
 }else if((tab==='repaso'||tab==='examen')&&sub==='sesion')session(tab);
 else if((tab==='repaso'||tab==='examen')&&sub==='resultados')results(tab);
 else if(tab==='repaso')practiceSetup();else if(tab==='examen')examSetup();else if(tab==='progreso')progress();else home();
 document.title={inicio:'Vista general',manual:'Manual digital',repaso:'Repaso',examen:'Simulacro de examen',progreso:'Mi progreso'}[tab]+' · Estudio de paracaidismo';
}
function openImage(src,caption){const dialog=document.querySelector('#image-dialog');dialog.querySelector('img').src=src;dialog.querySelector('img').alt=caption;dialog.querySelector('p').textContent=caption;dialog.showModal();}
document.addEventListener('click',e=>{
 const manualImage=e.target.closest('.manual-content img');if(manualImage)return openImage(manualImage.src,manualImage.alt);
 const target=e.target.closest('[data-action]');if(!target||target.disabled)return;
 const action=target.dataset.action,[tab]=route(),s=modeSession(tab);
 if(action==='image')openImage(target.dataset.src,target.dataset.caption);
 else if(action==='close-image')document.querySelector('#image-dialog').close();
 else if(action==='cancel-finish')document.querySelector('#confirm-dialog').close();
 else if(action==='confirm-finish')finish('examen');
 else if(action==='bookmark'){const n=state.lastPage;state.bookmarks=state.bookmarks.includes(n)?state.bookmarks.filter(p=>p!==n):[...state.bookmarks,n].sort((a,b)=>a-b);save();reader(n);}
 else if(action==='read'){const n=state.lastPage;state.read=state.read.includes(n)?state.read.filter(p=>p!==n):[...state.read,n];save();reader(n);}
 else if(action==='page-prev')go('manual/p'+(state.lastPage-1));
 else if(action==='page-next')go('manual/p'+(state.lastPage+1));
 else if(action==='search-page')go('manual/p'+target.dataset.page);
 else if(action==='start-practice')startPractice(filterBank(questions,practiceFilter.module,practiceFilter.topic,practiceFilter.wrong?wrongIds():null));
 else if(action==='all-wrong')startPractice(questions.filter(q=>wrongIds().includes(q.id)));
 else if(action==='start-exam')startExam();
 else if(action==='question-prev'||action==='question-next'||action==='question-jump'){
  if(!s)return;s.index=action==='question-jump'?Number(target.dataset.index):s.index+(action==='question-next'?1:-1);save();session(tab);document.querySelector('#question-heading')?.focus({preventScroll:true});
 }else if(action==='check')check();
 else if(action==='flag'){
  if(!s)return;const id=s.entries[s.index].id;s.flags=s.flags.includes(id)?s.flags.filter(i=>i!==id):[...s.flags,id];save();session(tab);
 }else if(action==='finish')requestFinish(tab);
 else if(action==='retry-wrong'){
  const result=modeResult(tab),ids=result.results.filter(r=>!r.correct&&(tab==='examen'||r.checked)).map(r=>r.id);startPractice(questions.filter(q=>ids.includes(q.id)));
 }else if(action==='history'){state.examResult=state.history[Number(target.dataset.index)];save();go('examen/resultados');}
 else if(action==='export'){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mi-progreso-paracaidismo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Progreso exportado. Incluye tus notas personales.');
 }
});
window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true});});
try{
 const [manual,bank]=await Promise.all([fetch('./data/manual.json').then(r=>{if(!r.ok)throw Error('manual');return r.json();}),fetch('./data/questions.json').then(r=>{if(!r.ok)throw Error('preguntas');return r.json();})]);
 pages=manual.pages;pdf=manual.pdf;questions=bank;questionById=new Map(questions.map(q=>[q.id,q]));
 render();setInterval(tick,1000);tick();
 if(storageUnavailable)toast('El almacenamiento local no está disponible. Puedes estudiar durante esta sesión.');
}catch(error){main.innerHTML=heading('No se pudo cargar el contenido.','Comprueba tu conexión y vuelve a cargar la página.')+`<div class="panel"><p>El manual PDF sigue disponible para descargar.</p><a class="primary" href="./CURSO%20DE%20PARACAIDISMO%20-%20FESAPADE_2025.pdf">Abrir el manual PDF</a><p class="small muted sticky-end">Para abrir la web localmente utiliza el servidor incluido: npm run dev.</p></div>`;console.error(error);}
