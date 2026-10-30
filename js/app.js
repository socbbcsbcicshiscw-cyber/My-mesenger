/* ═══════════════════ КУБ — месенджер (app.js) ═══════════════════ */
'use strict';

const LS_KEY = 'kub-messenger-v1';
const $ = (sel) => document.querySelector(sel);

const GRADS = [
  ['#7c5cff', '#00d4ff'],
  ['#ff5c9d', '#ffb35c'],
  ['#22d3a5', '#0ea5e9'],
  ['#f97316', '#ef4444'],
  ['#a855f7', '#6366f1'],
  ['#eab308', '#22c55e'],
];

const REPLIES = [
  'Привіт! 👋',
  'Як справи? 😊',
  'Супер, домовились!',
  'Пишу тобі з КУБа 🧊',
  'Зустрінемось о 18:00?',
  'Гаразд, наберу тебе трохи згодом 📞',
  'Ха-ха, кумедно 😄',
  'Ого, нічого собі!',
  'Так, звісно ✔️',
  'Дякую! 💜',
];

/* ─────────────── ДАНІ ─────────────── */
function seed() {
  const now = Date.now(), m = 60000, h = 3600000;
  return {
    me: { name: 'Мій Профіль', username: '@kub_user', phone: '+380 50 000 00 00', bio: 'Люблю КУБ 🧊💜', color: 0 },
    contacts: [
      { id: 'c1', name: 'Олена Коваль',  phone: '+380 97 123 45 67', about: 'Подруга з універу', color: 1, online: true  },
      { id: 'c2', name: 'Марко Шевченко', phone: '+380 63 765 43 21', about: 'Колега',            color: 2, online: true  },
      { id: 'c3', name: 'Софія Мельник',  phone: '+380 95 111 22 33', about: 'Однокласниця',      color: 3, online: false },
      { id: 'c4', name: 'Андрій Бондар',  phone: '+380 66 444 55 66', about: 'Сусід',             color: 4, online: false },
      { id: 'c5', name: 'Мама',           phone: '+380 50 777 88 99', about: 'Родина ❤️',         color: 5, online: true  },
    ],
    chats: [
      { id: 'ch1', contactId: 'c1', unread: 2, messages: [
        { from: 'them', text: 'Привіт! Як справи? 😊', ts: now - 42 * m },
        { from: 'me',   text: 'Все добре! А в тебе?',   ts: now - 40 * m },
        { from: 'them', text: 'Теж чудово. Йдемо завтра на каву?', ts: now - 3 * m },
        { from: 'them', text: 'О 17:00 біля метро ☕',  ts: now - 2 * m },
      ]},
      { id: 'ch2', contactId: 'c2', unread: 0, messages: [
        { from: 'me',   text: 'Марко, скинув тобі файли 📁', ts: now - 3 * h },
        { from: 'them', text: 'Дякую! Гляну ввечері 👍',     ts: now - 2.8 * h },
      ]},
      { id: 'ch3', contactId: 'c3', unread: 1, messages: [
        { from: 'them', text: 'Софо, ти бачила новий месенджер КУБ? 🧊', ts: now - 5 * h },
      ]},
      { id: 'ch5', contactId: 'c5', unread: 0, messages: [
        { from: 'them', text: 'Сину, не забудь поїсти 🍲', ts: now - 26 * h },
        { from: 'me',   text: 'Мам, все добре, їв! ❤️',    ts: now - 25.5 * h },
      ]},
    ],
  };
}

let state;
try {
  state = JSON.parse(localStorage.getItem(LS_KEY)) || seed();
} catch (e) {
  state = seed();
}
const save = () => localStorage.setItem(LS_KEY, JSON.stringify(state));

let currentChatId = null;
let replyTimer = null;

/* ─────────────── ДОПОМІЖНІ ─────────────── */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const grad = (i) => GRADS[i % GRADS.length];
const initials = (name) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
const contactOf = (chat) => state.contacts.find((c) => c.id === chat.contactId);
const pad = (n) => String(n).padStart(2, '0');
const fmtTime = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function fmtChatTime(ts) {
  const d = new Date(ts), now = new Date();
  return d.toDateString() === now.toDateString() ? fmtTime(ts) : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}
const dayLabel = (ts) => {
  const d = new Date(ts), now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Сьогодні';
  if (d.toDateString() === new Date(now - 864e5).toDateString()) return 'Вчора';
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
};

