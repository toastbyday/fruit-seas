(() => {
'use strict';

const SUPABASE_URL = 'https://ucnfhruqhxijphvprslo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Fz1i9DEKhR7WZTP7XWBxjQ_GtuHT1la';
const SAVE_KEY = 'fruit-seas-save-v2';

const $ = (id) => document.getElementById(id);
const gate = $('authGate');
const form = $('authForm');
const msg = $('authMessage');
const loginTab = $('authLoginTab');
const signupTab = $('authSignupTab');
const nameField = $('nameField');
const submit = $('authSubmit');

let mode = 'login';
let session = null;
let channel = null;
let displayName = 'Aventureiro';
let saveTimer = null;
let sendTimer = null;
let sb = null;

const remotes = new Map();

function status(text, good = false) {
  msg.textContent = text;
  msg.className = 'auth-message' + (good ? ' good' : '');
}

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  loginTab.classList.toggle('active', !signup);
  signupTab.classList.toggle('active', signup);
  nameField.classList.toggle('hidden', !signup);
  $('authName').required = signup;
  $('authPassword').autocomplete = signup ? 'new-password' : 'current-password';
  submit.textContent = signup ? 'Criar conta' : 'Entrar';
  status('');
}

function requireClient() {
  if (sb) return true;
  status('A conexão online ainda não iniciou. Recarregue a página.', false);
  return false;
}

function initSupabase() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    throw new Error('Não foi possível carregar a biblioteca do Supabase.');
  }

  sb = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  if (!sb || !sb.auth) {
    sb = null;
    throw new Error('Falha ao inicializar o cliente Supabase.');
  }

  return sb;
}

loginTab.addEventListener('click', () => setMode('login'));
signupTab.addEventListener('click', () => setMode('signup'));

async function cloudUpsert() {
  if (!sb || !session || !window.FruitSeasGame) return;

  try {
    const state = window.FruitSeasGame.getState();
    const { error } = await sb
      .from('fruit_seas_saves')
      .upsert(
        {
          user_id: session.user.id,
          display_name: displayName,
          state,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    if (error) throw error;
  } catch (error) {
    console.warn('Fruit Seas cloud save:', error);
  }
}

async function bootUser(nextSession) {
  session = nextSession;

  if (!session) {
    gate.classList.remove('hidden');
    $('onlineStatus').hidden = true;
    return;
  }

  displayName = (
    session.user.user_metadata?.display_name ||
    session.user.email?.split('@')[0] ||
    'Aventureiro'
  ).slice(0, 20);

  try {
    const { data, error } = await sb
      .from('fruit_seas_saves')
      .select('display_name,state,updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (data?.display_name) {
      displayName = data.display_name;
    }

    const loadedKey = 'fruit-seas-cloud-loaded:' + session.user.id;

    if (data?.state && !sessionStorage.getItem(loadedKey)) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data.state));
      sessionStorage.setItem(loadedKey, '1');
      location.reload();
      return;
    }

    if (!data) {
      await cloudUpsert();
    }
  } catch (error) {
    console.warn('Fruit Seas cloud load:', error);
  }

  gate.classList.add('hidden');
  $('onlineStatus').hidden = false;
  $('onlineUser').textContent = displayName;

  await joinRealtime();

  clearInterval(saveTimer);
  saveTimer = setInterval(cloudUpsert, 8000);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!requireClient()) return;

  submit.disabled = true;
  status(mode === 'signup' ? 'Criando conta...' : 'Entrando...');

  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;

  try {
    if (mode === 'signup') {
      const name = ($('authName').value.trim() || 'Aventureiro').slice(0, 20);

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });

      if (error) throw error;

      if (data.session) {
        displayName = name;
        await bootUser(data.session);
        status('Conta criada.', true);
      } else {
        status('Conta criada. Confirme o e-mail e depois entre.', true);
      }
    } else {
      const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      await bootUser(data.session);
    }
  } catch (error) {
    console.error('Fruit Seas auth:', error);
    status(error?.message || 'Não foi possível entrar.');
  } finally {
    submit.disabled = false;
  }
});

$('logoutBtn').addEventListener('click', async () => {
  if (!requireClient()) return;

  await cloudUpsert();

  if (channel) {
    try {
      await sb.removeChannel(channel);
    } catch (error) {
      console.warn('Fruit Seas realtime cleanup:', error);
    }
  }

  sessionStorage.clear();

  const { error } = await sb.auth.signOut();

  if (error) {
    console.warn('Fruit Seas sign out:', error);
  }

  location.reload();
});

