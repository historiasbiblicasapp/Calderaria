/**
 * Calderaria — Ordem de Serviço (Caldeiraria)
 * App local com localStorage + usuários master hardcoded
 * Baseado no padrão TEM 16
 */

// ─── USUÁRIOS MASTER (hardcoded local) ───────────────────────────────────────
const USERS = [
  { user: 'admin',  pass: 'admin123',  name: 'Administrador', role: 'master' },
  { user: 'master', pass: 'master123', name: 'Master User',   role: 'master' },
  { user: 'ayrton', pass: 'qualidade', name: 'Ayrton R.',     role: 'master' },
  { user: 'nelson', pass: 'aprovador', name: 'Nelson C.',     role: 'master' },
];

// ─── TRABALHOS (checkboxes do formulário original) ───────────────────────────
const TRABALHOS = [
  'DESAMASSAR', 'FURAÇÃO', 'REMOVER GRAXA', 'JATEAR',
  'DESEMPENAR', 'REMOVER ÓLEO', 'EXCESSO DE Zn', 'CORTAR',
  'SOLDAR', 'REMOVER TINTA', 'LIXAR', 'METALIZAR',
  'DESPLACAMENTO', 'PONTOS NÚS', 'OUTROS'
];

// ─── STATE ───────────────────────────────────────────────────────────────────
let currentUser = null;
let editingId = null;
let viewId = null;

const STORAGE_KEY = 'calderaria_os';
const SESSION_KEY = 'calderaria_session';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadOS() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveOS(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function toast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.classList.remove('hidden');
  requestAnimationFrame(() => {
    el.classList.remove('translate-y-4', 'opacity-0');
  });
  setTimeout(() => {
    el.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => el.classList.add('hidden'), 300);
  }, duration);
}

function confirmModal(msg) {
  return new Promise((resolve) => {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('modal-msg').textContent = msg;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const ok = () => { cleanup(); resolve(true); };
    const cancel = () => { cleanup(); resolve(false); };
    function cleanup() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.getElementById('modal-ok').removeEventListener('click', ok);
      document.getElementById('modal-cancel').removeEventListener('click', cancel);
    }
    document.getElementById('modal-ok').addEventListener('click', ok);
    document.getElementById('modal-cancel').addEventListener('click', cancel);
  });
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function prazoLabel(p) {
  return { '72h': '72 Horas', '24h': '24h Crítico', 'imediato': 'IMEDIATO' }[p] || p || '—';
}

function prazoBadge(p) {
  const cls = { '72h': 'badge-72h', '24h': 'badge-24h', 'imediato': 'badge-imediato' }[p] || 'badge-72h';
  return `<span class="badge ${cls}">${prazoLabel(p)}</span>`;
}

function statusBadge(s) {
  const cls = s === 'concluida' ? 'badge-concluida' : 'badge-aberta';
  const label = s === 'concluida' ? 'Concluída' : 'Em aberto';
  return `<span class="badge ${cls}">${label}</span>`;
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
function tryLogin(user, pass) {
  return USERS.find(u => u.user === user && u.pass === pass) || null;
}

function setSession(user) {
  currentUser = user;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: user.user, name: user.name }));
}

function clearSession() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
}

function restoreSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const u = USERS.find(x => x.user === s.user);
    if (u) {
      currentUser = u;
      return true;
    }
  } catch {}
  return false;
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('user-badge').textContent = currentUser.name;
  navigate('dashboard');
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.remove('hidden');
  const btn = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (btn) btn.classList.add('active');

  if (page === 'dashboard') renderDashboard();
  if (page === 'lista') renderLista();
  if (page === 'nova') {
    if (!editingId) resetForm();
    document.getElementById('form-title').textContent = editingId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço';
    document.getElementById('btn-voltar-lista').classList.toggle('hidden', !editingId);
  }
}

// ─── FORM ────────────────────────────────────────────────────────────────────
function buildTrabalhoCheckboxes() {
  const container = document.getElementById('trabalhos-checkboxes');
  container.innerHTML = TRABALHOS.map(t => `
    <label class="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 text-sm has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
      <input type="checkbox" name="trabalho" value="${t}" class="rounded text-primary-600" />
      <span>${t}</span>
    </label>
  `).join('');
}

function resetForm() {
  editingId = null;
  document.getElementById('form-os').reset();
  document.getElementById('os-id').value = '';
  // default dates
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('data-abertura').value = today;
  const now = new Date();
  document.getElementById('hora-abertura').value =
    String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  document.getElementById('resp-abertura').value = currentUser?.name || '';
}

