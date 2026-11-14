import { test, expect } from '@playwright/test';
const KEY='estudio-paracaidismo-v1';
const readState=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
test('inicio y rutas relativas funcionan en una subcarpeta de GitHub Pages',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('./');await expect(page.getByRole('heading',{name:'Tu próximo salto empieza aquí.'})).toBeVisible();
 await expect(page.locator('.hero-image img')).toBeVisible();
 await expect(page.locator('.module-card')).toHaveCount(4);
 expect(await page.locator('.hero-image img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 expect(errors).toEqual([]);
});
test('el lector busca sin tildes, guarda marcadores y conserva la lectura',async({page})=>{
 await page.goto('./#manual/p24');await expect(page.locator('.reader-meta')).toContainText('Página PDF 24');
 await page.getByRole('button',{name:'Guardar página',exact:true}).click();
 await page.getByRole('button',{name:'Marcar como estudiada',exact:true}).click();
 await page.reload();await expect(page.getByRole('button',{name:'Guardado',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Página estudiada',exact:false})).toBeVisible();
 await page.getByLabel('Buscar en el manual').fill('altimetro');await expect(page.locator('.search-result').first()).toBeVisible();
 await page.locator('.search-result').first().click();await expect(page.locator('.reader-meta')).toContainText('Página PDF');
 await page.locator('#page-number').fill('39');await page.getByRole('button',{name:'Ir',exact:true}).click();
 await expect(page.locator('.reader-meta')).toContainText('PDF 39');await page.locator('.manual-content img').first().focus();await page.keyboard.press('Enter');await expect(page.locator('#image-dialog')).toBeVisible();
 await page.getByRole('button',{name:'Cerrar imagen'}).click();await expect(page.locator('#image-dialog')).not.toBeVisible();
 expect((await readState(page)).read).toContain(24);
});
test('repaso conserva selección al volver, explica y permite navegar por tema',async({page})=>{
 await page.goto('./#repaso');await page.getByLabel('Módulo',{exact:true}).selectOption('I');
 await page.getByLabel('Tema',{exact:true}).selectOption('equipo');await page.getByRole('button',{name:'Empezar repaso'}).click();
 await expect(page.locator('#question-heading')).toContainText('partes principales');
 await page.locator('input[value="0"]').check();await page.locator('input[value="1"]').check();
 await page.getByRole('button',{name:'Siguiente →',exact:true}).click();await page.getByRole('button',{name:'← Anterior',exact:true}).click();
 await expect(page.locator('input[value="0"]')).toBeChecked();await expect(page.locator('input[value="1"]')).toBeChecked();
 await page.locator('input[value="2"]').check();await page.locator('input[value="3"]').check();await page.getByRole('button',{name:'Comprobar',exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('Correcto');
 await page.getByRole('button',{name:'Pregunta 3',exact:true}).click();await page.getByRole('button',{name:'Pregunta 1, respondida',exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('Correcto');await page.reload();await expect(page.locator('.feedback')).toContainText('Correcto');
 expect((await readState(page)).records.q001.correct).toBeTruthy();
});
test('un error aparece en progreso y puede repasarse solo',async({page})=>{
 await page.goto('./#repaso/tema/glosario');await page.getByRole('button',{name:'Empezar repaso'}).click();
 await page.locator('input[value="1"]').check();await page.getByRole('button',{name:'Comprobar',exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('Revisa esta respuesta');
 await page.locator('[data-nav="progreso"]').click();await page.getByRole('button',{name:'Repasar todos mis errores'}).click();
 await expect(page.locator('.number-grid button')).toHaveCount(1);await expect(page.locator('#question-heading')).toContainText('PLF');
});
test('examen oculta corrección, persiste, marca y entrega con preguntas en blanco',async({page})=>{
 await page.goto('./#examen');await page.getByLabel('Número de preguntas').selectOption('10');
 await page.getByLabel('Tiempo disponible').selectOption('0');await page.getByRole('button',{name:'Comenzar examen'}).click();
 await expect(page.locator('#exam-timer')).toContainText('Sin límite');
 const old=await readState(page);expect(old.exam.entries).toHaveLength(10);expect(new Set(old.exam.entries.map(e=>e.id)).size).toBe(10);
 await page.locator('input[name="answer"]').first().check();await page.getByRole('button',{name:'Marcar para revisar'}).click();
 await expect(page.locator('.feedback')).toHaveCount(0);await expect(page.getByRole('button',{name:'Comprobar',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Siguiente →',exact:true}).click();await page.reload();
 await page.getByRole('button',{name:'← Anterior',exact:true}).click();await expect(page.locator('input[name="answer"]:checked')).toHaveCount(1);
 await expect(page.locator('.flag-button')).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Finalizar examen',exact:true}).click();await expect(page.locator('#confirm-message')).toContainText('9 preguntas sin responder');
 await page.getByRole('button',{name:'Seguir respondiendo'}).click();await expect(page.locator('#confirm-dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Finalizar examen',exact:true}).click();await page.getByRole('button',{name:'Finalizar y corregir'}).click();
 await expect(page.getByRole('heading',{name:'Así fue tu simulacro.'})).toBeVisible();await expect(page.locator('.review-item')).toHaveCount(10);
 const completed=await readState(page);expect(completed.exam).toBeNull();expect(completed.history).toHaveLength(1);
 await page.goto('./#examen');await page.getByLabel('Número de preguntas').selectOption('10');await page.getByRole('button',{name:'Comenzar examen'}).click();
 expect((await readState(page)).exam.entries).not.toEqual(old.exam.entries);
});
test('el temporizador corrige al expirar incluso después de recargar',async({page})=>{
 await page.goto('./#examen');await page.getByLabel('Número de preguntas').selectOption('10');await page.getByRole('button',{name:'Comenzar examen'}).click();
 await expect(page.locator('#exam-timer')).toContainText(':');
 await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.exam.endAt=Date.now()-1000;localStorage.setItem(key,JSON.stringify(s));},KEY);
 await page.reload();await expect(page.getByRole('heading',{name:'Así fue tu simulacro.'})).toBeVisible();await expect(page.locator('.results-score')).toContainText('Tiempo agotado');
 expect((await readState(page)).history[0].results.every(r=>!r.correct)).toBeTruthy();
});
test('la preparación práctica y las notas persisten sin cuenta',async({page})=>{
 await page.goto('./#progreso');await page.locator('#task-equipo').check();await page.getByLabel('Dudas para mi instructor').fill('Revisar mi posición de salida.');
 await page.reload();await expect(page.locator('#task-equipo')).toBeChecked();await expect(page.getByLabel('Dudas para mi instructor')).toHaveValue('Revisar mi posición de salida.');
});
