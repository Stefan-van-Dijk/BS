import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {csv,importOverview,addItem,validate} from './core.mjs';
test('Quoted CSV delimiters and escaped quotes',()=>assert.deepEqual(csv('a;"b;c"\r\n"d""e";f'),[['a','b;c'],['d"e','f']]));
test('Categories, shared ingredients and empty recipes',()=>{const c=importOverview('Home (c);Fruit (c);Gerechten (c)\nFruit (c);Appels (x);Ontbijt (a), Appels (x), Yoghurt, (a)\nGerechten (c);..;Nasi (a)');assert.equal(c.products.length,2);assert.equal(c.recipes[1].ingredients.length,0);assert.equal(c.recipes[0].ingredients[0].productId,c.products[0].id);validate({schemaVersion:1,...c,lists:[]});});
test('Merge only unchecked identical products with identical notes',()=>{const l={items:[]};addItem(l,'p',2,'large');addItem(l,'p',1,'large');addItem(l,'p',1,'small');assert.equal(l.items.length,2);assert.equal(l.items[0].quantity,3);l.items[0].done=true;addItem(l,'p',1,'large');assert.equal(l.items.length,3);assert.throws(()=>addItem(l,'p',0));});
test('Reject broken backup references',()=>assert.throws(()=>validate({schemaVersion:1,products:[],categories:[],recipes:[],lists:[{id:'l',name:'Week',items:[{id:'i',productId:'missing',quantity:1,note:'',done:false}]}]})));
if(process.env.BS_SOURCE)test('Full source and backup roundtrip',()=>{const c=importOverview(readFileSync(process.env.BS_SOURCE,'utf8'));assert.equal(c.categories.length,33);assert.equal(c.recipes.length,27);validate(JSON.parse(JSON.stringify({schemaVersion:1,...c,lists:[]})));console.log(`Import: ${c.categories.length} categories, ${c.products.length} products, ${c.recipes.length} recipes`);});

test('Visible quantity and minus preserve checked items and other products',async()=>{const {productQuantity,decreaseProduct}=await import('./core.mjs');const l={items:[{id:'a',productId:'p',quantity:2,done:false,note:'keep'},{id:'b',productId:'p',quantity:1,done:true,note:''},{id:'c',productId:'other',quantity:5,done:false,note:''}]};assert.equal(productQuantity(l,'p'),2);decreaseProduct(l,'p');assert.equal(productQuantity(l,'p'),1);decreaseProduct(l,'p');assert.equal(productQuantity(l,'p'),0);decreaseProduct(l,'p');assert.equal(l.items.length,2);assert.equal(l.items[0].done,true);assert.equal(productQuantity(l,'other'),5);});

test('Category cycles are removed while shared children and products remain',async()=>{
 const {removeCategoryCycles}=await import('./core.mjs');
 const categories=[{id:'h',name:'Home',entries:[{type:'category',id:'a'},{type:'category',id:'b'}]},{id:'a',entries:[{type:'category',id:'h'},{type:'category',id:'b'}]},{id:'b',entries:[{type:'category',id:'b'},{type:'product',id:'p'}]}];
 assert.equal(removeCategoryCycles(categories),2);
 assert.deepEqual(categories[1].entries,[{type:'category',id:'b'}]);
 assert.deepEqual(categories[2].entries,[{type:'product',id:'p'}]);
 assert.equal(removeCategoryCycles(categories),0);
});

test('Backups preserve favorites, package links and reusable activities',()=>{
 const data={schemaVersion:1,categories:[{id:'c',name:'Zuivel',entries:[{type:'product',id:'p'}]}],products:[{id:'p',name:'Melk',categoryId:'c',barcodes:['12345678'],favorite:true,purchaseCount:2,packages:[{barcode:'12345678',name:'Merk melk',quantity:'1 l',source:'https://world.openfoodfacts.org/product/12345678'}]}],recipes:[{id:'r',kind:'activity',name:'Weekend weg',categoryId:'c',ingredients:[{productId:'p',quantity:2,note:'Voor ontbijt'}]}],lists:[{id:'l',name:'Deze week',items:[]}]};
 const restored=validate(JSON.parse(JSON.stringify(data)));
 assert.equal(restored.products[0].favorite,true);assert.equal(restored.products[0].packages[0].quantity,'1 l');assert.equal(restored.recipes[0].kind,'activity');
 addItem(restored.lists[0],restored.recipes[0].ingredients[0].productId,2,'Voor ontbijt');assert.equal(restored.lists[0].items[0].productId,'p');assert.equal(restored.recipes[0].ingredients[0].quantity,2);
});

test('Beep gate rejects short clicks and sustained sounds, and debounces a beep',async()=>{
 const {createBeepGate}=await import('./core.mjs');const gate=createBeepGate();
 assert.equal(gate(0,true,2400),null);assert.equal(gate(20,true,2400),null);assert.equal(gate(150,false),null);
 gate(200,true,2400);gate(300,true,2400);assert.deepEqual(gate(430,false),{frequency:2400,duration:100});
 assert.equal(gate(500,true,2400),null);assert.equal(gate(700,false),null);
 gate(2000,true,2400);gate(3000,true,2400);assert.equal(gate(3150,false),null);
 gate(4000,true,2400);gate(4100,true,2400);assert.equal(gate(4230,false).frequency,2400);
});
test('Barcode output validates check digits and preserves leading zeroes',async()=>{
 const {barcodeFormat}=await import('./core.mjs');assert.equal(barcodeFormat('3274080005003'),'EAN13');assert.equal(barcodeFormat('012345678905'),'UPC');assert.equal(barcodeFormat('96385074'),'EAN8');assert.equal(barcodeFormat('3274080005004'),null);assert.equal(barcodeFormat('123'),null);assert.equal(barcodeFormat('abc'),null);
});


test('beep profiles are shared across lists, with location priority and chain fallback',async()=>{
 const {findBeepProfile,saveBeepProfile}=await import('./core.mjs');const profiles=[];
 const chain=saveBeepProfile(profiles,'Jumbo','',{frequency:2000,duration:100});
 const local=saveBeepProfile(profiles,'Jumbo','Zwolle Centrum',{frequency:3000,duration:120});
 assert.equal(findBeepProfile(profiles,' jumbo ','ZWOLLE CENTRUM'),local);
 assert.equal(findBeepProfile(profiles,'Jumbo','Andere winkel'),chain);
 assert.equal(findBeepProfile(profiles,'AH',''),null);
 const id=local.id;saveBeepProfile(profiles,'Jumbo','Zwolle Centrum',{frequency:3100,duration:130});
 assert.equal(profiles.length,2);assert.equal(local.id,id);assert.equal(local.frequency,3100);
 const restored=JSON.parse(JSON.stringify({lists:[{id:'a'},{id:'b'}],beepProfiles:profiles}));
 assert.equal(findBeepProfile(restored.beepProfiles,'Jumbo','').frequency,2000);
 assert.throws(()=>saveBeepProfile(profiles,'','',{frequency:2000}));
});
