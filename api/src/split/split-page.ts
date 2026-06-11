/**
 * Página pública de divisão de conta, servida em GET /s/:token.
 * HTML único com JS vanilla — os amigos não instalam nada.
 */
export const SPLIT_PAGE_HTML = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dividir conta</title>
<style>
  :root {
    --bg:#101210; --card:#1b1e1b; --card-alt:#242824; --border:#2d322d;
    --text:#f1f3ee; --muted:#9ba39a; --accent:#d6f44c; --on-accent:#161a08;
    --danger:#ff7a6e; --warning:#f5c04a;
  }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--text); font-family:system-ui,-apple-system,sans-serif; padding:16px; max-width:480px; margin:0 auto; }
  h1 { font-size:20px; margin:8px 0 2px; }
  .muted { color:var(--muted); font-size:13px; }
  .card { background:var(--card); border-radius:12px; padding:14px; margin-top:12px; }
  input[type=text] { width:100%; background:var(--card-alt); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:12px; font-size:16px; margin-top:8px; }
  button { width:100%; background:var(--accent); color:var(--on-accent); border:0; border-radius:12px; padding:14px; font-size:16px; font-weight:700; margin-top:12px; cursor:pointer; }
  button:disabled { opacity:.5; }
  .item { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); }
  .item:last-child { border-bottom:0; }
  .item input[type=checkbox] { width:22px; height:22px; accent-color:var(--accent); }
  .item .desc { flex:1; }
  .item .price { font-weight:700; white-space:nowrap; }
  .qty { display:flex; align-items:center; gap:6px; }
  .qty button { width:30px; padding:4px 0; margin:0; border-radius:8px; font-size:16px; }
  .qty span { min-width:34px; text-align:center; font-size:14px; }
  .row { display:flex; justify-content:space-between; padding:6px 0; }
  .total-big { font-size:28px; font-weight:800; color:var(--accent); }
  .warn { color:var(--warning); font-size:13px; margin-top:8px; }
  .pill { display:inline-block; background:var(--card-alt); border-radius:999px; padding:2px 10px; font-size:12px; color:var(--muted); margin-top:6px; }
  #toast { position:fixed; bottom:16px; left:16px; right:16px; background:var(--accent); color:var(--on-accent); padding:12px; border-radius:12px; font-weight:700; text-align:center; display:none; }
</style>
</head>
<body>
<div id="app"><p class="muted" style="margin-top:40px;text-align:center">A carregar…</p></div>
<div id="toast"></div>
<script>
const token = location.pathname.split('/').pop();
const api = (path) => location.origin + path;
const storeKey = 'split-participant-' + token;
let session = null;
let myId = localStorage.getItem(storeKey);
let selection = {}; // itemId -> quantity

function euros(c){ if(c==null) return '—'; const s=c<0?'-':''; c=Math.abs(c); return s+Math.trunc(c/100)+','+String(c%100).padStart(2,'0')+' €'; }
function esc(t){ const d=document.createElement('div'); d.textContent=t??''; return d.innerHTML; }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.style.display='block'; setTimeout(()=>t.style.display='none',2500); }

async function load(){
  const res = await fetch(api('/split-sessions/'+token));
  if(!res.ok){ document.getElementById('app').innerHTML='<div class="card"><b>Sessão não encontrada.</b><p class="muted">Pede um link novo a quem criou a conta.</p></div>'; return; }
  session = await res.json();
  if(myId && !session.participants.some(p=>p.id===myId)){ myId=null; localStorage.removeItem(storeKey); }
  if(myId){
    const me = session.participants.find(p=>p.id===myId);
    selection = {};
    me.claims.forEach(c=>{ selection[c.receipt_item_id]=c.quantity_claimed; });
  }
  render();
}

