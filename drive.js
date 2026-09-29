// Personal, immutable Drive backups. This is separate from guild synchronization.
const SCOPE='https://www.googleapis.com/auth/drive.file';
const API='https://www.googleapis.com/drive/v3/files';
export class DriveBackups {
  constructor({clientId,snapshot,status=()=>{},request=(...args)=>globalThis.fetch(...args),remember=()=>{},restoreToken=null}) {
    this.clientId=clientId;this.snapshot=snapshot;this.status=status;this.request=request;this.remember=remember;
    this.token=restoreToken;this.generation=0;this.saved=-1;this.running=null;this.timer=null;this.last=null;this.enabled=false;
  }
  connected(){return !!this.token&&this.token.expiresAt>Date.now()+30000;}
  async prepare(){
    if(!this.clientId)throw new Error('Connexion Google non configurée.');
    if(!window.google?.accounts?.oauth2){await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;const timer=setTimeout(()=>{s.remove();no(new Error('Le chargement de Google a expiré. Ouvre le site dans ton navigateur habituel puis réessaie.'));},15000);s.onload=()=>{clearTimeout(timer);ok();};s.onerror=()=>{clearTimeout(timer);no(new Error('Google indisponible. Vérifie ta connexion.'));};document.head.append(s);});}
    this.client=window.google.accounts.oauth2.initTokenClient({client_id:this.clientId,scope:SCOPE,include_granted_scopes:false,callback:r=>{
      if(r.error||!r.access_token||!window.google.accounts.oauth2.hasGrantedAllScopes(r,SCOPE)){this.status('error','Connexion Drive non autorisée.');return;}
      this.token={accessToken:r.access_token,expiresAt:Date.now()+Number(r.expires_in)*1000};this.remember(this.token);this.enabled=true;this.status('ready','Drive connecté · sauvegarde prête');
    },error_callback:()=>this.status('error','Connexion annulée. Les données restent sur cet appareil.')});
    if(this.connected())this.enabled=true;
  }
  connect(){if(!this.client)throw new Error('Connexion Google en cours de préparation. Réessaie dans un instant.');this.status('connecting','Connexion Google demandée · termine la connexion dans la fenêtre Google.');this.client.requestAccessToken({prompt:'select_account'});}
  disconnect(){clearTimeout(this.timer);this.enabled=false;this.token=null;this.remember(null);this.status('off','Drive déconnecté · données sur cet appareil');}
  changed(){this.generation++;if(!this.enabled)return;this.status('pending','Modifications à sauvegarder sur Drive');clearTimeout(this.timer);this.timer=setTimeout(()=>this.save().catch(()=>{}),2000);}
  async json(url,options={}){
    if(!this.connected()){this.status('expired','Reconnecte Drive pour sauvegarder les modifications.');throw new Error('Connexion Drive expirée.');}
    const res=await this.request(url,{...options,signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+this.token.accessToken,...options.headers}});
    if(!res.ok){if(res.status===401){this.token=null;this.remember(null);}throw new Error(res.status===401?'Connexion Google expirée.':`Google Drive a refusé la sauvegarde (${res.status}).`);}return res;
  }
  async upload(payload){
    const metadata={name:`alphabet-backup-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}.json`,mimeType:'application/json',appProperties:{application:'alphabet-dashboard',kind:'local-backup-v1'}};
    const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
    // Resumable protocol supports large capture archives; interrupted attempts keep local data.
    const start=await this.json('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,createdTime',{
      method:'POST',headers:{'Content-Type':'application/json','X-Upload-Content-Type':'application/json','X-Upload-Content-Length':String(blob.size)},body:JSON.stringify(metadata)});
    const location=start.headers.get('Location');
    if(!location||new URL(location).origin!=='https://www.googleapis.com')throw new Error('Google n’a pas confirmé la destination de sauvegarde.');
    const finish=await this.json(location,{method:'PUT',headers:{'Content-Type':'application/json'},body:blob});const result=await finish.json();
    if(!result.id)throw new Error('Google n’a pas confirmé la création du fichier.');return result;
  }
  async save(){
    if(this.running)return this.running;
    const generation=this.generation;
    this.running=Promise.resolve().then(async()=>{
      try{
        if(!this.connected())throw new Error('Connecte ou reconnecte Google Drive.');
        this.status('saving','Sauvegarde Drive en cours…');const payload=await this.snapshot();const file=await this.upload(payload);
        this.saved=generation;this.last={id:file.id,at:new Date().toISOString()};
        this.status(this.generation===generation?'saved':'pending',this.generation===generation?'Copie confirmée dans Drive':'Nouvelles modifications en attente',this.last);
        return file;
      }catch(error){this.status('error',error.message+' Les données restent sur cet appareil.');throw error;}
      finally{this.running=null;}
    });
    try{return await this.running;}finally{if(this.enabled&&this.saved===generation&&this.generation!==generation){clearTimeout(this.timer);this.timer=setTimeout(()=>this.save().catch(()=>{}),2000);}}
  }
  async list(){
    const params=new URLSearchParams({q:"trashed=false and appProperties has { key='application' and value='alphabet-dashboard' } and appProperties has { key='kind' and value='local-backup-v1' }",orderBy:'createdTime desc',pageSize:'30',fields:'files(id,name,createdTime,size)'});
    return (await (await this.json(API+'?'+params)).json()).files||[];
  }
  async download(id){if(!/^[\w-]+$/.test(id))throw new Error('Fichier invalide.');return (await this.json(API+'/'+id+'?alt=media')).blob();}
}
