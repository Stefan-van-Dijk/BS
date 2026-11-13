import {norm,uid,importOverview,addItem,validate,mergeCatalog,productQuantity,decreaseProduct} from './core.mjs?v=20261113-lines1';
const $=s=>document.querySelector(s), el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const KEY='bs.app.v1';let state={schemaVersion:1,categories:[],products:[],recipes:[],lists:[{id:uid(),name:'Deze week',items:[]}]},activeList,view='shop',path=[],saveBlocked=false,stopCamera=()=>{};
try{const raw=localStorage.getItem(KEY);if(raw)state=validate(JSON.parse(raw));}catch{saveBlocked=true;$('#saveStatus').textContent='Opgeslagen gegevens konden niet worden gelezen. Exporteer eerst je oorspronkelijke back-up.';}
activeList=state.lists[0]?.id;let timer;
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(timer);timer=setTimeout(()=>$('#toast').style.display='none',3600);}
function save(){if(saveBlocked){toast('Opslaan geblokkeerd: herstel eerst een geldige back-up.');return;}try{localStorage.setItem(KEY,JSON.stringify(state));$('#saveStatus').textContent='Lokaal bewaard in deze browser';}catch{$('#saveStatus').textContent='Opslaan mislukt — maak nu een back-up.';toast('Opslag vol of niet beschikbaar. Maak een back-up.');}}
const list=()=>state.lists.find(l=>l.id===activeList),prod=id=>state.products.find(p=>p.id===id),cat=id=>state.categories.find(c=>c.id===id);
function btn(text,fn,cls='secondary'){const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;}
function field(label,type,value=''){const l=el('label',label,'field'),input=el('input');input.type=type;input.value=value;l.append(input);$('#modalBody').append(l);return input;}
function categoryField(value){const l=el('label','Categorie','field'),s=el('select');for(const c of state.categories.filter(c=>c.name!=='Home')){const o=el('option',c.name);o.value=c.id;s.append(o);}s.value=value||s.options[0]?.value||'';l.append(s);$('#modalBody').append(l);return s;}
function openModal(title,build,onSubmit,action='Bewaren'){$('#modalTitle').textContent=title;$('#modalBody').replaceChildren();$('#modalSave').textContent=action;build();$('#modalForm').onsubmit=e=>{e.preventDefault();try{if(onSubmit()!==false)closeModal();}catch(err){toast(err.message);}};$('#modal').showModal();}
function closeModal(){stopCamera();$('#modal').close();}
$('#closeModal').onclick=closeModal;$('#modal').addEventListener('close',()=>stopCamera());$('#modal').addEventListener('cancel',()=>stopCamera());
function switchView(v){view=v;for(const id of ['shop','lists','manage'])$('#'+id).hidden=id!==v;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));render();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
function render(){
 $('#welcome').hidden=state.products.length>0||view!=='shop';$('#count').textContent=list()?.items.filter(i=>!i.done).length||0;
 const sel=$('#listSelect');sel.replaceChildren();state.lists.forEach(l=>{const o=el('option',l.name);o.value=l.id;sel.append(o);});sel.value=activeList||'';
 if(view==='shop')renderShop();if(view==='lists')renderList();if(view==='manage')renderManage();
}
function renderShop(){const q=norm($('#search').value),cards=$('#cards'),crumbs=$('#crumbs');cards.replaceChildren();crumbs.replaceChildren();
 crumbs.append(btn('Alle categorieën',()=>{path=[];render();},'quiet'));path.forEach((id,i)=>crumbs.append(btn(cat(id)?.name||'',()=>{path=path.slice(0,i+1);render();},'quiet')));
 let entries;if(q)entries=[...state.products.filter(p=>norm(p.name).includes(q)).map(p=>({type:'product',id:p.id})),...state.recipes.filter(r=>norm(r.name).includes(q)).map(r=>({type:'recipe',id:r.id}))];else if(path.length)entries=cat(path.at(-1))?.entries||[];else{const home=state.categories.find(c=>c.name==='Home');entries=home?home.entries:state.categories.map(c=>({type:'category',id:c.id}));}
 for(const item of entries){
 const obj=item.type==='product'?prod(item.id):item.type==='category'?cat(item.id):state.recipes.find(r=>r.id===item.id);if(!obj)continue;
 if(item.type==='product'){
  const row=el('div',undefined,'productLine');row.dataset.productId=obj.id;
  const minus=btn('−',()=>{decreaseProduct(list(),obj.id);save();refreshQuantities();},'step minus');minus.setAttribute('aria-label',obj.name+' verminderen');
  const main=btn(obj.name,()=>quickAdd(obj),'productName');main.setAttribute('aria-label',obj.name+' toevoegen');main.title='Lang indrukken om product te bewerken';hold(main,()=>editProduct(obj));
  const qty=el('output',undefined,'productQuantity');qty.setAttribute('aria-label','Aantal '+obj.name);qty.setAttribute('aria-live','polite');
  const plus=btn('+',()=>quickAdd(obj),'step plus');plus.setAttribute('aria-label',obj.name+' verhogen');plus.title='Lang indrukken om product te bewerken';hold(plus,()=>editProduct(obj));
  main.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();editProduct(obj);}};
  row.append(minus,main,qty,plus);cards.append(row);
 }else{
  const row=btn('',()=>{if(item.type==='category'){path.push(obj.id);$('#search').value='';render();}else chooseRecipe(obj);},'browseLine');
  row.append(el('span',obj.name),el('small',item.type==='recipe'?obj.ingredients.length+' ingrediënten':''),el('span','›','chevron'));cards.append(row);
 }
 }
 refreshQuantities();
 if(!entries.length)cards.append(el('p',q?'Geen resultaten. Voeg een product toe via Beheren.':'Laad je overzicht om te beginnen.','empty'));
}
function ensureList(){if(!list()){const l={id:uid(),name:'Boodschappen',items:[]};state.lists.push(l);activeList=l.id;}}
function refreshQuantities(){
 document.querySelectorAll('.productLine').forEach(row=>{const amount=productQuantity(list(),row.dataset.productId);row.querySelector('output').textContent=new Intl.NumberFormat('nl-NL',{maximumFractionDigits:3}).format(amount);row.querySelector('.minus').disabled=amount<=0;row.classList.toggle('selected',amount>0);});
 $('#count').textContent=list()?.items.filter(i=>!i.done).length||0;
}
function quickAdd(p){ensureList();addItem(list(),p.id);save();refreshQuantities();}
function hold(element,action){
 let timer,start,suppress=false;
 const cancel=()=>{clearTimeout(timer);timer=null;};
 element.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;suppress=false;start=[e.clientX,e.clientY];timer=setTimeout(()=>{timer=null;suppress=true;action();},500);});
 element.addEventListener('pointermove',e=>{if(start&&Math.hypot(e.clientX-start[0],e.clientY-start[1])>10)cancel();});
 for(const event of ['pointerup','pointercancel','pointerleave'])element.addEventListener(event,cancel);
 element.addEventListener('click',e=>{if(suppress){e.preventDefault();e.stopImmediatePropagation();suppress=false;}},true);
 element.addEventListener('contextmenu',e=>e.preventDefault());
}
function swipeRow(row,item){
 let start=null,dx=0,dragging=false;
 const reset=()=>{start=null;dx=0;dragging=false;row.style.transform='';row.classList.remove('swiping');};
 row.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0||e.target.closest('button,input,select,a'))return;start=[e.clientX,e.clientY];dx=0;});
 row.addEventListener('pointermove',e=>{if(!start)return;dx=e.clientX-start[0];const dy=e.clientY-start[1];if(!dragging&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){reset();return;}if(Math.abs(dx)>14&&Math.abs(dx)>Math.abs(dy)*1.5){dragging=true;row.classList.add('swiping');row.style.transform=`translateX(${Math.max(-85,Math.min(85,dx))}px)`;}});
 row.addEventListener('pointerup',()=>{const toggle=dragging&&Math.abs(dx)>=65;reset();if(toggle){item.done=!item.done;save();render();toast(item.done?'Afgevinkt':'Weer op je lijst');}});
 row.addEventListener('pointercancel',reset);row.addEventListener('pointerleave',reset);
}
function chooseProduct(p){let quantity,note;openModal(p.name,()=>{quantity=field('Aantal','number','1');quantity.min='0.01';quantity.step='any';note=field(p.input==='note'?'Omschrijving / variant':'Notitie (optioneel)','text');$('#modalBody').append(el('p','Toevoegen aan: '+(list()?.name||'Boodschappen'),'hint'));},()=>{ensureList();addItem(list(),p.id,Number(quantity.value),note.value.trim());save();render();toast('Toegevoegd aan '+list().name);},'Toevoegen');}
function chooseRecipe(r){let checks=[];openModal(r.name,()=>{if(!r.ingredients.length){$('#modalBody').append(el('p','Dit gerecht heeft nog geen ingrediënten. Vul het aan via Beheren.'));return;}
 $('#modalBody').append(el('p','Vink uit wat je al in huis hebt. Hoeveelheden in productnamen blijven letterlijk behouden.'));
 r.ingredients.forEach(i=>{const l=el('label',undefined,'checkrow'),c=el('input');c.type='checkbox';c.checked=true;l.append(c,el('span',`${i.quantity} × ${prod(i.productId)?.name}${i.note?' · '+i.note:''}`));$('#modalBody').append(l);checks.push([c,i]);});},()=>{ensureList();let n=0;checks.forEach(([c,i])=>{if(c.checked){addItem(list(),i.productId,i.quantity,i.note);n++;}});save();render();toast(n+' ingrediënten toegevoegd');},'Selectie toevoegen');}
