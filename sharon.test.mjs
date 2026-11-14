import test from 'node:test';import assert from 'node:assert/strict';
import {snapshot,installSnapshot} from './sharon.mjs';import {validate} from './core.mjs';
test('Shared lists roundtrip without exposing cloud metadata or rewriting personal products',()=>{
 const state={schemaVersion:1,products:[{id:'p',name:'Melk',categoryId:'c',barcodes:['12345678']}],categories:[{id:'c',name:'Zuivel',entries:[]}],recipes:[],lists:[{id:'l',name:'Samen',items:[{id:'i',productId:'p',quantity:6,note:'',done:true,scannedCodes:Array(6).fill('12345678')}],cloud:{role:'owner',revision:1}}]};
 const payload=snapshot(state,state.lists[0]);assert.equal(payload.list.cloud,undefined);
 const receiver=structuredClone(state);receiver.products[0].name='Eigen melk';receiver.lists=[];
 const incoming=installSnapshot(receiver,payload,{revision:1,base:JSON.stringify(payload)});validate(receiver);
 assert.equal(receiver.products[0].name,'Eigen melk');assert.equal(incoming.items[0].scannedCodes.length,6);
 assert.deepEqual(snapshot(receiver,incoming),payload);
 installSnapshot(receiver,payload,{revision:2});assert.equal(receiver.products.length,2);
});
