import {norm,uid,importOverview,addItem,validate,mergeCatalog,productQuantity,decreaseProduct,removeCategoryCycles} from './core.mjs?v=20261113-life1';
const $=s=>document.querySelector(s), el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const KEY='bs.app.v1';let state={schemaVersion:1,categories:[],products:[],recipes:[],lists:[{id:uid(),name:'Deze week',items:[]}]},activeList,view='home',path=[],saveBlocked=false,stopCamera=()=>{};
try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw));}catch{saveBlocked=true;$('#saveStatus').textContent='Opgeslagen gegevens konden niet worden gelezen. Exporteer eerst je oorspronkelijke back-up.';}
removeCategoryCycles(state.categories);const expanded=new Set();activeList=state.lists[0]?.id;let timer;
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',3600);}
function save(){removeCategoryCycles(state.categories);if(saveBlocked){toast('Opslaan geblokkeerd: herstel eerst een geldige back-up.');return;}try{localStorage.setItem(KEY,JSON.stringify(state));$('#saveStatus').textContent='Lokaal bewaard in deze browser';}catch{$('#saveStatus').textContent='Opslaan mislukt — maak nu een back-up.';toast('Opslag vol of niet beschikbaar. Maak een back-up.');}}
const list=()=>state.lists.find(l=>l.id===activeList),prod=id=>state.products.find(p=>p.id===id),cat=id=>state.categories.find(c=>c.id===id);
function btn(text,fn,cls='secondary'){const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;}
function field(label,type,value=''){const l=el('label',label,'field'),input=el('input');input.type=type;input.value=value;l.append(input);$('#modalBody').append(l);return input;}
function categoryField(value){const l=el('label','Categorie','field'),s=el('select');for(const c of state.categories.filter(c=>c.name!=='Home')){const o=el('option',c.name);o.value=c.id;s.append(o);}s.value=value||s.options[0]?.value||'';l.append(s);$('#modalBody').append(l);return s;}
function openModal(title,build,onSubmit,action='Bewaren'){$('#modalTitle').textContent=title;$('#modalBody').replaceChildren();$('#modalSave').textContent=action;build();$('#modalForm').onsubmit=e=>{e.preventDefault();try{if(onSubmit()!==false)closeModal();}catch(err){toast(err.message);}};$('#modal').showModal();}
function closeModal(){stopCamera();$('#modal').close();}
$('#closeModal').onclick=closeModal;$('#modal').addEventListener('close',()=>stopCamera());$('#modal').addEventListener('cancel',()=>stopCamera());
function switchView(v){view=v;for(const id of ['home','shop','lists','manage'])$('#'+id).hidden=id!==v;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));render();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
function render(){
 $('#welcome').hidden=state.products.length>0||view!=='shop';$('#count').textContent=list()?.items.filter(i=>!i.done).length||0;
 const sel=$('#listSelect');sel.replaceChildren();state.lists.forEach(l=>{const o=el('option',l.name);o.value=l.id;sel.append(o);});sel.value=activeList||'';
 if(view==='home')renderHome();if(view==='shop')renderShop();if(view==='lists')renderList($('#listRows'),$('#onlyNeeded').checked);if(view==='manage')renderManage();
}
function renderShop(){const q=norm($('#search').value),cards=$('#cards'),crumbs=$('#crumbs');cards.replaceChildren();crumbs.replaceChildren();
 let entries;if(q)entries=[...state.products.filter(p=>norm(p.name).includes(q)).map(p=>({type:'product',id:p.id})),...state.recipes.filter(r=>norm(r.name).includes(q)).map(r=>({type:'recipe',id:r.id}))];else{const home=state.categories.find(c=>c.name==='Home');entries=home?home.entries:state.categories.map(c=>({type:'category',id:c.id}));}
 function appendEntries(entries,target,ancestors=[]){
 for(const item of entries){
 const obj=item.type==='product'?prod(item.id):item.type==='category'?cat(item.id):state.recipes.find(r=>r.id===item.id);if(!obj)continue;
 if(item.type==='product'){
  const row=el('div',undefined,'productLine');row.dataset.productId=obj.id;
  const minus=btn('−',()=>{decreaseProduct(list(),obj.id);save();refreshQuantities();},'step minus');minus.setAttribute('aria-label',obj.name+' verminderen');
  const main=btn(obj.name,()=>quickAdd(obj),'productName');main.setAttribute('aria-label',obj.name+' toevoegen');main.title='Lang indrukken voor aantal en notitie; swipe om te bewerken';
  const qty=el('output',undefined,'productQuantity');qty.setAttribute('aria-label','Aantal '+obj.name);qty.setAttribute('aria-live','polite');
  const plus=btn('+',()=>quickAdd(obj),'step plus');plus.setAttribute('aria-label',obj.name+' verhogen');plus.title='Lang indrukken voor aantal en notitie';
  main.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();editProduct(obj);}};
  row.append(minus,main,qty,plus);hold(row,()=>chooseProduct(obj),e=>!e.target.closest('.minus'));swipeEdit(row,()=>editProduct(obj));target.append(row);
 }else if(item.type==='category'){
  if(ancestors.includes(obj.id))continue;
  const key=[...ancestors,obj.id].join('/'),branch=el('details',undefined,'categoryBranch'),summary=el('summary',obj.name),children=el('div',undefined,'treeChildren');
  branch.open=expanded.has(key);branch.append(summary,children);branch.ontoggle=()=>{if(branch.open)expanded.add(key);else expanded.delete(key);};
  appendEntries(obj.entries,children,[...ancestors,obj.id]);target.append(branch);
 }else{
  const row=btn('',()=>chooseRecipe(obj),'browseLine');row.append(el('span',obj.name),el('small',obj.ingredients.length+' ingrediënten'),el('span','›','chevron'));target.append(row);
 }
 }
 }
 appendEntries(entries,cards);
 refreshQuantities();
 if(!entries.length)cards.append(el('p',q?'Geen resultaten. Voeg een product toe via Beheren.':'Laad je overzicht om te beginnen.','empty'));
}
function ensureList(){if(!list()){const l={id:uid(),name:'Boodschappen',items:[]};state.lists.push(l);activeList=l.id;}}
function refreshQuantities(){
 document.querySelectorAll('.productLine').forEach(row=>{const amount=productQuantity(list(),row.dataset.productId);row.querySelector('output').textContent=new Intl.NumberFormat('nl-NL',{maximumFractionDigits:3}).format(amount);row.querySelector('.minus').disabled=amount<=0;row.classList.toggle('selected',amount>0);});
 $('#count').textContent=list()?.items.filter(i=>!i.done).length||0;
}
function quickAdd(p){ensureList();addItem(list(),p.id);save();if(view==='home')renderHome();else refreshQuantities();}
function hold(element,action,accept=()=>true){
 let timer,start,suppress=false;
 const cancel=()=>{clearTimeout(timer);timer=null;};
 element.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||!accept(e))return;suppress=false;start=[e.clientX,e.clientY];timer=setTimeout(()=>{timer=null;suppress=true;action();},500);});
 element.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>10)cancel();});
 for(const event of ['pointerup','pointercancel','pointerleave'])element.addEventListener(event,cancel);
 element.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
 element.addEventListener('contextmenu',e=>e.preventDefault());
}
function swipeEdit(row,action){
 let start=null,suppress=false;
 row.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||e.target.closest('input,select,.minus'))return;start=[e.clientX,e.clientY];suppress=false;});
 row.addEventListener('pointermove',e=>{if(start&&Math.abs(e.clientY-start[1])>30)start=null;});
 row.addEventListener('pointerup',e=>{if(start&&Math.abs(e.clientX-start[0])>=65&&Math.abs(e.clientY-start[1])<30){suppress=true;action();}start=null;});
 row.addEventListener('pointercancel',()=>start=null);row.addEventListener('pointerleave',()=>start=null);
 row.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
}
function chooseProduct(p,item){
 item=item||list()?.items.find(i=>i.productId===p.id&&!i.done);let quantity,note;
 openModal(p.name,()=>{quantity=field('Aantal','number',String(item?.quantity||1));quantity.min='0.01';quantity.step='any';note=field('Notitie (optioneel)','text',item?.note||'');},()=>{
 const amount=Number(quantity.value);if(!Number.isFinite(amount)||amount<=0)throw Error('Vul een positief aantal in.');
 if(item){item.quantity=amount;item.note=note.value.trim();}else{ensureList();addItem(list(),p.id,amount,note.value.trim());}save();render();
 },item?'Bewaren':'Toevoegen');
}
function chooseRecipe(r){let checks=[];openModal(r.name,()=>{if(!r.ingredients.length){$('#modalBody').append(el('p','Dit gerecht heeft nog geen ingrediënten. Vul het aan via Beheren.'));return;}
 $('#modalBody').append(el('p','Vink uit wat je al in huis hebt. Hoeveelheden in productnamen blijven letterlijk behouden.'));
 r.ingredients.forEach(i=>{const l=el('label',undefined,'checkrow'),c=el('input');c.type='checkbox';c.checked=true;l.append(c,el('span',`${i.quantity} × ${prod(i.productId)?.name}${i.note?' · '+i.note:''}`));$('#modalBody').append(l);checks.push([c,i]);});},()=>{ensureList();let n=0;checks.forEach(([c,i])=>{if(c.checked){addItem(list(),i.productId,i.quantity,i.note);n++;}});save();render();toast(n+' ingrediënten toegevoegd');},'Selectie toevoegen');}