function render(){
  const app = document.getElementById('app');
  const closed = session.status==='closed';
  let html = '<h1>'+esc(session.merchant_name||'Dividir conta')+'</h1>'
    +'<div class="muted">'+(session.document_date||'')+' · Total '+euros(session.total_cents)+'</div>'
    +(closed?'<span class="pill">Sessão fechada</span>':'');

  if(!myId && !closed){
    html += '<div class="card"><b>Como te chamas?</b>'
      +'<input type="text" id="name" placeholder="O teu nome" maxlength="40">'
      +'<button onclick="join()">Entrar</button></div>';
  } else if(!closed){
    html += '<div class="card"><b>Escolhe o que consumiste</b><div class="muted">Toca nos itens; ajusta a quantidade se partilharam.</div>';
    session.items.forEach(item=>{
      const mine = selection[item.id]||0;
      const checked = mine>0;
      html += '<div class="item">'
        +'<input type="checkbox" '+(checked?'checked':'')+' onchange="toggleItem(\\''+item.id+'\\', this.checked)">'
        +'<div class="desc">'+esc(item.description)
        +(item.quantity>1?'<div class="muted">'+item.quantity+'x · '+euros(item.total_cents)+'</div>':'')
        +'</div>'
        +(item.quantity>1 && checked
          ? '<div class="qty"><button onclick="bump(\\''+item.id+'\\',-1)">−</button><span>'+mine+'</span><button onclick="bump(\\''+item.id+'\\',1)">+</button></div>'
          : '<div class="price">'+euros(Math.round(item.total_cents*(item.quantity>1?1/item.quantity:1)*(item.quantity>1?1:1)))+'</div>')
        +'</div>';
    });
    html += '<button id="save" onclick="save()">Guardar a minha parte</button></div>';
  }

  html += '<div class="card"><b>Resumo</b><div id="summary" class="muted">A calcular…</div></div>';
  app.innerHTML = html;
  refreshSummary();
}

function toggleItem(id, on){
  const item = session.items.find(i=>i.id===id);
  selection[id] = on ? (item.quantity>1?1:item.quantity) : 0;
  render();
}
function bump(id, d){
  const item = session.items.find(i=>i.id===id);
  selection[id] = Math.max(0, Math.min(item.quantity, (selection[id]||0)+d));
  render();
}

async function join(){
  const name = document.getElementById('name').value.trim();
  if(!name) return;
  const res = await fetch(api('/split-sessions/'+token+'/participants'),{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({display_name:name})});
  if(!res.ok){ toast('Não foi possível entrar.'); return; }
  const data = await res.json();
  myId = data.participant_id;
  localStorage.setItem(storeKey, myId);
  await load();
}

async function save(){
  const claims = Object.entries(selection).map(([id,q])=>({receipt_item_id:id, quantity_claimed:q}));
  const res = await fetch(api('/split-sessions/'+token+'/participants/'+myId+'/claims'),{
    method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({claims})});
  if(!res.ok){ toast('Erro ao guardar. Tenta novamente.'); return; }
  toast('Guardado!');
  refreshSummary();
}

async function refreshSummary(){
  const res = await fetch(api('/split-sessions/'+token+'/summary'));
  if(!res.ok) return;
  const s = await res.json();
  let html = '';
  s.participants.forEach(p=>{
    const me = p.id===myId;
    html += '<div class="row"><span style="color:'+(me?'var(--accent)':'var(--text)')+'">'+esc(p.display_name)+(me?' (tu)':'')+'</span>'
      +'<b>'+euros(p.total_cents)+'</b></div>';
    if(me){ html = '<div class="total-big" style="margin:8px 0">'+euros(p.total_cents)+'</div><div class="muted" style="margin-bottom:8px">a tua parte</div>'+html; }
  });
  if(s.unclaimed.length){
    html += '<div class="warn">Por reclamar: '+s.unclaimed.map(u=>esc(u.description)+' ('+euros(u.amount_cents)+')').join(', ')+'</div>';
  }
  s.warnings.forEach(w=>{ html += '<div class="warn">⚠️ '+esc(w)+'</div>'; });
  document.getElementById('summary').innerHTML = html || 'Ainda ninguém escolheu itens.';
}

load();
setInterval(refreshSummary, 5000);
</script>
</body>
</html>`;
