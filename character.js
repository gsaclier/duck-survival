// Shared, bounded schema. Values retain the game's units and wording.
export const MODULES={equipment:'Équipements',weapons:'Armes',heroes:'Héros',gems:'Gemmes',mounts:'Montures',decorations:'Décorations',back:'Accessoires dorsaux',titans:'Titans',collections:'Objets de collection',skills:'Compétences',genetics:'Technologie génétique',engineering:'Ingénierie',infiniteNight:'Ligne de défense infinie · raid',other:'Autres éléments'};
export const ITEM_FIELDS={name:'Nom',level:'Niveau',rank:'Rang / amélioration',rarity:'Rareté',stars:'Étoiles (nombre et couleur)',quantity:'Quantité / fragments',slot:'Emplacement',status:'Équipé / possédé / verrouillé',bonuses:'Bonus et effets',notes:'Détails / incertitudes',completedNight:'Nuit atteinte',nextNight:'Prochain défi (nuit)',attempts:'Tentatives restantes',raidAvailable:'Raid disponible',source:'Capture source'};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
function bounded(v,max){return typeof v==='string'&&v.length<=max;}
export function validateDetails(d){
 if(!object(d)||d.version!==1||!Array.isArray(d.stats)||!Array.isArray(d.items)||d.stats.length>150||d.items.length>400)throw new Error('Fiche détaillée invalide (150 statistiques, 400 éléments maximum).');
 if(JSON.stringify(d).length>250000)throw new Error('Fiche détaillée trop volumineuse.');
 for(const s of d.stats)if(!object(s)||!bounded(s.label,100)||!s.label.trim()||!bounded(s.value,120)||!s.value.trim()||!bounded(s.source||'',300))throw new Error('Chaque statistique doit avoir un nom et une valeur.');
 for(const i of d.items){if(!object(i)||!Object.hasOwn(MODULES,i.module)||!bounded(i.name,150)||!i.name.trim())throw new Error('Chaque élément doit avoir une catégorie et un nom (ou une description de son icône).');for(const k of Object.keys(ITEM_FIELDS))if(i[k]!=null&&!bounded(i[k],k==='bonuses'||k==='notes'?2500:k==='source'?300:150))throw new Error('Champ de fiche trop long ou invalide.');}
 return d;
}
export function emptyDetails(){return {version:1,stats:[],items:[]};}
// Only exact duplicates collapse. Conflicting observations remain visible for review.
export function mergeDetails(base,addition){const out=structuredClone(base||emptyDetails());for(const key of ['stats','items'])for(const row of addition[key]||[]){const comparable=x=>JSON.stringify(Object.fromEntries(Object.entries(x).filter(([k])=>k!=='source').sort(([a],[b])=>a.localeCompare(b))));if(!out[key].some(x=>comparable(x)===comparable(row)))out[key].push(structuredClone(row));}return validateDetails(out);}

export function detailsEqual(a,b){const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;return JSON.stringify(canonical(a??null))===JSON.stringify(canonical(b??null));}