function renderList(target=$('#listRows'),neededOnly=false){target.replaceChildren();const l=list();$('#progress').textContent=l?`${l.items.filter(i=>i.done).length} van ${l.items.length} afgevinkt`: 'Maak een lijst om te beginnen.';if(!l?.items.length){target.append(el('p','Je lijst is nog leeg. Kies producten of een gerecht bij Samenstellen.','empty'));return;}
 const groups=new Map();for(const item of l.items.filter(i=>!neededOnly||!i.done)){const name=cat(prod(item.productId)?.categoryId)?.name||'Overig';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);}
 for(const [name,items]of groups){target.append(el('h3',name,'sectionLabel'));items.sort((a,b)=>Number(a.done)-Number(b.done)).forEach(i=>{const row=el('div',undefined,'row'+(i.done?' done':'')),check=el('input');check.type='checkbox';check.checked=i.done;check.setAttribute('aria-label',prod(i.productId).name+' afvinken');check.onchange=()=>{i.done=check.checked;if(i.done&&!i.purchaseRecorded){i.purchaseRecorded=true;const p=prod(i.productId);p.purchaseCount=(p.purchaseCount||0)+1;p.lastPurchased=Date.now();}save();render();};const text=el('div',undefined,'text');text.append(el('strong',prod(i.productId).name));if(i.note)text.append(el('small',i.note));const qty=el('input');qty.type='number';qty.min='.01';qty.step='any';qty.value=i.quantity;qty.setAttribute('aria-label','Aantal '+prod(i.productId).name);qty.onchange=()=>{const v=Number(qty.value);if(v>0&&Number.isFinite(v)){i.quantity=v;save();}else{qty.value=i.quantity;toast('Vul een positief aantal in.');}};row.append(check,text,qty,btn('✕',()=>{l.items=l.items.filter(x=>x.id!==i.id);save();render();},'quiet'));row.lastChild.setAttribute('aria-label','Verwijder '+prod(i.productId).name);hold(text,()=>chooseProduct(prod(i.productId),i));text.tabIndex=0;text.title='Lang indrukken voor aantal en notitie; swipe om te bewerken';text.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();editProduct(prod(i.productId));}};swipeEdit(row,()=>editProduct(prod(i.productId)));target.append(row);});}
}
$('#search').oninput=renderShop;$('#manageSearch').oninput=renderManage;$('#listSelect').onchange=e=>{activeList=e.target.value;render();};
$('#newList').onclick=()=>{let name;openModal('Nieuwe lijst',()=>name=field('Naam','text'),()=>{if(!name.value.trim())throw Error('Geef de lijst een naam.');const l={id:uid(),name:name.value.trim(),items:[]};state.lists.push(l);activeList=l.id;save();render();});};
$('#renameList').onclick=()=>{if(!list())return;let name;openModal('Lijst hernoemen',()=>name=field('Naam','text',list().name),()=>{if(!name.value.trim())throw Error('Geef de lijst een naam.');list().name=name.value.trim();save();render();});};
$('#deleteList').onclick=()=>{if(list()&&confirm('Deze lijst verwijderen?')){state.lists=state.lists.filter(l=>l.id!==activeList);activeList=state.lists[0]?.id;save();render();}};
$('#clearDone').onclick=()=>{if(list()&&confirm('Alle afgevinkte regels verwijderen?')){list().items=list().items.filter(i=>!i.done);save();render();}};
$('#share').onclick=async()=>{if(!list())return;const text=list().name+'\n'+list().items.map(i=>`${i.done?'✓':'□'} ${i.quantity} × ${prod(i.productId).name}${i.note?' — '+i.note:''}`).join('\n');try{if(navigator.share)await navigator.share({title:list().name,text});else{await navigator.clipboard.writeText(text);toast('Lijst gekopieerd');}}catch(e){if(e.name!=='AbortError'){openModal('Kopieer je lijst',()=>{const t=el('textarea');t.value=text;$('#modalBody').append(t);},()=>{},'Sluiten');}}};
function renderManage(){const target=$('#manageRows');target.replaceChildren();const q=norm($('#manageSearch').value);for(const [kind,arr]of [['Gerecht',state.recipes],['Product',state.products]])for(const p of arr.filter(p=>norm(p.name).includes(q))){const row=el('div',undefined,'row'),text=el('div',undefined,'text');text.append(el('strong',p.name),el('small',kind+' · '+cat(p.categoryId)?.name));if(kind==='Product'){hold(text,()=>chooseProduct(p));swipeEdit(row,()=>editProduct(p));}row.append(text,btn('Bewerken',()=>kind==='Gerecht'?editRecipe(p):editProduct(p)));target.append(row);}}
function moveEntry(type,id,old,newId){if(old===newId)return;state.categories.forEach(c=>c.entries=c.entries.filter(e=>e.type!==type||e.id!==id));cat(newId).entries.push({type,id});}
function editProduct(p){if(!state.categories.length){toast('Voeg eerst een categorie toe.');return;}let name,category,barcodes,input,favorite;openModal(p?'Product bewerken':'Nieuw product',()=>{name=field('Naam','text',p?.name||'');category=categoryField(p?.categoryId);barcodes=field('Barcodes (gescheiden door komma’s)','text',p?.barcodes.join(', ')||'');input={value:'plain'};favorite=field('Favoriet','checkbox');favorite.checked=!!p?.favorite;for(const pack of p?.packages||[]){const info=el('p',[pack.name,pack.brand,pack.quantity].filter(Boolean).join(' · '),'hint');const link=el('a','Open Food Facts · ODbL');link.href='https://world.openfoodfacts.org/product/'+encodeURIComponent(pack.barcode);link.target='_blank';link.rel='noopener';info.append(' ',link);$('#modalBody').append(info);}
 cameraControl($('#modalBody'),value=>{
 const codes=barcodes.value.split(',').map(s=>s.trim()).filter(Boolean);
 if(!codes.includes(value))codes.push(value);barcodes.value=codes.join(', ');
 toast('Barcode ingevuld. Kies Bewaren om te koppelen.');
 });},()=>{const value=name.value.trim();if(!value)throw Error('Vul een naam in.');if(state.products.some(x=>x.id!==p?.id&&norm(x.name)===norm(value)))throw Error('Deze productnaam bestaat al.');const codes=barcodes.value.split(',').map(s=>s.trim()).filter(Boolean);if(codes.some(b=>state.products.some(x=>x.id!==p?.id&&x.barcodes.includes(b))))throw Error('Een barcode is al gekoppeld aan een ander product.');if(!['plain','amount','note'].includes(input.value))throw Error('Kies Standaard, Aantal of Omschrijving.');if(p){moveEntry('product',p.id,p.categoryId,category.value);Object.assign(p,{name:value,categoryId:category.value,barcodes:codes,input:input.value,favorite:favorite.checked});}else{const item={id:uid(),name:value,categoryId:category.value,barcodes:codes,input:input.value,favorite:favorite.checked};state.products.push(item);cat(category.value).entries.push({type:'product',id:item.id});}save();render();});}