async function joinRealtime() {
  if (!sb || !session || !window.FruitSeasGame) return;

  if (channel) {
    try {
      await sb.removeChannel(channel);
    } catch {}
    channel = null;
  }

  try {
    if (sb.realtime?.setAuth) {
      await sb.realtime.setAuth(session.access_token);
    }
  } catch (error) {
    console.warn('Fruit Seas realtime auth:', error);
  }

  channel = sb.channel('fruit-seas:world-1', {
    config: {
      private: true,
      broadcast: {
        self: false,
        ack: false
      },
      presence: {
        key: session.user.id
      }
    }
  });

  channel
    .on('broadcast', { event: 'player_state' }, ({ payload }) => {
      if (!payload || payload.id === session.user.id) return;
      payload.seen = performance.now();
      remotes.set(payload.id, payload);
    })
    .on('broadcast', { event: 'player_left' }, ({ payload }) => {
      if (payload?.id) remotes.delete(payload.id);
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Math.max(1, Object.keys(state).length);
      $('onlineCount').textContent = count + ' online';
    })
    .subscribe(async (realtimeStatus, error) => {
      if (error) {
        console.warn('Fruit Seas realtime:', error);
      }

      if (realtimeStatus !== 'SUBSCRIBED') return;

      await channel.track({
        name: displayName,
        online_at: new Date().toISOString()
      });

      clearInterval(sendTimer);
      sendTimer = setInterval(sendState, 160);
    });
}

function sendState() {
  if (!channel || !session || !window.FruitSeasGame) return;

  const view = window.FruitSeasGame.getView();

  channel.send({
    type: 'broadcast',
    event: 'player_state',
    payload: {
      id: session.user.id,
      name: displayName,
      x: view.x,
      y: view.y,
      angle: view.angle,
      boat: view.boat,
      level: view.level,
      fruit: view.fruit,
      sea: view.sea,
      t: Date.now()
    }
  });
}

const remoteCanvas = document.createElement('canvas');
remoteCanvas.id = 'remotePlayersCanvas';
document.body.appendChild(remoteCanvas);

const remoteCtx = remoteCanvas.getContext('2d');

function remoteFrame() {
  requestAnimationFrame(remoteFrame);

  if (!window.FruitSeasGame || !remoteCtx) return;

  const view = window.FruitSeasGame.getView();
  const rect = remoteCanvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);

  const targetWidth = Math.round(rect.width * dpr);
  const targetHeight = Math.round(rect.height * dpr);

  if (
    remoteCanvas.width !== targetWidth ||
    remoteCanvas.height !== targetHeight
  ) {
    remoteCanvas.width = targetWidth;
    remoteCanvas.height = targetHeight;
  }

  remoteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  remoteCtx.clearRect(0, 0, rect.width, rect.height);

  const now = performance.now();

  for (const [id, remote] of remotes) {
    if (now - remote.seen > 3500) {
      remotes.delete(id);
      continue;
    }

    if (remote.sea !== view.sea) continue;

    const sx = rect.width / 2 + (remote.x - view.camX) * view.zoom;
    const sy = rect.height / 2 + (remote.y - view.camY) * view.zoom;

    if (
      sx < -70 ||
      sy < -70 ||
      sx > rect.width + 70 ||
      sy > rect.height + 70
    ) {
      continue;
    }

    remoteCtx.save();
    remoteCtx.translate(sx, sy);

    remoteCtx.fillStyle = '#0c303bcc';
    remoteCtx.beginPath();
    remoteCtx.ellipse(2, 13, 17, 7, 0, 0, Math.PI * 2);
    remoteCtx.fill();

    remoteCtx.fillStyle = remote.boat ? '#c2955c' : '#f3d8a4';
    remoteCtx.beginPath();
    remoteCtx.arc(0, 0, remote.boat ? 14 : 11, 0, Math.PI * 2);
    remoteCtx.fill();

    remoteCtx.strokeStyle = '#f7c66c';
    remoteCtx.lineWidth = 2;
    remoteCtx.stroke();

    remoteCtx.font = 'bold 11px Trebuchet MS';
    remoteCtx.textAlign = 'center';
    remoteCtx.fillStyle = '#082b35';
    remoteCtx.fillText((remote.name || 'Jogador').slice(0, 18), 1, -19);
    remoteCtx.fillStyle = '#fff4d9';
    remoteCtx.fillText((remote.name || 'Jogador').slice(0, 18), 0, -20);

    remoteCtx.font = '9px Trebuchet MS';
    remoteCtx.fillStyle = '#b8d3d0';
    remoteCtx.fillText('Nv. ' + (remote.level || 1), 0, -8);

    remoteCtx.restore();
  }
}

requestAnimationFrame(remoteFrame);

window.addEventListener('pagehide', () => {
  cloudUpsert();

  try {
    if (channel && session) {
      channel.send({
        type: 'broadcast',
        event: 'player_left',
        payload: {
          id: session.user.id
        }
      });
    }
  } catch {}
});

(async () => {
  submit.disabled = true;
  status('Conectando ao servidor...');

  try {
    initSupabase();

    sb.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        session = null;
        gate.classList.remove('hidden');
        $('onlineStatus').hidden = true;
        return;
      }

      if (nextSession && !session) {
        void bootUser(nextSession);
      }
    });

    const { data, error } = await sb.auth.getSession();

    if (error) throw error;

    await bootUser(data.session);
    status('');
  } catch (error) {
    sb = null;
    console.error('Fruit Seas Supabase init:', error);
    status(error?.message || 'Não foi possível iniciar o modo online.');
  } finally {
    submit.disabled = false;
  }
})();
})();