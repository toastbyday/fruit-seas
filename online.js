(() => {
'use strict';
const SAVE_KEY='fruit-seas-save-v2';
const $=id=>document.getElementById(id);
const gate=$('authGate'),form=$('authForm'),msg=$('authMessage'),loginTab=$('authLoginTab'),signupTab=$('authSignupTab'),nameField=$('nameField'),submit=$('authSubmit');
let mode='login',session=null,channel=null,displayName='Aventureiro',saveTimer=null,sendTimer=null;
const remotes=new Map();

let sb=null;
async function initSupabase(){
  if(!window.supabase?.createClient) throw new Error('Biblioteca Supabase indisponível.');
  const res=await fetch('/api/config',{cache:'no-store'});
  if(!res.ok) throw new Error('Configuração online indisponível.');
  const cfg=await res.json();
  if(!cfg.url||!cfg.publishableKey) throw new Error('Configure SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no Vercel.');
  sb=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
}

function setMode(next){mode=next;const signup=mode==='signup';loginTab.classList.toggle('active',!signup);signupTab.classList.toggle('active',signup);nameField.classList.toggle('hidden',!signup);$('authName').required=signup;$('authPassword').autocomplete=signup?'new-password':'current-password';submit.textContent=signup?'Criar conta':'Entrar';msg.textContent='';msg.className='auth-message';}
loginTab.onclick=()=>setMode('login');signupTab.onclick=()=>setMode('signup');
function status(text,good=false){msg.textContent=text;msg.className='auth-message'+(good?' good':'');}

async function cloudUpsert(){if(!session||!window.FruitSeasGame)return;try{const state=window.FruitSeasGame.getState();await sb.from('fruit_seas_saves').upsert({user_id:session.user.id,display_name:displayName,state,updated_at:new Date().toISOString()},{onConflict:'user_id'});}catch(e){console.warn('cloud save',e);}}

async function bootUser(s){session=s;if(!session){gate.classList.remove('hidden');$('onlineStatus').hidden=true;return;}
 displayName=(session.user.user_metadata?.display_name||session.user.email?.split('@')[0]||'Aventureiro').slice(0,20);
 try{
   const {data,error}=await sb.from('fruit_seas_saves').select('display_name,state,updated_at').eq('user_id',session.user.id).maybeSingle();
   if(error) throw error;
   if(data?.display_name) displayName=data.display_name;
   const loadedKey='fruit-seas-cloud-loaded:'+session.user.id;
   if(data?.state && !sessionStorage.getItem(loadedKey)){
      localStorage.setItem(SAVE_KEY,JSON.stringify(data.state));
      sessionStorage.setItem(loadedKey,'1');
      location.reload();return;
   }
   if(!data) await cloudUpsert();
 }catch(e){console.warn('cloud load',e);}
 gate.classList.add('hidden');$('onlineStatus').hidden=false;$('onlineUser').textContent=displayName;
 await joinRealtime();
 clearInterval(saveTimer);saveTimer=setInterval(cloudUpsert,8000);
}

form.addEventListener('submit',async e=>{e.preventDefault();submit.disabled=true;status(mode==='signup'?'Criando conta...':'Entrando...');const email=$('authEmail').value.trim(),password=$('authPassword').value;try{
 if(mode==='signup'){
   const name=($('authName').value.trim()||'Aventureiro').slice(0,20);
   const {data,error}=await sb.auth.signUp({email,password,options:{data:{display_name:name}}});if(error)throw error;
   if(data.session){displayName=name;await bootUser(data.session);status('Conta criada.',true);}else status('Conta criada. Confirme o e-mail e depois entre.',true);
 }else{
   const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;await bootUser(data.session);
 }
 }catch(err){status(err?.message||'Não foi possível entrar.');}finally{submit.disabled=false;}});

$('logoutBtn').onclick=async()=>{await cloudUpsert();if(channel)await sb.removeChannel(channel);sessionStorage.clear();await sb.auth.signOut();location.reload();};

async function joinRealtime(){if(!session||!window.FruitSeasGame)return;if(channel)await sb.removeChannel(channel);try{if(sb.realtime?.setAuth)await sb.realtime.setAuth(session.access_token);}catch{}
 channel=sb.channel('fruit-seas:world-1',{config:{private:true,broadcast:{self:false,ack:false},presence:{key:session.user.id}}});
 channel.on('broadcast',{event:'player_state'},({payload})=>{if(!payload||payload.id===session.user.id)return;payload.seen=performance.now();remotes.set(payload.id,payload);})
 .on('broadcast',{event:'player_left'},({payload})=>{if(payload?.id)remotes.delete(payload.id);})
 .on('presence',{event:'sync'},()=>{const state=channel.presenceState();const count=Math.max(1,Object.keys(state).length);$('onlineCount').textContent=count+' online';})
 .subscribe(async st=>{if(st==='SUBSCRIBED'){await channel.track({name:displayName,online_at:new Date().toISOString()});clearInterval(sendTimer);sendTimer=setInterval(sendState,160);}});
}
function sendState(){if(!channel||!session||!window.FruitSeasGame)return;const v=window.FruitSeasGame.getView();channel.send({type:'broadcast',event:'player_state',payload:{id:session.user.id,name:displayName,x:v.x,y:v.y,angle:v.angle,boat:v.boat,level:v.level,fruit:v.fruit,sea:v.sea,t:Date.now()}});}

const rc=document.createElement('canvas');rc.id='remotePlayersCanvas';document.body.appendChild(rc);const rctx=rc.getContext('2d');
function remoteFrame(){requestAnimationFrame(remoteFrame);if(!window.FruitSeasGame||!rctx)return;const v=window.FruitSeasGame.getView(),rect=rc.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(rc.width!==Math.round(rect.width*dpr)||rc.height!==Math.round(rect.height*dpr)){rc.width=Math.round(rect.width*dpr);rc.height=Math.round(rect.height*dpr);}rctx.setTransform(dpr,0,0,dpr,0,0);rctx.clearRect(0,0,rect.width,rect.height);const now=performance.now();for(const [id,r] of remotes){if(now-r.seen>3500){remotes.delete(id);continue;}if(r.sea!==v.sea)continue;const sx=rect.width/2+(r.x-v.camX)*v.zoom,sy=rect.height/2+(r.y-v.camY)*v.zoom;if(sx<-70||sy<-70||sx>rect.width+70||sy>rect.height+70)continue;rctx.save();rctx.translate(sx,sy);rctx.fillStyle='#0c303bcc';rctx.beginPath();rctx.ellipse(2,13,17,7,0,0,Math.PI*2);rctx.fill();rctx.fillStyle=r.boat?'#c2955c':'#f3d8a4';rctx.beginPath();rctx.arc(0,0,r.boat?14:11,0,Math.PI*2);rctx.fill();rctx.strokeStyle='#f7c66c';rctx.lineWidth=2;rctx.stroke();rctx.font='bold 11px Trebuchet MS';rctx.textAlign='center';rctx.fillStyle='#082b35';rctx.fillText((r.name||'Jogador').slice(0,18),1,-19);rctx.fillStyle='#fff4d9';rctx.fillText((r.name||'Jogador').slice(0,18),0,-20);rctx.font='9px Trebuchet MS';rctx.fillStyle='#b8d3d0';rctx.fillText('Nv. '+(r.level||1),0,-8);rctx.restore();}}
requestAnimationFrame(remoteFrame);

window.addEventListener('pagehide',()=>{cloudUpsert();try{if(channel&&session)channel.send({type:'broadcast',event:'player_left',payload:{id:session.user.id}});}catch{}});
window.addEventListener('beforeunload',cloudUpsert);

(async()=>{try{await initSupabase();sb.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'){session=null;gate.classList.remove('hidden');}else if(s&&!session)bootUser(s);});const {data}=await sb.auth.getSession();await bootUser(data.session);}catch(err){console.error(err);msg.textContent=err?.message||'Não foi possível iniciar o modo online.';}})();
})();