$('#newProduct').onclick=()=>editProduct();
$('#newCategory').onclick=()=>{let name;openModal('Nieuwe categorie',()=>name=field('Naam','text'),()=>{const value=name.value.trim();if(!value||state.categories.some(c=>norm(c.name)===norm(value)))throw Error('Kies een unieke categorienaam.');const c={id:uid(),name:value,entries:[]};state.categories.push(c);const home=state.categories.find(c=>c.name==='Home');if(home)home.entries.push({type:'category',id:c.id});save();render();});};
function editRecipe(r,kind='recipe'){if(!state.categories.length){toast('Voeg eerst een categorie toe.');return;}let name,category,ingredients;openModal(r?.kind==='activity'||kind==='activity'?'Activiteit bewerken':r?'Gerecht bewerken':'Nieuw gerecht',()=>{name=field('Naam','text',r?.name||'');category=categoryField(r?.categoryId);$('#modalBody').append(el('p','Eén ingrediënt per regel: aantal | productnaam | notitie. Nieuwe productnamen worden toegevoegd.','hint'));ingredients=el('textarea');ingredients.setAttribute('aria-label','Ingrediënten');ingredients.value=r?.ingredients.map(i=>`${i.quantity} | ${prod(i.productId).name} | ${i.note}`).join('\n')||'';$('#modalBody').append(ingredients);},()=>{if(!name.value.trim())throw Error('Vul een naam in.');const lines=ingredients.value.split('\n').filter(x=>x.trim()).map(line=>{const [q,n,...note]=line.split('|').map(s=>s.trim());if(!n||!Number.isFinite(Number(q))||Number(q)<=0)throw Error('Gebruik: 1 | productnaam | notitie');return {quantity:Number(q),name:n,note:note.join(' | ')};});const result=lines.map(i=>{let p=state.products.find(p=>norm(p.name)===norm(i.name));if(!p){p={id:uid(),name:i.name,categoryId:category.value,barcodes:[],input:'plain'};state.products.push(p);cat(category.value).entries.push({type:'product',id:p.id});}return {productId:p.id,quantity:i.quantity,note:i.note};});if(r){moveEntry('recipe',r.id,r.categoryId,category.value);Object.assign(r,{name:name.value.trim(),categoryId:category.value,ingredients:result});}else{const item={id:uid(),kind,name:name.value.trim(),categoryId:category.value,ingredients:result};state.recipes.push(item);cat(category.value).entries.push({type:'recipe',id:item.id});}save();render();});}
$('#newRecipe').onclick=()=>editRecipe();
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#backup').onclick=()=>{if(saveBlocked){download('bs-oorspronkelijke-opslag.json',localStorage.getItem(KEY)||'');return;}download('bs-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(state,null,2));};
function importFile(mode){const file=$('#file');file.accept=mode==='csv'?'.csv':'.json';file.value='';file.onchange=async()=>{try{const text=await file.files[0].text();if(mode==='csv'){if(state.lists.some(l=>l.items.length))throw Error('Maak eerst een back-up en maak je lijsten leeg voordat je een catalogus vervangt.');const catalog=importOverview(text);if(state.products.length&&!confirm('De bestaande catalogus vervangen?'))return;Object.assign(state,catalog);path=[];}else{const restored=validate(JSON.parse(text));if(!confirm('Je huidige gegevens vervangen door deze back-up?'))return;state=restored;activeList=state.lists[0]?.id;path=[];saveBlocked=false;}save();render();toast('Gegevens ingeladen');}catch(e){toast(e.message);}};file.click();}
$('#firstImport').onclick=$('#importCsv').onclick=()=>importFile('csv');$('#restore').onclick=()=>importFile('json');