const avatarHTML = (person, size = '') => {
  const [c1, c2] = grad(person.color);
  return `<div class="avatar ${size}" style="background:linear-gradient(135deg,${c1},${c2})">${esc(initials(person.name))}${person.online ? '<span class="dot"></span>' : ''}</div>`;
};

function vibrate(ms = 10) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

/* маленький звуковий «блип» */
let audioCtx = null;
function blip(freq, dur = 0.06) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}

/* ─────────────── ТОСТ ─────────────── */
let toastTimer = null;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}

/* ─────────────── РЕНДЕР: ЧАТИ ─────────────── */
function renderChats(filter = '') {
  const list = $('#chatList');
  const q = filter.trim().toLowerCase();
  const chats = [...state.chats]
    .filter((ch) => contactOf(ch)?.name.toLowerCase().includes(q))
    .sort((a, b) => (b.messages.at(-1)?.ts || 0) - (a.messages.at(-1)?.ts || 0));

  if (!chats.length) {
    list.innerHTML = `<div class="empty"><b>Немає чатів</b>${q ? 'Нічого не знайдено за запитом' : 'Створіть контакт, щоб почати спілкування'}</div>`;
    return;
  }
  list.innerHTML = chats.map((ch, i) => {
    const c = contactOf(ch);
    const last = ch.messages.at(-1);
    return `<div class="chat-item" data-id="${ch.id}" style="animation-delay:${i * 45}ms">
      ${avatarHTML(c)}
      <div class="chat-mid">
        <div class="chat-name">${esc(c.name)}</div>
        <div class="chat-last ${last?.from === 'me' ? 'you' : ''}">${last ? esc(last.text) : 'Почніть розмову'}</div>
      </div>
      <div class="chat-right">
        <div class="chat-time">${last ? fmtChatTime(last.ts) : ''}</div>
        ${ch.unread ? `<div class="unread">${ch.unread}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ─────────────── РЕНДЕР: КОНТАКТИ ─────────────── */
function renderContacts() {
  const list = $('#contactList');
  const cs = [...state.contacts].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  if (!cs.length) {
    list.innerHTML = `<div class="empty"><b>Контактів ще немає</b>Натисніть ＋, щоб створити перший</div>`;
    return;
  }
  list.innerHTML = cs.map((c, i) => `
    <div class="contact-item" style="animation-delay:${i * 45}ms">
      ${avatarHTML(c)}
      <div class="chat-mid">
        <div class="contact-name">${esc(c.name)}</div>
        <div class="contact-sub ${c.online ? 'online' : ''}">${c.online ? 'у мережі' : esc(c.about || c.phone || '')}</div>
      </div>
      <button class="btn-mini" data-write="${c.id}">Написати</button>
    </div>`).join('');
}

/* ─────────────── РЕНДЕР: ПРОФІЛЬ ─────────────── */
function renderProfile() {
  const me = state.me;
  const msgCount = state.chats.reduce((n, ch) => n + ch.messages.length, 0);
  $('#profileCard').innerHTML = `
    <div class="profile-avatar-wrap">${avatarHTML(me, 'lg')}</div>
    <div class="profile-name">${esc(me.name)}</div>
    <div class="profile-username">${esc(me.username)}</div>
    ${me.bio ? `<div class="profile-bio">${esc(me.bio)}</div>` : ''}
    <div class="profile-phone">📱&nbsp; ${esc(me.phone)}</div>
    <div class="profile-stats">
      <div class="stat" style="animation-delay:.05s"><b>${state.chats.length}</b><span>чатів</span></div>
      <div class="stat" style="animation-delay:.13s"><b>${state.contacts.length}</b><span>контактів</span></div>
      <div class="stat" style="animation-delay:.21s"><b>${msgCount}</b><span>повідомлень</span></div>
    </div>
    <button class="profile-edit" id="btnEditProfile2">Редагувати профіль</button>`;
}

/* ─────────────── НАВІГАЦІЯ (нижній бар) ─────────────── */
const SCREENS = ['chats', 'contacts', 'profile'];
function switchScreen(name) {
  const idx = SCREENS.indexOf(name);
  $('#navPill').style.transform = `translateX(${idx * 100}%)`;
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.target === name));
  document.querySelectorAll('.screen').forEach((s) => {
    const active = s.id === `screen-${name}`;
    s.classList.toggle('active', active);
    if (active) s.scrollTop = 0;
  });
}

/* ─────────────── РОЗМОВА (ЛС) ─────────────── */
function scrollBottom() {
  const box = $('#messages');
  box.scrollTop = box.scrollHeight;
}

function renderMessages() {
  const chat = state.chats.find((c) => c.id === currentChatId);
  if (!chat) return;
  const box = $('#messages');
  let html = '', lastDay = '';
  chat.messages.forEach((msg, i) => {
    const day = dayLabel(msg.ts);
    if (day !== lastDay) { html += `<div class="day-sep">${day}</div>`; lastDay = day; }
    html += `<div class="msg ${msg.from}" style="animation-delay:${Math.min(i, 6) * 30}ms">${esc(msg.text)}<span class="time">${fmtTime(msg.ts)}</span></div>`;
  });
  box.innerHTML = html;
  scrollBottom();
}

function openChat(chatId) {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  currentChatId = chatId;
  const c = contactOf(chat);
  $('#chatAvatar').outerHTML = avatarHTML(c, 'sm').replace('avatar sm', 'avatar sm" id="chatAvatar');
  $('#chatName').textContent = c.name;
  updatePeerStatus();
  renderMessages();
  chat.unread = 0; save(); renderChats($('#chatSearch').value);
  const view = $('#chatView');
  view.classList.add('open');
  view.setAttribute('aria-hidden', 'false');
  vibrate(8);
}

function closeChat() {
  currentChatId = null;
  const view = $('#chatView');
  view.classList.remove('open');
  view.setAttribute('aria-hidden', 'true');
  renderChats($('#chatSearch').value);
}

function updatePeerStatus(isTyping = false) {
  const chat = state.chats.find((c) => c.id === currentChatId);
  if (!chat) return;
  const c = contactOf(chat);
  const el = $('#chatStatus');
  el.textContent = isTyping ? 'друкує…' : (c.online ? 'у мережі' : 'нещодавно');
  el.className = 'chat-peer-status' + (isTyping ? ' typing' : (c.online ? '' : ' off'));
}

/* надсилання повідомлення */
function sendMessage(text) {
  const chat = state.chats.find((c) => c.id === currentChatId);
  if (!chat) return;
  chat.messages.push({ from: 'me', text, ts: Date.now() });
  save();
  appendBubble(chat.messages.at(-1));
  blip(660); vibrate(12);
  scheduleReply(chat);
}

function appendBubble(msg) {
  const box = $('#messages');
  box.querySelector('.typing')?.remove();
  const div = document.createElement('div');
  div.className = `msg ${msg.from}`;
  div.innerHTML = `${esc(msg.text)}<span class="time">${fmtTime(msg.ts)}</span>`;
  box.appendChild(div);
  scrollBottom();
}

/* імітація відповіді співрозмовника */
function scheduleReply(chat) {
  clearTimeout(replyTimer);
  replyTimer = setTimeout(() => {
    const c = contactOf(chat);
    if (currentChatId === chat.id) {
      updatePeerStatus(true);
      const box = $('#messages');
      const t = document.createElement('div');
      t.className = 'typing'; t.innerHTML = '<i></i><i></i><i></i>';
      box.appendChild(t); scrollBottom();
    }
    replyTimer = setTimeout(() => {
      const reply = { from: 'them', text: REPLIES[(Math.random() * REPLIES.length) | 0], ts: Date.now() };
      chat.messages.push(reply);
      if (currentChatId === chat.id) {
        appendBubble(reply);
        updatePeerStatus(false);
      } else {
        chat.unread++;
      }
      save(); renderChats($('#chatSearch').value);
      blip(880);
    }, currentChatId === chat.id ? 1300 + Math.random() * 1500 : 400);
  }, 900 + Math.random() * 1600);
}

/* ─────────────── ШТОРКИ ─────────────── */
function openSheet(id) {
  $('#sheetBackdrop').classList.add('show');
  $(id).classList.add('open');
}
function closeSheets() {
  $('#sheetBackdrop').classList.remove('show');
  document.querySelectorAll('.sheet').forEach((s) => s.classList.remove('open'));
}

/* ─────────────── ПОДІЇ ─────────────── */
document.querySelectorAll('.nav-btn').forEach((btn) =>
  btn.addEventListener('click', () => { switchScreen(btn.dataset.target); vibrate(6); }));

$('#chatList').addEventListener('click', (e) => {
  const item = e.target.closest('.chat-item');
  if (item) openChat(item.dataset.id);
});

$('#contactList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-write]');
  if (!btn) return;
  let chat = state.chats.find((ch) => ch.contactId === btn.dataset.write);
  if (!chat) {
    chat = { id: 'ch' + Date.now(), contactId: btn.dataset.write, unread: 0, messages: [] };
    state.chats.push(chat); save();
  }
  openChat(chat.id);
});

