import {db} from './store.js';
export async function localBackup(){
  const database=await db();
  // Read the records, drafts and images from one consistent database transaction.
  const snapshot=await new Promise((ok,no)=>{
    const tx=database.transaction(['state','captures','drafts']);
    const s=tx.objectStore('state').get('main'),c=tx.objectStore('captures').getAll(),d=tx.objectStore('drafts').getAll();
    tx.oncomplete=()=>ok({state:s.result,captures:c.result,drafts:d.result});tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error);
  });
  if(!snapshot.state){const {initialState}=await import('./domain.js');snapshot.state=initialState();}
  const required=new Set([...snapshot.state.records,...snapshot.drafts].flatMap(r=>r.captureIds||[]));
  const captures=await Promise.all(snapshot.captures.filter(c=>required.has(c.id)).map(async c=>({id:c.id,name:c.name,data:await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=()=>no(r.error);r.readAsDataURL(c.blob);})})));
  if(captures.length!==required.size)throw new Error('Une capture est manquante. La copie n’a pas été envoyée.');
  return {schema:1,kind:'local-backup',exportedAt:new Date().toISOString(),state:snapshot.state,drafts:snapshot.drafts,captures};
}