let barcodeLibrary;
function loadBarcodeReader(){
 if(window.ZXingBrowser)return Promise.resolve(window.ZXingBrowser);
 if(!barcodeLibrary)barcodeLibrary=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='./vendor/zxing-browser-0.1.5.min.js';
  script.onload=()=>window.ZXingBrowser?resolve(window.ZXingBrowser):reject(Error('Scanner niet geladen'));
  script.onerror=()=>{script.remove();barcodeLibrary=null;reject(Error('Scanner niet geladen'));};document.head.append(script);
 });return barcodeLibrary;
}
function cameraControl(container,onCode){
 const area=el('div',undefined,'scanner'),video=el('video'),status=el('p',undefined,'hint');
 status.setAttribute('role','status');video.muted=true;video.playsInline=true;video.hidden=true;
 const start=btn('Scan barcode',async()=>{
  stopCamera();
  if(!navigator.mediaDevices?.getUserMedia){status.textContent='Camerascan wordt niet ondersteund in deze browser. Vul de barcode handmatig in of gebruik een externe scanner.';return;}
  let cancelled=false,stream,timer,controls;start.disabled=true;
  const stop=()=>{cancelled=true;clearTimeout(timer);controls?.stop();stream?.getTracks().forEach(t=>t.stop());video.srcObject=null;video.hidden=true;start.disabled=false;cancel.hidden=true;};
  stopCamera=stop;cancel.hidden=false;status.textContent='Camera openen…';
  try{
   let detector=null;
   if('BarcodeDetector' in window){try{const supported=await BarcodeDetector.getSupportedFormats();const formats=supported.filter(x=>['ean_13','ean_8','upc_a','upc_e','code_128'].includes(x));if(formats.length)detector=new BarcodeDetector({formats});}catch{}}
   let fallback=null;if(!detector)fallback=await loadBarcodeReader();if(cancelled)return;
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
   if(cancelled){stream.getTracks().forEach(t=>t.stop());return;}
   video.srcObject=stream;video.hidden=false;await video.play();if(cancelled)return;
   status.textContent='Richt de camera op de streepjescode.';
   if(fallback){
    const reader=new fallback.BrowserMultiFormatOneDReader();
    controls=await reader.decodeFromStream(stream,video,(result,error,session)=>{
     if(cancelled){session.stop();return;}if(result){session.stop();const value=result.getText();stop();status.textContent='Barcode herkend: '+value;onCode(value);}
    });
    if(cancelled)controls.stop();return;
   }

   const tick=async()=>{if(cancelled)return;try{const results=await detector.detect(video);if(cancelled)return;if(results.length){const value=results[0].rawValue;stop();status.textContent='Barcode herkend: '+value;onCode(value);return;}}catch{}if(!cancelled)timer=setTimeout(tick,350);};tick();
  }catch(e){stop();status.textContent=e.name==='NotAllowedError'?'Geen cameratoegang. Geef toestemming in je browser of typ de code.':e.message==='unsupported'?'Deze browser herkent geen ondersteunde productbarcodes. Typ de code.':'Camera niet beschikbaar. Je kunt de barcode ook typen.';}
 });
 const cancel=btn('Stop scannen',()=>{stopCamera();status.textContent='Scannen gestopt.';},'quiet');cancel.hidden=true;
 area.append(start,cancel,video,status);container.append(area);return start;
}
const offCache=new Map();let offCalls=[];
function barcodeModal(){
 let code,select,name,category,status,startScan,proposal=null,request=0;
 const inspect=async()=>{
  const value=code.value.trim(),token=++request;proposal=null;
  const known=state.products.find(p=>p.barcodes.includes(value));
  if(known){quickAdd(known);closeModal();toast(known.name+' toegevoegd');return;}
  if(!/^\d{8,14}$/.test(value)){status.textContent='Vul 8 tot 14 cijfers in, of koppel de code handmatig.';return;}
  status.textContent='Product opzoeken…';
  try{
   let data=offCache.get(value);if(!data){offCalls=offCalls.filter(t=>Date.now()-t<60000);if(offCalls.length>=10)throw Error('Even wachten');offCalls.push(Date.now());const response=await fetch('https://world.openfoodfacts.org/api/v3/product/'+encodeURIComponent(value)+'?fields=product_name,product_name_nl,brands,quantity,categories_tags&app_name=BS&app_version=1',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('Niet bereikbaar');data=await response.json();offCache.set(value,data);}
   if(token!==request||!$('#modal').open||!code.isConnected||code.value.trim()!==value)return;
   const p=data.product;if(!p||!(p.product_name_nl||p.product_name)){status.textContent='Niet gevonden. Kies een bestaand product of vul zelf een naam in.';return;}
   proposal={barcode:value,name:p.product_name_nl||p.product_name,brand:p.brands||'',quantity:p.quantity||'',categories:p.categories_tags||[],source:'https://world.openfoodfacts.org/product/'+value};
   name.value=proposal.name;status.textContent=[proposal.name,proposal.brand,proposal.quantity].filter(Boolean).join(' · ');
   const tags=proposal.categories.join(' ');const rules=[[/beverages|drinks/,'Drinken'],[/fruits/,'Fruit'],[/vegetables/,'Groenten'],[/meats/,'Vlees'],[/breads|breakfast/,'Brood & Ontbijt'],[/desserts|yogurts/,'Toetjes'],[/sauces/,'Sauzen'],[/pastas/,'Pasta']];
   for(const [pattern,label] of rules){const c=state.categories.find(c=>c.name===label);if(c&&pattern.test(tags)){category.value=c.id;break;}}
   status.textContent+=' — controleer naam en categorie, of koppel aan je eigen product.';
  }catch{if(token===request&&code.isConnected)status.textContent='Online herkenning niet beschikbaar. Je kunt hieronder zelf koppelen of toevoegen.';}
 };
 openModal('Scannen & aanvullen',()=>{
  code=field('Barcode','text');code.inputMode='numeric';code.oninput=()=>{request++;proposal=null;};
  startScan=cameraControl($('#modalBody'),value=>{code.value=value;inspect();});
  $('#modalBody').append(btn('Product opzoeken',inspect));status=el('p','Een bekende barcode gaat direct op je lijst.','hint');status.setAttribute('role','status');$('#modalBody').append(status);
  const label=el('label','Koppelen aan je eigen product','field');select=el('select');select.setAttribute('aria-label','Product koppelen');const empty=el('option','Nieuw product maken');empty.value='';select.append(empty);
  state.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'nl')).forEach(p=>{const o=el('option',p.name);o.value=p.id;select.append(o);});label.append(select);$('#modalBody').append(label);
  name=field('Naam voor een nieuw product','text');category=categoryField();
  const source=el('a','Productgegevens: Open Food Facts · ODbL');source.href='https://world.openfoodfacts.org';source.target='_blank';source.rel='noopener';$('#modalBody').append(source,el('p','Alleen de barcode wordt opgezocht. Je lijst en camerabeelden worden niet verstuurd.','hint'));
 },()=>{
  const value=code.value.trim();if(!value)throw Error('Vul een barcode in.');
  let p=state.products.find(p=>p.barcodes.includes(value))||prod(select.value);
  if(!p){if(!name.value.trim())throw Error('Kies een product of vul een naam in.');if(!category.value)throw Error('Maak eerst een categorie.');p=state.products.find(p=>norm(p.name)===norm(name.value));
   if(!p){p={id:uid(),name:name.value.trim(),categoryId:category.value,barcodes:[],input:'plain'};state.products.push(p);cat(category.value).entries.push({type:'product',id:p.id});}}
  if(!p.barcodes.includes(value))p.barcodes.push(value);
  if(proposal?.barcode===value){p.packages=p.packages||[];if(!p.packages.some(x=>x.barcode===value))p.packages.push(proposal);}
  quickAdd(p);render();toast(p.name+' toegevoegd');
 },'Koppelen & toevoegen');startScan.click();
}
$('#scan').onclick=barcodeModal;
render();