$('#btnBack').addEventListener('click', closeChat);
$('#btnChatInfo').addEventListener('click', () => {
  const chat = state.chats.find((c) => c.id === currentChatId);
  const c = chat && contactOf(chat);
  if (c) toast(`${c.name} · ${c.phone || 'без номера'}`);
});
$('#btnAttach').addEventListener('click', () => toast('Наклейки та файли — скоро 😄'));

$('#msgForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#msgInput');
  const text = input.value.trim();
  if (!text || !currentChatId) return;
  input.value = '';
  sendMessage(text);
});

$('#chatSearch').addEventListener('input', (e) => renderChats(e.target.value));

/* створення контакту */
const openAddContact = () => { $('#formAddContact').reset(); openSheet('#sheetAddContact'); setTimeout(() => $('#cName').focus(), 380); };
$('#btnAddContact').addEventListener('click', openAddContact);
$('#fabAddContact').addEventListener('click', openAddContact);
$('#btnNewChat').addEventListener('click', openAddContact);

$('#formAddContact').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#cName').value.trim();
  if (!name) return;
  const contact = {
    id: 'c' + Date.now(),
    name,
    phone: $('#cPhone').value.trim(),
    about: $('#cAbout').value.trim() || 'Новий контакт',
    color: (Math.random() * GRADS.length) | 0,
    online: Math.random() > 0.45,
  };
  state.contacts.push(contact);
  save();
  renderContacts();
  closeSheets();
  switchScreen('contacts');
  toast(`Контакт «${name}» створено ✔`);
  vibrate([10, 40, 10]);
});

