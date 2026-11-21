import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const read=(file)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('language provider stores user language and switches document locale',()=>{
 const provider=read('client/src/i18n/index.tsx');
 assert.match(provider,/go_school_language_v1/);
 assert.match(provider,/localStorage\.setItem\(STORAGE_KEY,lang\)/);
 assert.match(provider,/document\.documentElement\.lang/);
 assert.match(provider,/function LanguageProvider|export function LanguageProvider/);
});
test('all fifteen English lessons include the ten teaching fields',()=>{
 const src=read('client/src/i18n/lessons.ts');
 for(let id=1;id<=15;id++)assert.match(src,new RegExp(`\\b${id}:\\{chapter:`));
 const fields=['chapter','title','badge','concept','why','task','hint','expand','mistake','success'];
 for(const name of fields){
   const count=(src.match(new RegExp(`\\b${name}:`,'g'))??[]).length;
   assert.ok(count>=15,`${name}: ${count} entries`);
 }
});
test('language buttons exist on app login, lobby and academy pages',()=>{
 const app=read('client/src/App.tsx');
 const academy=read('client/src/academy/Academy.tsx');
 assert.match(app,/language-top/);
 assert.match(app,/className="headright"/);
 assert.match(app,/className="language-switch"/);
 assert.match(academy,/className="language-switch"/);
 assert.match(read('client/src/main.tsx'),/<LanguageProvider><App\/><\/LanguageProvider>/);
});
