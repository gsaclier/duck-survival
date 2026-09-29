import {mergeRoster} from './roster.js';
import {initialState,validateState} from './domain.js';
let database;
export async function db() { if(database)return database; database=await new Promise((resolve,reject)=>{const r=indexedDB.open('alphabet-local-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('captures',{keyPath:'id'});r.result.createObjectStore('drafts',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return database; }
export async function read(store,key) {const d=await db();return new Promise((ok,no)=>{const r=d.transaction(store).objectStore(store).get(key);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
export async function all(store) {const d=await db();return new Promise((ok,no)=>{const r=d.transaction(store).objectStore(store).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);});}
export async function write(store,value,key) {const d=await db();return new Promise((ok,no)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).put(value,...(key===undefined?[]:[key]));t.oncomplete=()=>ok();t.onerror=()=>no(t.error);t.onabort=()=>no(t.error||new Error('Écriture annulée'));});}
export async function remove(store,key) {const d=await db();return new Promise((ok,no)=>{const t=d.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>ok();t.onerror=()=>no(t.error);});}
export async function getState() {
 const database=await db();
 return new Promise((ok,no)=>{
  const tx=database.transaction('state','readwrite'), store=tx.objectStore('state');
  const request=store.get('main');let result;
  request.onsuccess=()=>{try{result=validateState(mergeRoster(validateState(request.result||initialState())));store.put(result,'main');}catch(error){no(error);tx.abort();}};
  tx.oncomplete=()=>ok(result);tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||new Error('Import des fiches annulé'));
 });
}
export async function saveState(state) {validateState(state);await write('state',state,'main');}
export async function commitRecord(state,draft,record) { const d=await db();return new Promise((ok,no)=>{const t=d.transaction(['state','drafts'],'readwrite');t.objectStore('state').put(validateState(state),'main');t.objectStore('drafts').delete(draft.id);t.oncomplete=()=>ok(record);t.onerror=()=>no(t.error);t.onabort=()=>no(t.error);});}
