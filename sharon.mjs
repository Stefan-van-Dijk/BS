// Identity stays in Sharon's existing same-origin IndexedDB; never in a URL.
let service;
export async function connectSharon(){
 if(location.origin!=='https://stefan-van-dijk.github.io')throw Error('Open ShopList en Sharon op hun GitHub Pages-adres om dezelfde identiteit te gebruiken.');
 if(!service){
  const [{ObjectStore},{ShopListService}]=await Promise.all([
   import('/sharon/src/core/storage/ObjectStore.js?v=0.4.74'),
   import('/sharon/src/core/shoplist/ShopListService.js?v=0.4.74')]);
  service=new ShopListService(await new ObjectStore().open());
 }
 return service;
}
export function snapshot(state,list){
 const source=[...new Set(list.items.map(i=>i.productId))].map(id=>state.products.find(p=>p.id===id));
 const products=source.map(p=>{const {remoteId,...rest}=p;return {...rest,id:remoteId||p.id,categoryId:state.categories.find(c=>c.id===p.categoryId)?.remoteId||p.categoryId};});
 const categoryIds=new Set(source.map(p=>p.categoryId));
 const categories=state.categories.filter(c=>categoryIds.has(c.id)).map(c=>({id:c.remoteId||c.id,name:c.name,entries:[]}));
 const {cloud,...clean}=list;
 return {list:{...clean,items:clean.items.map(i=>({...i,productId:source.find(p=>p.id===i.productId)?.remoteId||i.productId}))},products,categories};
}
export function installSnapshot(state,payload,cloud){
 const {list,products,categories}=payload;
 const prefix='shared-'+list.id+'-';
 const categoryMap=new Map(categories.map(c=>[c.id,prefix+c.id]));
 const productMap=new Map(products.map(p=>[p.id,prefix+p.id]));
 // Replace only records belonging to this list, never a personal catalogue item.
 for(const c of categories){const id=categoryMap.get(c.id),old=state.categories.find(x=>x.id===id);const row={...c,id,remoteId:c.id,entries:[]};if(old)Object.assign(old,row);else state.categories.push(row);}
 for(const p of products){const id=productMap.get(p.id),row={...p,id,remoteId:p.id,categoryId:categoryMap.get(p.categoryId)};const old=state.products.find(x=>x.id===id);if(old)Object.assign(old,row);else state.products.push(row);}
 const result={...list,items:list.items.map(i=>({...i,productId:productMap.get(i.productId)})),cloud};
 const index=state.lists.findIndex(l=>l.id===list.id);if(index<0)state.lists.push(result);else state.lists[index]=result;
 return result;
}