/* редагування профілю */
function openEditProfile() {
  const me = state.me;
  $('#pName').value = me.name;
  $('#pUsername').value = me.username;
  $('#pBio').value = me.bio;
  renderColorRow(me.color);
  openSheet('#sheetEditProfile');
}
$('#btnEditProfile').addEventListener('click', openEditProfile);
$('#profileCard').addEventListener('click', (e) => {
  if (e.target.closest('#btnEditProfile2')) openEditProfile();
});

function renderColorRow(selected) {
  $('#colorRow').innerHTML = GRADS.map(([c1, c2], i) =>
    `<button type="button" class="color-dot ${i === selected ? 'sel' : ''}" data-color="${i}" style="background:linear-gradient(135deg,${c1},${c2})" aria-label="Колір ${i + 1}"></button>`
  ).join('');
}
$('#colorRow').addEventListener('click', (e) => {
  const dot = e.target.closest('.color-dot');
  if (!dot) return;
  state.me.color = +dot.dataset.color;
  document.querySelectorAll('.color-dot').forEach((d) => d.classList.toggle('sel', d === dot));
  vibrate(6);
});

$('#formEditProfile').addEventListener('submit', (e) => {
  e.preventDefault();
  const me = state.me;
  me.name = $('#pName').value.trim() || me.name;
  me.username = $('#pUsername').value.trim() || me.username;
  me.bio = $('#pBio').value.trim();
  save();
  renderProfile();
  closeSheets();
  toast('Профіль оновлено ✔');
  vibrate([10, 40, 10]);
});

$('#sheetBackdrop').addEventListener('click', closeSheets);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheets(); if (currentChatId) closeChat(); } });

/* ─────────────── СТАРТ / SPLASH (5 с) ─────────────── */
function startApp() {
  renderChats();
  renderContacts();
  renderProfile();
  switchScreen('chats');

  const statuses = ['Ініціалізація…', 'З\'єднання з сервером…', 'Синхронізація контактів…', 'Завантаження чатів…', 'Готово! ✨'];
  const statusEl = $('#splashStatus');
  statuses.forEach((s, i) =>
    setTimeout(() => {
      statusEl.style.opacity = 0;
      setTimeout(() => { statusEl.textContent = s; statusEl.style.opacity = 1; }, 200);
    }, i * 1050));

  /* рівно 5 секунд крутимо куб */
  setTimeout(() => {
    $('#splash').classList.add('hide');
    const app = $('#app');
    app.removeAttribute('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => app.classList.add('boot')));
    setTimeout(() => $('#splash').remove(), 800);
  }, 5000);
}
startApp();

/* ─────────────── PWA ─────────────── */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
