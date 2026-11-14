import {cpSync,existsSync,mkdirSync,readdirSync,readFileSync,rmSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
const out=resolve('public');rmSync(out,{recursive:true,force:true});mkdirSync(out);
const files=['index.html','style.css',...readdirSync('.').filter(p=>p.endsWith('.mjs')&&!p.endsWith('.test.mjs'))];
for(const path of [...files,'data','vendor','assets'])cpSync(path,resolve(out,path),{recursive:true});
const seen=new Set();
function verify(file){
 if(seen.has(file))return;seen.add(file);const code=readFileSync(file,'utf8');
 const refs=extname(file)==='.html'?[...code.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]):[...code.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)['"](\.[^'"]+)['"]/g)].map(m=>m[1]);
 for(const ref of refs){if(ref.startsWith('/')||/^[a-z]+:/i.test(ref))continue;const clean=ref.split(/[?#]/)[0];if(!clean||clean.endsWith('/'))continue;const target=resolve(dirname(file),clean);if(!target.startsWith(out+'/')||!existsSync(target))throw Error('Ontbrekend publicatiebestand: '+ref);if(/\.(?:mjs|js)$/.test(target)&&!target.includes('/vendor/'))verify(target);}
}
verify(resolve(out,'index.html'));console.log('Publicatiepakket gecontroleerd: '+seen.size+' HTML/JS-bestanden en alle lokale verwijzingen.');
