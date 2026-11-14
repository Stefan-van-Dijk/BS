// Personal gift information must never be included in the public seed catalog.
export function publicCatalog(input) {
 const out=structuredClone(input);
 const gift=name=>/\bcadeau(?:s|tjes)?\b/i.test(name);
 const categories=new Set(out.categories.filter(c=>gift(c.name)).map(c=>c.id));
 const products=new Set(out.products.filter(p=>categories.has(p.categoryId)||gift(p.name)).map(p=>p.id));
 const recipes=new Set(out.recipes.filter(r=>categories.has(r.categoryId)||gift(r.name)).map(r=>r.id));
 out.categories=out.categories.filter(c=>!categories.has(c.id));
 out.products=out.products.filter(p=>!products.has(p.id));
 out.recipes=out.recipes.filter(r=>!recipes.has(r.id));
 for(const c of out.categories)c.entries=c.entries.filter(e=>!(e.type==='category'?categories:e.type==='product'?products:recipes).has(e.id));
 for(const r of out.recipes)r.ingredients=r.ingredients.filter(i=>!products.has(i.productId));
 // The published catalog is a seed, never a user's shopping-list backup.
 out.lists=[];
 delete out.deletedLists;
 out.sourceFiles=(out.sourceFiles||[]).filter(s=>!gift(s));
 return out;
}