function fillForm(os) {
  editingId = os.id;
  document.getElementById('os-id').value = os.id;
  document.getElementById('nro-op').value = os.nroOp || '';
  document.getElementById('nro-os').value = os.nroOs || '';
  document.getElementById('cliente').value = os.cliente || '';
  document.getElementById('item').value = os.item || '';
  document.getElementById('qtd-pecas').value = os.qtdPecas ?? '';
  document.querySelectorAll('input[name="prazo"]').forEach(r => {
    r.checked = r.value === os.prazo;
  });
  document.getElementById('resp-ocorrencia').value = os.respOcorrencia || '';
  document.getElementById('data-ocorrencia').value = os.dataOcorrencia || '';
  document.getElementById('hora-ocorrencia').value = os.horaOcorrencia || '';
  document.getElementById('data-abertura').value = os.dataAbertura || '';
  document.getElementById('hora-abertura').value = os.horaAbertura || '';
  document.getElementById('resp-abertura').value = os.respAbertura || '';
  document.querySelectorAll('input[name="trabalho"]').forEach(c => {
    c.checked = (os.trabalhos || []).includes(c.value);
  });
  document.getElementById('trabalho-outros').value = os.trabalhoOutros || '';
  document.getElementById('resp-execucao').value = os.respExecucao || '';
  document.getElementById('data-inicio').value = os.dataInicio || '';
  document.getElementById('hora-inicio').value = os.horaInicio || '';
  document.getElementById('data-fim').value = os.dataFim || '';
  document.getElementById('hora-fim').value = os.horaFim || '';
  document.getElementById('status').value = os.status || 'aberta';
  document.getElementById('insumos').value = os.insumos || '';
  document.getElementById('observacoes').value = os.observacoes || '';
}

function collectForm() {
  const trabalhos = [...document.querySelectorAll('input[name="trabalho"]:checked')].map(c => c.value);
  const prazoEl = document.querySelector('input[name="prazo"]:checked');
  return {
    id: document.getElementById('os-id').value || uid(),
    nroOp: document.getElementById('nro-op').value.trim(),
    nroOs: document.getElementById('nro-os').value.trim(),
    cliente: document.getElementById('cliente').value.trim(),
    item: document.getElementById('item').value.trim(),
    qtdPecas: document.getElementById('qtd-pecas').value ? Number(document.getElementById('qtd-pecas').value) : null,
    prazo: prazoEl ? prazoEl.value : '',
    respOcorrencia: document.getElementById('resp-ocorrencia').value.trim(),
    dataOcorrencia: document.getElementById('data-ocorrencia').value,
    horaOcorrencia: document.getElementById('hora-ocorrencia').value,
    dataAbertura: document.getElementById('data-abertura').value,
    horaAbertura: document.getElementById('hora-abertura').value,
    respAbertura: document.getElementById('resp-abertura').value.trim(),
    trabalhos,
    trabalhoOutros: document.getElementById('trabalho-outros').value.trim(),
    respExecucao: document.getElementById('resp-execucao').value.trim(),
    dataInicio: document.getElementById('data-inicio').value,
    horaInicio: document.getElementById('hora-inicio').value,
    dataFim: document.getElementById('data-fim').value,
    horaFim: document.getElementById('hora-fim').value,
    status: document.getElementById('status').value,
    insumos: document.getElementById('insumos').value.trim(),
    observacoes: document.getElementById('observacoes').value.trim(),
    updatedAt: new Date().toISOString(),
    createdAt: editingId ? undefined : new Date().toISOString(),
  };
}

function saveForm(e) {
  e.preventDefault();
  const data = collectForm();
  if (!data.nroOs || !data.cliente) {
    toast('Preencha Nº OS e Cliente');
    return;
  }
  let list = loadOS();
  const idx = list.findIndex(o => o.id === data.id);
  if (idx >= 0) {
    data.createdAt = list[idx].createdAt;
    list[idx] = data;
    toast('OS atualizada com sucesso!');
  } else {
    data.createdAt = data.updatedAt;
    list.unshift(data);
    toast('OS criada com sucesso!');
  }
  saveOS(list);
  editingId = null;
  navigate('lista');
}

