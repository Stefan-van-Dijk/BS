import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {importOverview,norm,csv,validate} from '../core.mjs';
const directory=process.argv[2];if(!directory)throw Error('Geef de map met CSV-bestanden op.');
const read=n=>readFileSync(directory+'/'+n,'utf8');const catalog=importOverview(read('overzicht-BS.csv'));
const clean=s=>s.replace(/\s*\([caxy]\)/g,'').trim();
const mapping={BabySpullen:'Baby Spullen',BroodEnBeleg:'Brood & Ontbijt',OverigNonFood:'Overig Non-Food',TussendoortjesLekkers:'Tussendoortjes / Lekkers'};
const category=name=>{name=mapping[name]||name;let c=catalog.categories.find(c=>norm(c.name)===norm(name));if(!c){c={id:crypto.randomUUID(),name,entries:[]};catalog.categories.push(c);catalog.categories[0].entries.push({type:'category',id:c.id});}return c;};
function product(raw,c,source){const name=clean(raw);let p=catalog.products.find(p=>norm(p.name)===norm(name));if(!p){p={id:crypto.randomUUID(),name,categoryId:c.id,barcodes:[],input:raw.includes('(x)')?'amount':raw.includes('(y)')?'note':'plain',sources:[]};catalog.products.push(p);}p.sources??=[];if(!p.sources.includes(source))p.sources.push(source);if(!c.entries.some(e=>e.type==='product'&&e.id===p.id))c.entries.push({type:'product',id:p.id});return p;}
for(const group of ['categories','products','recipes'])for(const x of catalog[group])x.sources=['overzicht-BS.csv'];
const sources=readdirSync(directory).filter(n=>n.endsWith('.csv')).sort();
for(const source of sources){if(!source.startsWith('BS-')||['BS-Categorie.csv','BS-Avondeten.csv'].includes(source))continue;const c=category(source.slice(3,-4));for(const line of read(source).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&s!=='<'))product(line,c,source);}
// Retain older recipe variants explicitly instead of merging contradictory ingredients.
const evening=category('Avondeten');
for(const line of read('BS-Avondeten.csv').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&s!=='<')){
 const parts=line.split(',').map(s=>s.trim()).filter(Boolean);const first=parts.shift();let name=first.replace(/:$/,'');if(!first.endsWith(':')&&parts.length)parts.unshift(first);name=({'Pannenkoekenmix':'Pannenkoeken','Witlof':'Witlof'}[name]||name);
 const original=catalog.recipes.find(r=>norm(r.name)===norm(name));
 const names=original?.ingredients.map(i=>norm(catalog.products.find(p=>p.id===i.productId).name))||[];
 if(original&&(!parts.length||JSON.stringify(names)===JSON.stringify(parts.map(norm)))){original.sources.push('BS-Avondeten.csv');continue;}
 const ingredients=parts.map(raw=>({productId:product(raw,evening,'BS-Avondeten.csv').id,quantity:1,note:''}));
 const r={id:crypto.randomUUID(),name:name+(original?' — variant losse lijst':''),categoryId:evening.id,ingredients,sources:['BS-Avondeten.csv']};catalog.recipes.push(r);evening.entries.push({type:'recipe',id:r.id});
}
// Vegetable worksheets contain repeated columns, not separate quantities.
for(const source of ['Werkblad 1-BS.csv','Werkblad 1-BS-1.csv'])for(const row of csv(read(source)))for(const cell of row){const s=cell.trim();if(s&&!['..','…'].includes(s)&&!s.includes('(c)'))product(s,category('Groenten'),source);}
// Soup excerpt and category index confirm the main table; verify they resolve.
for(const line of read('overzicht-BS-1.csv').split(/\r?\n/).filter(s=>s.trim())){const r=catalog.recipes.find(r=>norm(r.name)===norm(clean(line.split(',')[0])));if(!r)throw Error('Onbekende soep');r.sources.push('overzicht-BS-1.csv');}
for(const line of read('BS-Categorie.csv').split(/\r?\n/).filter(s=>s.trim()))category(line.trim());
// Stable public IDs independent of build order.
const ids=new Map();for(const group of ['categories','products','recipes'])for(const x of catalog[group])ids.set(x.id,group.slice(0,1)+'_'+createHash('sha256').update(norm(x.name)).digest('hex').slice(0,16));
for(const c of catalog.categories){c.id=ids.get(c.id);c.entries=c.entries.map(e=>({...e,id:ids.get(e.id)}));}
for(const p of catalog.products){p.id=ids.get(p.id);p.categoryId=ids.get(p.categoryId);}
for(const r of catalog.recipes){r.id=ids.get(r.id);r.categoryId=ids.get(r.categoryId);r.ingredients.forEach(i=>i.productId=ids.get(i.productId));}
const output={schemaVersion:1,catalogVersion:'2026-11-13-1',...catalog,lists:[],sourceFiles:sources};validate(output);
writeFileSync(new URL('../data/catalog.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({categories:catalog.categories.length,products:catalog.products.length,recipes:catalog.recipes.length,sources:sources.length}));
