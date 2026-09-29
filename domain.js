import {validateDetails} from './character.js';
import {mergeRoster} from './roster.js';
export const SCHEMA = 1;
export function today() {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const value=key=>parts.find(p=>p.type===key).value;return `${value('year')}-${value('month')}-${value('day')}`;}
export function weekOf(date) { const d = new Date(`${date}T12:00:00Z`); if (!Number.isFinite(+d)) throw new Error('Date invalide'); d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7)); return d.toISOString().slice(0,10); }
export function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(+new Date(s)) && new Date(s).toISOString().slice(0,10)===s; }
export const MAX_CAPTURES = 100;
export function power(v,unit='') {
 const text=String(v).trim().replace(/\s/g,'').replace(',','.');
 if(text.length>80)throw new Error('Puissance trop longue.');
 const m=text.match(/^(\d+(?:\.\d+)?)([KMB])?$/i);
 if(!m)throw new Error('Puissance invalide. Exemples : 30.49 M ou 5,83 B.');
 const selected=(m[2]||unit).toUpperCase(),exp={'':0,K:3,M:6,B:9}[selected];
 if(exp===undefined)throw new Error('Unité de puissance invalide.');
 const [whole,fraction='']=m[1].split('.'),digits=BigInt(whole+fraction),divisor=10n**BigInt(fraction.length),scaled=digits*10n**BigInt(exp);
 if(scaled%divisor!==0n)throw new Error('La puissance doit représenter un nombre entier de points. Choisis M ou B pour une valeur décimale.');
 const n=scaled/divisor;
 if(n<=0n||n>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Puissance hors limites.');
 return Number(n);
}
export function validTime(time){return typeof time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time);}
export function currentTime(){return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());}
// Keep historical day-only keys identical; never invent an hour for old records.
export function recordKey(r){return r.playerId+':'+r.date+(r.time?':'+r.time:'');}
export function compareRecords(a,b){return a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||'');}
export function validateCaptureIds(ids){if(!Array.isArray(ids)||ids.length>MAX_CAPTURES||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||! /^[\w-]{1,100}$/.test(id)))throw new Error(`Captures invalides (maximum ${MAX_CAPTURES}).`);return ids;}

export function formatPower(n) { if(n==null) return '—'; const units=[[1e9,'B'],[1e6,'M'],[1e3,'K']]; const [d,u]=units.find(([d])=>Math.abs(n)>=d)||[1,'']; return `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n/d)}${u?' '+u:''}`; }
export function validateRecord(r) { if(r?.details!=null)validateDetails(r.details); if(!r||!validDate(r.date)||r.date>today()) throw new Error('Choisis une date de relevé valide, sans date future.'); if(r.time!=null&&!validTime(r.time))throw new Error('Heure invalide : utilise HH:MM.'); if(!Number.isSafeInteger(r.power)||r.power<=0) throw new Error('Puissance invalide.'); for(const k of ['level','adventure']) if(!Number.isSafeInteger(r[k])||r[k]<0||r[k]>1000000) throw new Error('Niveau et aventure : entiers positifs attendus.'); if(typeof r.playerId!=='string'||!r.playerId) throw new Error('Joueur manquant.'); return r; }
export function recordsFor(state,id) { return state.records.filter(r=>r.playerId===id).sort(compareRecords); }
export function latest(state,p) { return recordsFor(state,p.id).at(-1)||p.reference||null; }
export function weeklyDelta(state,id,week) { const all=recordsFor(state,id); const current=all.filter(r=>weekOf(r.date)===week).at(-1); const previous=all.filter(r=>weekOf(r.date)<week).at(-1); if(!current||!previous) return null; return {current,previous,absolute:current.power-previous.power,percent:(current.power-previous.power)/previous.power*100}; }
export function mayEdit(user,playerId) { return !!user && (user.role==='admin'||user.role==='officer'||user.playerId===playerId); }
export function initialState() { return mergeRoster({schema:SCHEMA,players:[{id:'psykokwak',name:'AB_Psykokwak',reference:{power:5830000000,level:228,adventure:212,date:null,source:'IMG_0779.jpeg, capture reçue le 28/09/2026 ; date de prise inconnue'}}],records:[],modes:[],daily:[],events:[],audit:[]}); }
export function validateState(s) { if(!s||s.schema!==SCHEMA||!['players','records','modes','daily','events','audit'].every(k=>Array.isArray(s[k]))) throw new Error('Sauvegarde AlphaBet invalide.'); if(s.players.length>1000||s.records.length>100000) throw new Error('Sauvegarde trop volumineuse.'); const ids=new Set(); for(const p of s.players) {if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80) throw new Error('Liste des joueurs invalide.'); ids.add(p.id); if(p.reference) {const r=p.reference;if(!Number.isSafeInteger(r.power)||r.power<=0||(r.level!==null&&!Number.isInteger(r.level))||(r.adventure!==null&&!Number.isInteger(r.adventure))) throw new Error('Référence invalide.');}} const dates=new Set(); for(const r of s.records){validateRecord(r);const key=recordKey(r);if(!ids.has(r.playerId)||dates.has(key)) throw new Error('Relevé orphelin ou doublon.');dates.add(key);} for(const m of s.modes) if(!m||typeof m.id!=='string'||typeof m.name!=='string'||m.name.length>80) throw new Error('Mode invalide.'); for(const e of s.events) if(!e||typeof e.title!=='string'||e.title.length>120||!validDate(e.date)||typeof e.description!=='string')throw new Error('Événement invalide.'); for(const d of s.daily)if(!d||!ids.has(d.playerId)||!validDate(d.date)||!s.modes.some(m=>m.id===d.modeId)||typeof d.done!=='boolean')throw new Error('Suivi quotidien invalide.'); return s; }