// ─── LISTA ───────────────────────────────────────────────────────────────────
function renderLista() {
  const list = loadOS();
  const busca = (document.getElementById('filtro-busca').value || '').toLowerCase();
  const status = document.getElementById('filtro-status').value;
  const prazo = document.getElementById('filtro-prazo').value;

  let filtered = list.filter(os => {
    if (status && os.status !== status) return false;
    if (prazo && os.prazo !== prazo) return false;
    if (busca) {
      const hay = `${os.nroOs} ${os.nroOp} ${os.cliente} ${os.item}`.toLowerCase();
      if (!hay.includes(busca)) return false;
    }
    return true;
  });

  const tbody = document.getElementById('tabela-os');
  const empty = document.getElementById('lista-vazia');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = filtered.map(os => `
    <tr class="hover:bg-slate-50 transition">
      <td class="px-4 py-3 font-medium text-primary-700">${os.nroOs || '—'}</td>
      <td class="px-4 py-3">${os.cliente || '—'}</td>
      <td class="px-4 py-3 text-slate-600">${os.item || '—'}</td>
      <td class="px-4 py-3">${prazoBadge(os.prazo)}</td>
      <td class="px-4 py-3">${statusBadge(os.status)}</td>
      <td class="px-4 py-3 text-slate-500">${fmtDate(os.dataAbertura)}</td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <button data-view="${os.id}" class="text-primary-600 hover:underline text-xs mr-2">Ver</button>
        <button data-edit="${os.id}" class="text-amber-600 hover:underline text-xs mr-2">Editar</button>
        <button data-del="${os.id}" class="text-red-600 hover:underline text-xs">Excluir</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => viewOS(b.dataset.view)));
  tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editOS(b.dataset.edit)));
  tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteOS(b.dataset.del)));
}

async function deleteOS(id) {
  const ok = await confirmModal('Tem certeza que deseja excluir esta OS? Esta ação não pode ser desfeita.');
  if (!ok) return;
  let list = loadOS().filter(o => o.id !== id);
  saveOS(list);
  toast('OS excluída');
  renderLista();
  renderDashboard();
}

function editOS(id) {
  const os = loadOS().find(o => o.id === id);
  if (!os) return;
  fillForm(os);
  navigate('nova');
}

function viewOS(id) {
  viewId = id;
  const os = loadOS().find(o => o.id === id);
  if (!os) return;

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById('page-detalhe').classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const trabalhosHtml = (os.trabalhos || []).length
    ? (os.trabalhos || []).map(t => `<span class="badge badge-72h mr-1 mb-1">${t}</span>`).join('')
    : '—';

  document.getElementById('detalhe-conteudo').innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Identificação</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Nº OS:</dt><dd class="font-semibold">${os.nroOs || '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Nº OP:</dt><dd>${os.nroOp || '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Cliente:</dt><dd class="font-medium">${os.cliente || '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Item:</dt><dd>${os.item || '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Qtd. Peças:</dt><dd>${os.qtdPecas ?? '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Prazo:</dt><dd>${prazoBadge(os.prazo)}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-32">Status:</dt><dd>${statusBadge(os.status)}</dd></div>
        </dl>
      </div>
      <div>
        <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Ocorrência & Abertura</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex gap-2"><dt class="text-slate-500 w-40">Resp. Ocorrência:</dt><dd>${os.respOcorrencia || '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-40">Data/Hora Ocorr.:</dt><dd>${fmtDate(os.dataOcorrencia)} ${os.horaOcorrencia || ''}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-40">Data/Hora Abertura:</dt><dd>${fmtDate(os.dataAbertura)} ${os.horaAbertura || ''}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-40">Resp. Abertura:</dt><dd>${os.respAbertura || '—'}</dd></div>
        </dl>
      </div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Trabalho a Executar</h3>
      <div class="flex flex-wrap gap-1">${trabalhosHtml}</div>
      ${os.trabalhoOutros ? `<p class="text-sm mt-2 text-slate-600"><strong>Outros:</strong> ${os.trabalhoOutros}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Execução</h3>
        <dl class="space-y-2 text-sm">
          <div class="flex gap-2"><dt class="text-slate-500 w-36">Responsável:</dt><dd>${os.respExecucao || '—'}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-36">Início:</dt><dd>${fmtDate(os.dataInicio)} ${os.horaInicio || ''}</dd></div>
          <div class="flex gap-2"><dt class="text-slate-500 w-36">Fim:</dt><dd>${fmtDate(os.dataFim)} ${os.horaFim || ''}</dd></div>
        </dl>
      </div>
      <div>
        <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Insumos</h3>
        <p class="text-sm text-slate-700 whitespace-pre-wrap">${os.insumos || '—'}</p>
      </div>
    </div>
    <div>
      <h3 class="text-sm font-semibold text-slate-500 uppercase mb-2">Observações</h3>
      <p class="text-sm text-slate-700 whitespace-pre-wrap">${os.observacoes || '—'}</p>
    </div>
  `;
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function renderDashboard() {
  const list = loadOS();
  const total = list.length;
  const abertas = list.filter(o => o.status === 'aberta').length;
  const concluidas = list.filter(o => o.status === 'concluida').length;
  const criticas = list.filter(o => o.prazo === '24h' || o.prazo === 'imediato').length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-abertas').textContent = abertas;
  document.getElementById('stat-concluidas').textContent = concluidas;
  document.getElementById('stat-criticas').textContent = criticas;

  // recentes
  const recentes = list.slice(0, 8);
  const cont = document.getElementById('dash-recentes');
  if (recentes.length === 0) {
    cont.innerHTML = '<p class="text-slate-400 text-sm">Nenhuma OS cadastrada ainda.</p>';
  } else {
    cont.innerHTML = recentes.map(os => `
      <div class="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition" data-view="${os.id}">
        <div class="min-w-0">
          <p class="font-medium text-sm truncate">${os.nroOs} — ${os.cliente}</p>
          <p class="text-xs text-slate-500 truncate">${os.item || 'Sem item'} · ${fmtDate(os.dataAbertura)}</p>
        </div>
        <div class="flex-shrink-0 flex gap-1">${prazoBadge(os.prazo)} ${statusBadge(os.status)}</div>
      </div>
    `).join('');
    cont.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => viewOS(el.dataset.view)));
  }

  // criticidade
  const counts = { '72h': 0, '24h': 0, 'imediato': 0, '': 0 };
  list.forEach(o => { counts[o.prazo || ''] = (counts[o.prazo || ''] || 0) + 1; });
  const max = Math.max(...Object.values(counts), 1);
  document.getElementById('dash-criticidade').innerHTML = [
    { key: '72h', label: '72 Horas', color: 'bg-sky-500' },
    { key: '24h', label: '24h Crítico', color: 'bg-amber-500' },
    { key: 'imediato', label: 'Imediato', color: 'bg-red-500' },
  ].map(({ key, label, color }) => {
    const n = counts[key] || 0;
    const pct = Math.round((n / max) * 100);
    return `
      <div>
        <div class="flex justify-between text-sm mb-1">
          <span>${label}</span>
          <span class="font-semibold">${n}</span>
        </div>
        <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="${color} h-full rounded-full transition-all" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── SEED (opcional, dados de exemplo na primeira vez) ───────────────────────
function seedIfEmpty() {
  if (loadOS().length > 0) return;
  const sample = {
    id: uid(),
    nroOp: 'OP-2024-001',
    nroOs: 'OS-001',
    cliente: 'Cliente Exemplo Ltda',
    item: 'Chapa de aço 3mm',
    qtdPecas: 12,
    prazo: '24h',
    respOcorrencia: 'Produção',
    dataOcorrencia: new Date().toISOString().slice(0, 10),
    horaOcorrencia: '08:30',
    dataAbertura: new Date().toISOString().slice(0, 10),
    horaAbertura: '09:00',
    respAbertura: 'Ayrton R.',
    trabalhos: ['DESAMASSAR', 'SOLDAR', 'LIXAR'],
    trabalhoOutros: '',
    respExecucao: '',
    dataInicio: '',
    horaInicio: '',
    dataFim: '',
    horaFim: '',
    status: 'aberta',
    insumos: '',
    observacoes: 'OS de exemplo para demonstração do sistema.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveOS([sample]);
}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildTrabalhoCheckboxes();
  seedIfEmpty();

  // Login
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('login-user').value.trim();
    const pass = document.getElementById('login-pass').value;
    const found = tryLogin(user, pass);
    const err = document.getElementById('login-error');
    if (!found) {
      err.textContent = 'Usuário ou senha inválidos.';
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    setSession(found);
    showApp();
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    clearSession();
    showLogin();
  });

  // Nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editingId = null;
      navigate(btn.dataset.page);
    });
  });

  // Form
  document.getElementById('form-os').addEventListener('submit', saveForm);
  document.getElementById('btn-cancelar').addEventListener('click', () => {
    editingId = null;
    navigate('lista');
  });
  document.getElementById('btn-voltar-lista').addEventListener('click', () => {
    editingId = null;
    navigate('lista');
  });

  // Detalhe
  document.getElementById('btn-voltar-detalhe').addEventListener('click', () => navigate('lista'));
  document.getElementById('btn-editar-os').addEventListener('click', () => {
    if (viewId) editOS(viewId);
  });

  // Filtros
  ['filtro-busca', 'filtro-status', 'filtro-prazo'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderLista);
    document.getElementById(id).addEventListener('change', renderLista);
  });

  // Session restore
  if (restoreSession()) {
    showApp();
  } else {
    showLogin();
  }
});
