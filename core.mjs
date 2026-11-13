export const norm = s => String(s).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('nl');
export const uid = () => crypto.randomUUID();
export function csv(text, delimiter=';') {
 const rows=[]; let row=[],field='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(field);field='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}else field+=c;}
 if(quoted)throw Error('Een aanhalingsteken is niet afgesloten.');
 if(field||row.length){row.push(field);rows.push(row);}return rows;
}
export function importOverview(text){
 const rows=csv(text), headers=rows.shift();
 if(!headers||headers.length<2||!headers.some(s=>s.includes('(c)')))throw Error('Kies het volledige bestand overzicht-BS.csv met categorieën in kolommen.');
 const clean=s=>s.replace(/\s*\([caxy]\)/g,'').trim();
 const categories=headers.map(h=>({id:uid(),name:clean(h),entries:[]})), products=[],recipes=[],map=new Map();
 const product=(raw,categoryId)=>{let name=clean(raw);const key=norm(name);if(!name)return null;if(map.has(key))return map.get(key);const p={id:uid(),name,categoryId,barcodes:[],input:raw.includes('(x)')?'amount':raw.includes('(y)')?'note':'plain'};products.push(p);map.set(key,p.id);return p.id;};
 // First register all explicit products to retain their original category.
 rows.forEach(row=>row.forEach((raw,i)=>{let s=raw.trim();if(categories[i]&&s&&!['..','…','<'].includes(s)&&!s.includes('(c)')&&!s.includes('(a)'))product(s,categories[i].id);}));
 rows.forEach(row=>row.forEach((raw,i)=>{const cat=categories[i],s=raw.trim();if(!cat||!s||['..','…','<'].includes(s))return;
 if(s.includes('(c)')){const target=categories.find(c=>norm(c.name)===norm(clean(s)));if(!target)throw Error('Onbekende categorie: '+s);cat.entries.push({type:'category',id:target.id});}
 else if(s.includes('(a)')){const parts=s.split(',').map(x=>x.trim()).filter(x=>x&&x!=='(a)');const recipe={id:uid(),name:clean(parts.shift()),categoryId:cat.id,ingredients:parts.map(v=>({productId:product(v,cat.id),quantity:1,note:''}))};recipes.push(recipe);cat.entries.push({type:'recipe',id:recipe.id});}
 else cat.entries.push({type:'product',id:product(s,cat.id)});
 }));
 return {categories,products,recipes};
}
export function addItem(list,productId,quantity=1,note=''){
 if(!Number.isFinite(quantity)||quantity<=0)throw Error('Vul een positief aantal in.');
 const existing=list.items.find(i=>i.productId===productId&&i.note===note&&!i.done);
 if(existing)existing.quantity+=quantity;else list.items.push({id:uid(),productId,quantity,note,done:false});
}
export function validate(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.products)||!Array.isArray(data.categories)||!Array.isArray(data.recipes)||!Array.isArray(data.lists))throw Error('Onbekend back-upformaat.');
 const ids=new Set();for(const x of [...data.products,...data.categories,...data.recipes,...data.lists]){if(typeof x.id!=='string'||!x.id||ids.has(x.id)||typeof x.name!=='string')throw Error('Ongeldige of dubbele ID.');ids.add(x.id);}
 const ps=new Set(data.products.map(p=>p.id)),cs=new Set(data.categories.map(c=>c.id)),rs=new Set(data.recipes.map(r=>r.id));
 for(const p of data.products)if(!cs.has(p.categoryId)||!Array.isArray(p.barcodes)||p.barcodes.some(b=>typeof b!=='string'))throw Error('Ongeldig product.');
 for(const c of data.categories){if(!Array.isArray(c.entries))throw Error('Ongeldige categorie.');for(const e of c.entries)if(!(e.type==='category'?cs:e.type==='product'?ps:e.type==='recipe'?rs:new Set()).has(e.id))throw Error('Ontbrekende menukoppeling.');}
 for(const r of data.recipes){if(!cs.has(r.categoryId)||!Array.isArray(r.ingredients))throw Error('Ongeldig gerecht.');for(const i of r.ingredients)if(!ps.has(i.productId)||!Number.isFinite(i.quantity)||i.quantity<=0||typeof i.note!=='string')throw Error('Ongeldig ingrediënt.');}
 for(const l of data.lists){if(!Array.isArray(l.items))throw Error('Ongeldige lijst.');const itemIds=new Set();for(const i of l.items){if(typeof i.id!=='string'||itemIds.has(i.id)||!ps.has(i.productId)||!Number.isFinite(i.quantity)||i.quantity<=0||typeof i.note!=='string'||typeof i.done!=='boolean')throw Error('Ongeldige lijstregel.');itemIds.add(i.id);}}
 return data;
}

// Add published catalog once per version; retain local names, barcodes, IDs and lists.
export function mergeCatalog(current, catalog) {
 validate(current);validate(catalog);
 if(current.catalogVersion===catalog.catalogVersion)return current;
 const next=structuredClone(current), mappings={category:new Map(),product:new Map(),recipe:new Map()},added=new Set();
 for(const [type,group] of [['category','categories'],['product','products'],['recipe','recipes']]){
  for(const item of catalog[group]){
   let match=next[group].find(x=>x.id===item.id)||next[group].find(x=>norm(x.name)===norm(item.name));
   if(!match){match=structuredClone(item);if(type==='category')match.entries=[];next[group].push(match);added.add(match.id);}
   mappings[type].set(item.id,match.id);
  }
 }
 for(const p of next.products)if(added.has(p.id))p.categoryId=mappings.category.get(p.categoryId);
 for(const r of next.recipes)if(added.has(r.id)){r.categoryId=mappings.category.get(r.categoryId);r.ingredients.forEach(i=>i.productId=mappings.product.get(i.productId));}
 for(const c of catalog.categories){const target=next.categories.find(x=>x.id===mappings.category.get(c.id));for(const e of c.entries){const id=mappings[e.type].get(e.id);if(!target.entries.some(x=>x.type===e.type&&x.id===id))target.entries.push({type:e.type,id});}}
 next.catalogVersion=catalog.catalogVersion;validate(next);return next;
}

export function productQuantity(list, productId){return (list?.items||[]).filter(i=>i.productId===productId&&!i.done).reduce((sum,i)=>sum+i.quantity,0);}
export function decreaseProduct(list,productId){
 if(!list)return;
 const item=[...list.items].reverse().find(i=>i.productId===productId&&!i.done);
 if(!item)return;
 if(item.quantity>1)item.quantity=Math.round((item.quantity-1)*1e9)/1e9;
 else list.items=list.items.filter(i=>i.id!==item.id);
}