function renderList(){const target=$('#listRows');target.replaceChildren();const l=list();$('#progress').textContent=l?`${l.items.filter(i=>i.done).length} van ${l.items.length} afgevinkt`: 'Maak een lijst om te beginnen.';if(!l?.items.length){target.append(el('p','Je lijst is nog leeg. Kies producten of een gerecht bij Samenstellen.','empty'));return;}
 const groups=new Map();for(const item of l.items){const name=cat(prod(item.productId)?.categoryId)?.name||'Overig';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(item);}
 for(const [name,items]of groups){target.append(el('h3',name,'sectionLabel'));items.sort((a,b)=>Number(a.done)-Number(b.done)).forEach(i=>{const row=el('div',undefined,'row'+(i.done?' done':'')),check=el('input');check.type='checkbox';check.checked=i.done;check.setAttribute('aria-label',prod(i.productId).name+' afvinken');check.onchange=()=>{i.done=check.checked;save();render();};const text=el('div',undefined,'text');text.append(el('strong',prod(i.productId).name));if(i.note)text.append(el('small',i.note));const qty=el('input');qty.type='number';qty.min='.01';qty.step='any';qty.value=i.quantity;qty.setAttribute('aria-label','Aantal '+prod(i.productId).name);qty.onchange=()=>{const v=Number(qty.value);if(v>0&&Number.isFinite(v)){i.quantity=v;save();}else{qty.value=i.quantity;toast('Vul een positief aantal in.');}};row.append(check,text,qty,btn('✕',()=>{l.items=l.items.filter(x=>x.id!==i.id);save();render();},'quiet'));row.lastChild.setAttribute('aria-label','Verwijder '+prod(i.productId).name);swipeRow(row,i);target.append(row);});}
}
$('#search').oninput=renderShop;$('#manageSearch').oninput=renderManage;$('#listSelect').onchange=e=>{activeList=e.target.value;render();};
$('#newList').onclick=()=>{let name;openModal('Nieuwe lijst',()=>name=field('Naam','text'),()=>{if(!name.value.trim())throw Error('Geef de lijst een naam.');const l={id:uid(),name:name.value.trim(),items:[]};state.lists.push(l);activeList=l.id;save();render();});};
$('#renameList').onclick=()=>{if(!list())return;let name;openModal('Lijst hernoemen',()=>name=field('Naam','text',list().name),()=>{if(!name.value.trim())throw Error('Geef de lijst een naam.');list().name=name.value.trim();save();render();});};
$('#deleteList').onclick=()=>{if(list()&&confirm('Deze lijst verwijderen?')){state.lists=state.lists.filter(l=>l.id!==activeList);activeList=state.lists[0]?.id;save();render();}};
$('#clearDone').onclick=()=>{if(list()&&confirm('Alle afgevinkte regels verwijderen?')){list().items=list().items.filter(i=>!i.done);save();render();}};
$('#share').onclick=async()=>{if(!list())return;const text=list().name+'\n'+list().items.map(i=>`${i.done?'✓':'□'} ${i.quantity} × ${prod(i.productId).name}${i.note?' — '+i.note:''}`).join('\n');try{if(navigator.share)await navigator.share({title:list().name,text});else{await navigator.clipboard.writeText(text);toast('Lijst gekopieerd');}}catch(e){if(e.name!=='AbortError'){openModal('Kopieer je lijst',()=>{const t=el('textarea');t.value=text;$('#modalBody').append(t);},()=>{},'Sluiten');}}};
function renderManage(){const target=$('#manageRows');target.replaceChildren();const q=norm($('#manageSearch').value);for(const [kind,arr]of [['Gerecht',state.recipes],['Product',state.products]])for(const p of arr.filter(p=>norm(p.name).includes(q))){const row=el('div',undefined,'row'),text=el('div',undefined,'text');text.append(el('strong',p.name),el('small',kind+' · '+cat(p.categoryId)?.name));row.append(text,btn('Bewerken',()=>kind==='Gerecht'?editRecipe(p):editProduct(p)));target.append(row);}}
function moveEntry(type,id,old,newId){if(old===newId)return;state.categories.forEach(c=>c.entries=c.entries.filter(e=>e.type!==type||e.id!==id));cat(newId).entries.push({type,id});}
function editProduct(p){if(!state.categories.length){toast('Voeg eerst een categorie toe.');return;}let name,category,barcodes,input;openModal(p?'Product bewerken':'Nieuw product',()=>{name=field('Naam','text',p?.name||'');category=categoryField(p?.categoryId);barcodes=field('Barcodes (gescheiden door komma’s)','text',p?.barcodes.join(', ')||'');input=inputPills(p?.input||'plain');
 cameraControl($('#modalBody'),value=>{
 const codes=barcodes.value.split(',').map(s=>s.trim()).filter(Boolean);
 if(!codes.includes(value))codes.push(value);barcodes.value=codes.join(', ');
 toast('Barcode ingevuld. Kies Bewaren om te koppelen.');
 });},()=>{const value=name.value.trim();if(!value)throw Error('Vul een naam in.');if(state.products.some(x=>x.id!==p?.id&&norm(x.name)===norm(value)))throw Error('Deze productnaam bestaat al.');const codes=barcodes.value.split(',').map(s=>s.trim()).filter(Boolean);if(codes.some(b=>state.products.some(x=>x.id!==p?.id&&x.barcodes.includes(b))))throw Error('Een barcode is al gekoppeld aan een ander product.');if(!['plain','amount','note'].includes(input.value))throw Error('Kies Standaard, Aantal of Omschrijving.');if(p){moveEntry('product',p.id,p.categoryId,category.value);Object.assign(p,{name:value,categoryId:category.value,barcodes:codes,input:input.value});}else{const item={id:uid(),name:value,categoryId:category.value,barcodes:codes,input:input.value};state.products.push(item);cat(category.value).entries.push({type:'product',id:item.id});}save();render();});}