async function loadPublishedCatalog(){
 if(saveBlocked)return;
 const status=$('#catalogStatus');status.textContent='Catalogus laden…';
 try{
  const response=await fetch('./data/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Catalogus niet bereikbaar');
  const catalog=await response.json();state=mergeCatalog(state,catalog);seedActivities();save();render();
  status.textContent=`${catalog.categories.length} categorieën · ${catalog.products.length} producten · ${catalog.recipes.length} gerechten uit ${catalog.sourceFiles.length} bestanden`;
 }catch(e){status.textContent='Catalogus niet geladen. Je bestaande gegevens blijven beschikbaar.';$('#retryCatalog').hidden=false;}
}
$('#retryCatalog').onclick=loadPublishedCatalog;
loadPublishedCatalog();

function renderHome(){
 const target=$('#homeContent');target.replaceChildren();
 const title=el('div',undefined,'toolbar');title.append(el('h2',list()?.name||'Vandaag'),btn('Lijst kiezen',()=>switchView('lists'),'quiet'));target.append(title);
 const rows=el('div');target.append(rows);renderList(rows,true);
 if(list()?.items.length&&!list().items.some(i=>!i.done))rows.append(el('p','Alles gehaald. Wat heb je hierna nodig?','empty'));
 const shortcuts=el('div',undefined,'toolbar');shortcuts.append(btn('Iets op? Scan',barcodeModal),btn('Product zoeken',()=>{switchView('shop');$('#search').focus();}),btn('In de winkel',()=>{switchView('lists');$('#onlyNeeded').checked=true;renderList($('#listRows'),true);}));target.prepend(shortcuts);
 const sections=[['Vaak nodig','favorites'],['Gerechten','recipes'],['Activiteiten','activities']];
 for(const [label,key] of sections){const detail=el('details',undefined,'categoryBranch');detail.open=key==='favorites';detail.append(el('summary',label));
 if(key==='favorites'){
  const products=state.products.filter(p=>p.favorite||p.purchaseCount).sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)||(b.purchaseCount||0)-(a.purchaseCount||0)).slice(0,12);
  if(!products.length)detail.append(el('p','Markeer producten als favoriet bij Bewerken. Gekochte producten verschijnen hier ook.','hint'));
  products.forEach(p=>{const row=btn('',()=>quickAdd(p),'browseLine');row.append(el('span',p.name),el('small',p.favorite?'★':'Eerder gekocht'),el('span','+'));hold(row,()=>chooseProduct(p));swipeEdit(row,()=>editProduct(p));detail.append(row);});
 }else{
  const activity=key==='activities';state.recipes.filter(r=>(r.kind==='activity')===activity).forEach(r=>{const row=el('div',undefined,'row');row.append(btn(r.name,()=>chooseRecipe(r),'productName'),btn('Bewerken',()=>editRecipe(r),'quiet'));detail.append(row);});
  detail.append(btn(activity?'Activiteit maken':'Gerecht maken',()=>editRecipe(undefined,activity?'activity':'recipe'),'quiet'));
 }target.append(detail);}
}
$('#homeScan').onclick=barcodeModal;
$('#onlyNeeded').onchange=()=>renderList($('#listRows'),$('#onlyNeeded').checked);
$('#saveActivity').onclick=()=>{
 if(!list()?.items.length){toast('Vul eerst je lijst met producten.');return;}let name;
 openModal('Lijst als activiteit bewaren',()=>name=field('Naam','text',list().name),()=>{if(!name.value.trim())throw Error('Vul een naam in.');state.recipes.push({id:uid(),kind:'activity',name:name.value.trim(),categoryId:prod(list().items[0].productId).categoryId,ingredients:list().items.map(i=>({productId:i.productId,quantity:i.quantity,note:i.note}))});save();render();});
};

function seedActivities(){
 if(state.activitySeedsVersion===1)return;
 for(const [name,names] of [['Verjaardag',['Taart','Koffie','Thee Groene Thee','Chips','Borrelnootjes']],['Baby op pad',['Luiers','Billendoekjes','Reserve Kleren','Speen']],['Weekend weg',['Brood','Melk','Eieren','Tandpasta','Shampoo']]]){
  if(state.recipes.some(r=>r.kind==='activity'&&r.name===name))continue;
  const products=names.map(n=>state.products.find(p=>norm(p.name)===norm(n))).filter(Boolean);if(!products.length)continue;
  state.recipes.push({id:uid(),kind:'activity',name,categoryId:products[0].categoryId,ingredients:products.map(p=>({productId:p.id,quantity:1,note:''}))});
 }state.activitySeedsVersion=1;
}