$('#newProduct').onclick=()=>editProduct();
$('#newCategory').onclick=()=>{let name;openModal('Nieuwe categorie',()=>name=field('Naam','text'),()=>{const value=name.value.trim();if(!value||state.categories.some(c=>norm(c.name)===norm(value)))throw Error('Kies een unieke categorienaam.');const c={id:uid(),name:value,entries:[]};state.categories.push(c);const home=state.categories.find(c=>c.name==='Home');if(home)home.entries.push({type:'category',id:c.id});save();render();});};
function editRecipe(r){if(!state.categories.length){toast('Voeg eerst een categorie toe.');return;}let name,category,ingredients;openModal(r?'Gerecht bewerken':'Nieuw gerecht',()=>{name=field('Naam','text',r?.name||'');category=categoryField(r?.categoryId);$('#modalBody').append(el('p','Eén ingrediënt per regel: aantal | productnaam | notitie. Nieuwe productnamen worden toegevoegd.','hint'));ingredients=el('textarea');ingredients.setAttribute('aria-label','Ingrediënten');ingredients.value=r?.ingredients.map(i=>`${i.quantity} | ${prod(i.productId).name} | ${i.note}`).join('\n')||'';$('#modalBody').append(ingredients);},()=>{if(!name.value.trim())throw Error('Vul een naam in.');const lines=ingredients.value.split('\n').filter(x=>x.trim()).map(line=>{const [q,n,...note]=line.split('|').map(s=>s.trim());if(!n||!Number.isFinite(Number(q))||Number(q)<=0)throw Error('Gebruik: 1 | productnaam | notitie');return {quantity:Number(q),name:n,note:note.join(' | ')};});const result=lines.map(i=>{let p=state.products.find(p=>norm(p.name)===norm(i.name));if(!p){p={id:uid(),name:i.name,categoryId:category.value,barcodes:[],input:'plain'};state.products.push(p);cat(category.value).entries.push({type:'product',id:p.id});}return {productId:p.id,quantity:i.quantity,note:i.note};});if(r){moveEntry('recipe',r.id,r.categoryId,category.value);Object.assign(r,{name:name.value.trim(),categoryId:category.value,ingredients:result});}else{const item={id:uid(),name:name.value.trim(),categoryId:category.value,ingredients:result};state.recipes.push(item);cat(category.value).entries.push({type:'recipe',id:item.id});}save();render();});}
$('#newRecipe').onclick=()=>editRecipe();
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=el('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#backup').onclick=()=>{if(saveBlocked){download('bs-oorspronkelijke-opslag.json',localStorage.getItem(KEY)||'');return;}download('bs-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(state,null,2));};
function importFile(mode){const file=$('#file');file.accept=mode==='csv'?'.csv':'.json';file.value='';file.onchange=async()=>{try{const text=await file.files[0].text();if(mode==='csv'){if(state.lists.some(l=>l.items.length))throw Error('Maak eerst een back-up en maak je lijsten leeg voordat je een catalogus vervangt.');const catalog=importOverview(text);if(state.products.length&&!confirm('De bestaande catalogus vervangen?'))return;Object.assign(state,catalog);path=[];}else{const restored=validate(JSON.parse(text));if(!confirm('Je huidige gegevens vervangen door deze back-up?'))return;state=restored;activeList=state.lists[0]?.id;path=[];saveBlocked=false;}save();render();toast('Gegevens ingeladen');}catch(e){toast(e.message);}};file.click();}
$('#firstImport').onclick=$('#importCsv').onclick=()=>importFile('csv');$('#restore').onclick=()=>importFile('json');

function inputPills(value){
 const result={value},group=el('fieldset',undefined,'inputPills');group.append(el('legend','Bij toevoegen'));
 const help=el('p',undefined,'hint');help.id='inputModeHelp';
 const choices=[['plain','Standaard','Direct één product toevoegen.'],['amount','Aantal','Aantalproduct. Gebruik + en − om direct het aantal te wijzigen.'],['note','Omschrijving','Product met omschrijving. Houd ingedrukt om het product te bewerken.']];
 for(const [key,label,hint] of choices){const l=el('label'),radio=el('input');radio.type='radio';radio.name='productInput';radio.value=key;radio.checked=key===value;radio.setAttribute('aria-describedby','inputModeHelp');radio.onchange=()=>{result.value=key;help.textContent=hint;};l.append(radio,el('span',label));group.append(l);if(radio.checked)help.textContent=hint;}
 $('#modalBody').append(group,help);return result;
}
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
 area.append(start,cancel,video,status);container.append(area);
}
function barcodeModal(){let code,select;const lookup=()=>{const value=code.value.trim();if(!value)throw Error('Vul een barcode in.');let p=state.products.find(p=>p.barcodes.includes(value));if(!p){p=prod(select.value);if(!p)throw Error('Onbekende barcode: kies een product om te koppelen, of voeg dit eerst toe via Beheren.');p.barcodes.push(value);}ensureList();addItem(list(),p.id);save();render();toast(p.name+' toegevoegd');};openModal('Barcode toevoegen',()=>{code=field('Scan of typ de barcode','text');code.inputMode='numeric';cameraControl($('#modalBody'),value=>{code.value=value;});$('#modalBody').append(el('p','Koppel een onbekende barcode aan een product.','hint'));select=el('select');select.setAttribute('aria-label','Product koppelen');const empty=el('option','Kies een product bij een onbekende barcode');empty.value='';select.append(empty);state.products.forEach(p=>{const o=el('option',p.name);o.value=p.id;select.append(o);});$('#modalBody').append(select);},lookup,'Toevoegen');}
$('#scan').onclick=barcodeModal;
render();

async function loadPublishedCatalog(){
 if(saveBlocked)return;
 const status=$('#catalogStatus');status.textContent='Catalogus laden…';
 try{
  const response=await fetch('./data/catalog.json',{cache:'no-cache'});
  if(!response.ok)throw Error('Catalogus niet bereikbaar');
  const catalog=await response.json();state=mergeCatalog(state,catalog);save();render();
  status.textContent=`${catalog.categories.length} categorieën · ${catalog.products.length} producten · ${catalog.recipes.length} gerechten uit ${catalog.sourceFiles.length} bestanden`;
 }catch(e){status.textContent='Catalogus niet geladen. Je bestaande gegevens blijven beschikbaar.';$('#retryCatalog').hidden=false;}
}
$('#retryCatalog').onclick=loadPublishedCatalog;
loadPublishedCatalog();
