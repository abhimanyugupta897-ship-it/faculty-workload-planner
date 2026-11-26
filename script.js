'use strict';

/* ---------- Constants and helpers ---------- */
const KEY = 'fwp-v1';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];
const SEMS = [1, 2, 3, 4, 5, 6, 7, 8];
const ROLES = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];
const ADMIN = { u: 'admin', p: 'admin123' }; // demo only: a client-side check is not real security

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

/* ---------- Data (saved in the browser's localStorage) ---------- */
const seed = () => ({
  faculty: [
    ['f1', 'Dr. Anita Sharma', ROLES[0], 10], ['f2', 'Dr. Rajesh Kumar', ROLES[1], 14],
    ['f3', 'Ms. Priya Singh', ROLES[2], 16], ['f4', 'Mr. Harpreet Gill', ROLES[2], 16]
  ].map(([id, name, role, max]) => ({ id, name, role, max })),
  courses: [
    ['c1', 'CSE101', 'Programming in C', 1, 4, 'Mon', '09:00'], ['c2', 'MTH101', 'Engineering Mathematics', 1, 4, 'Tue', '10:00'],
    ['c3', 'PHY101', 'Engineering Physics', 1, 3, 'Wed', '11:00'], ['c4', 'CSE201', 'Data Structures', 3, 4, 'Mon', '09:00'],
    ['c5', 'CSE203', 'Database Systems', 3, 4, 'Thu', '14:00'], ['c6', 'CSE305', 'Operating Systems', 5, 4, 'Fri', '10:00'],
    ['c7', 'CSE311', 'Cloud Computing', 5, 3, 'Tue', '15:00'], ['c8', 'INT108', 'Python Programming', 1, 3, 'Thu', '09:00']
  ].map(([id, code, name, sem, units, day, slot]) => ({ id, code, name, sem, units, day, slot })),
  alloc: [['f1', 'c1'], ['f1', 'c4'], ['f1', 'c6'], ['f2', 'c2'], ['f2', 'c5'], ['f3', 'c3'], ['f4', 'c7']]
    .map(([f, c], i) => ({ id: 'a' + i, f, c }))
});

let db = null, admin = false, view = 'dashboard', toastTimer;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch { }
if (!db || !Array.isArray(db.faculty)) db = seed();
try { admin = sessionStorage.getItem('fwp-admin') === '1'; } catch { }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } };

const fac = id => db.faculty.find(f => f.id === id);
const crs = id => db.courses.find(c => c.id === id);
const loadOf = id => db.alloc.filter(a => a.f === id).reduce((s, a) => s + (crs(a.c)?.units || 0), 0);
const teacherOf = c => { const a = db.alloc.find(x => x.c === c.id); return a ? fac(a.f) : null; };

/* ---------- Conflict rules: overload (limit) and time clash ---------- */
function conflicts() {
  const out = [];
  db.faculty.forEach(f => {
    const mine = db.alloc.filter(a => a.f === f.id).map(a => crs(a.c)).filter(Boolean);
    const u = mine.reduce((s, c) => s + c.units, 0);
    if (u > f.max) out.push({ fid: f.id, type: 'over', msg: `Overload: ${f.name} is at ${u} of ${f.max} units` });
    const slots = {};
    mine.forEach(c => (slots[c.day + ' ' + c.slot] = slots[c.day + ' ' + c.slot] || []).push(c.code));
    Object.entries(slots).filter(([, v]) => v.length > 1)
      .forEach(([k, v]) => out.push({ fid: f.id, type: 'clash', msg: `Time clash: ${f.name} has ${v.join(' and ')} at ${k}` }));
  });
  return out;
}

/* ---------- Rendering ---------- */
const meter = (u, m) => `<div class="meter" title="${u} of ${m} units">${Array.from({ length: Math.max(u, m) },
  (_, i) => `<i class="${i < m ? (i < u ? 'f' : '') : 'x'}${i === m - 1 ? ' l' : ''}"></i>`).join('')}</div>
  <small>${u} of ${m} units${u > m ? ` (over by ${u - m})` : ''}</small>`;

const acts = (k, id) => admin ? `<td class="acts"><button class="btn sm" data-act="edit${k}" data-id="${id}">Edit</button><button class="btn sm danger" data-act="del${k}" data-id="${id}">Delete</button></td>` : '';

function render() {
  document.body.classList.toggle('admin', admin);
  $('#role').textContent = admin ? 'Signed in as admin' : 'Viewer (read-only)';
  $('#authBtn').textContent = admin ? 'Log out' : 'Admin login';
  document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== view);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const cf = conflicts(), shown = view === 'dashboard' ? cf : cf.slice(0, 4);
  $('#alerts').innerHTML = shown.map(c => `<div class="alert ${c.type}">${esc(c.msg)}</div>`).join('')
    + (cf.length > shown.length ? `<div class="muted">${cf.length - shown.length} more warnings on the Dashboard</div>` : '');
  ({ dashboard: rDash, faculty: rFac, courses: rCrs, allocate: rAlloc, semester: rSem })[view]();
}

function rDash() {
  const un = db.courses.filter(c => !db.alloc.some(a => a.c === c.id)).length;
  const ov = db.faculty.filter(f => loadOf(f.id) > f.max).length;
  const tot = db.faculty.reduce((s, f) => s + loadOf(f.id), 0), cap = db.faculty.reduce((s, f) => s + f.max, 0);
  $('#stats').innerHTML = [['Faculty', db.faculty.length], ['Courses', db.courses.length], ['Units allocated', `${tot} / ${cap}`],
    ['Unallocated courses', un, un], ['Overloaded faculty', ov, ov]]
    .map(([l, v, flag]) => `<div class="stat${flag ? ' flag' : ''}"><b>${v}</b><span>${l}</span></div>`).join('');
  $('#loadList').innerHTML = db.faculty.map(f => `<div class="row"><div><strong>${esc(f.name)}</strong><div class="muted">${esc(f.role)}</div></div><div>${meter(loadOf(f.id), f.max)}</div></div>`).join('')
    || '<p class="muted">No faculty yet. Log in as admin to add faculty profiles.</p>';
}

function rFac() {
  $('#facBody').innerHTML = db.faculty.map(f => `<tr><td>${esc(f.name)}</td><td>${esc(f.role)}</td><td>${f.max}</td><td>${meter(loadOf(f.id), f.max)}</td>${acts('F', f.id)}</tr>`).join('')
    || '<tr><td colspan="5" class="muted">No faculty yet.</td></tr>';
}

function rCrs() {
  $('#crsBody').innerHTML = db.courses.map(c => { const f = teacherOf(c);
    return `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${c.sem}</td><td>${c.units}</td><td>${c.day} ${c.slot}</td><td>${f ? esc(f.name) : '<span class="tag">Unassigned</span>'}</td>${acts('C', c.id)}</tr>`; }).join('')
    || '<tr><td colspan="7" class="muted">No courses yet.</td></tr>';
}

function rAlloc() {
  const free = db.courses.filter(c => !db.alloc.some(a => a.c === c.id));
  $('#aF').innerHTML = db.faculty.map(f => `<option value="${f.id}">${esc(f.name)}</option>`).join('');
  $('#aC').innerHTML = free.map(c => `<option value="${c.id}">${esc(c.code)} - ${esc(c.name)} (${c.units} units, ${c.day} ${c.slot})</option>`).join('');
  $('#aBtn').disabled = !free.length || !db.faculty.length;
  $('#allocCards').innerHTML = db.faculty.map(f => {
    const chips = db.alloc.filter(a => a.f === f.id && crs(a.c)).map(a => { const c = crs(a.c);
      return `<span class="chip"><b>${esc(c.code)}</b> <small>${c.units}u ${c.day} ${c.slot}</small>${admin ? `<button data-act="unalloc" data-id="${a.id}" title="Remove allocation" aria-label="Remove ${esc(c.code)}">&times;</button>` : ''}</span>`; }).join('');
    return `<div class="panel"><h3>${esc(f.name)}</h3><div class="muted">${esc(f.role)}</div>${meter(loadOf(f.id), f.max)}<div class="chips">${chips || '<span class="muted">No courses assigned yet</span>'}</div></div>`;
  }).join('');
  $('#freeList').innerHTML = `<div class="chips" style="margin:0">${free.map(c => `<span class="chip"><b>${esc(c.code)}</b> <small>${esc(c.name)}</small></span>`).join('') || '<span class="muted">Every course has a faculty member.</span>'}</div>`;
}

function rSem() {
  const s = $('#semSel').value, cs = db.courses.filter(c => String(c.sem) === s);
  $('#semBody').innerHTML = cs.map(c => { const f = teacherOf(c);
    return `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${c.units}</td><td>${c.day} ${c.slot}</td><td>${f ? esc(f.name) : '<span class="tag">Unassigned</span>'}</td></tr>`; }).join('')
    || '<tr><td colspan="5" class="muted">No courses in this semester yet.</td></tr>';
  $('#grid').innerHTML = '<tr><th></th>' + DAYS.map(d => `<th>${d}</th>`).join('') + '</tr>'
    + SLOTS.map(t => `<tr><th>${t}</th>` + DAYS.map(d => '<td>' + cs.filter(c => c.day === d && c.slot === t)
      .map(c => `<div class="cell"><b>${esc(c.code)}</b><small>${esc(teacherOf(c)?.name || 'Unassigned')}</small></div>`).join('') + '</td>').join('') + '</tr>').join('');
}

/* ---------- Feedback and forms ---------- */
function toast(msg, type = '') {
  const t = $('#toast'); t.textContent = msg; t.className = 'show ' + type;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 3500);
}
function done(msg, type) { save(); render(); toast(msg, type); }

function form(title, fields, vals, onSave) {
  $('#formTitle').textContent = title;
  $('#formBody').innerHTML = fields.map(f => `<label>${f.l}` + (f.o
    ? `<select name="${f.k}">${f.o.map(o => `<option${String(o) === String(vals[f.k]) ? ' selected' : ''}>${o}</option>`).join('')}</select>`
    : `<input name="${f.k}" type="${f.t || 'text'}" value="${esc(vals[f.k] ?? '')}"${f.t === 'number' ? ' min="1" max="40"' : ''} required>`) + '</label>').join('');
  $('#formEl').onsubmit = e => { e.preventDefault(); if (onSave(Object.fromEntries(new FormData(e.target))) !== false) $('#formDlg').close(); };
  $('#formDlg').showModal();
}

function fForm(f = {}) {
  form(f.id ? 'Edit faculty' : 'Add faculty', [
    { k: 'name', l: 'Full name' }, { k: 'role', l: 'Designation', o: ROLES }, { k: 'max', l: 'Workload limit (units per week)', t: 'number' }
  ], f, v => {
    const o = { name: v.name.trim(), role: v.role, max: +v.max };
    if (!o.name) return toast('Enter the faculty name', 'bad'), false;
    if (f.id) Object.assign(f, o); else db.faculty.push({ id: uid('f'), ...o });
    done('Faculty saved');
  });
}

function cForm(c = {}) {
  form(c.id ? 'Edit course' : 'Add course', [
    { k: 'code', l: 'Course code' }, { k: 'name', l: 'Course name' }, { k: 'sem', l: 'Semester', o: SEMS },
    { k: 'units', l: 'Workload units (hours per week)', t: 'number' }, { k: 'day', l: 'Day', o: DAYS }, { k: 'slot', l: 'Time slot', o: SLOTS }
  ], c, v => {
    const o = { code: v.code.trim().toUpperCase(), name: v.name.trim(), sem: +v.sem, units: +v.units, day: v.day, slot: v.slot };
    if (!o.code || !o.name) return toast('Enter the course code and name', 'bad'), false;
    if (db.courses.some(x => x.code === o.code && x.id !== c.id)) return toast('That course code already exists', 'bad'), false;
    if (c.id) Object.assign(c, o); else db.courses.push({ id: uid('c'), ...o });
    done('Course saved');
  });
}

/* ---------- Actions ---------- */
function assign() {
  const f = $('#aF').value, c = $('#aC').value;
  if (!f || !c) return;
  db.alloc.push({ id: uid('a'), f, c });
  const w = conflicts().filter(x => x.fid === f);
  done(w.length ? 'Assigned. ' + w[0].msg : 'Course assigned', w.length ? 'warn' : '');
}

function exportCSV() {
  const rows = [['Faculty', 'Designation', 'Limit (units)', 'Allocated (units)', 'Utilisation %', 'Courses']];
  db.faculty.forEach(f => {
    const u = loadOf(f.id);
    rows.push([f.name, f.role, f.max, u, Math.round(u / f.max * 100), db.alloc.filter(a => a.f === f.id).map(a => crs(a.c)?.code).join(' ')]);
  });
  const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'faculty-workload-report.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const ACT = {
  addF: () => fForm(), editF: id => fForm(fac(id)),
  delF: id => confirm('Delete this faculty member and their allocations?') &&
    (db.faculty = db.faculty.filter(f => f.id !== id), db.alloc = db.alloc.filter(a => a.f !== id), done('Faculty deleted')),
  addC: () => cForm(), editC: id => cForm(crs(id)),
  delC: id => confirm('Delete this course?') &&
    (db.courses = db.courses.filter(c => c.id !== id), db.alloc = db.alloc.filter(a => a.c !== id), done('Course deleted')),
  unalloc: id => (db.alloc = db.alloc.filter(a => a.id !== id), done('Allocation removed')),
  assign,
  reset: () => confirm('Replace all data with the demo set?') && (db = seed(), done('Demo data restored'))
};

/* ---------- Events and start-up ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-view],[data-act]');
  if (!b) return;
  if (b.dataset.view) { view = b.dataset.view; return render(); }
  const { act, id } = b.dataset;
  if (act === 'export') return exportCSV();
  if (admin) ACT[act]?.(id);   // every edit action requires admin
});

$('#authBtn').onclick = () => {
  if (admin) {
    admin = false;
    try { sessionStorage.removeItem('fwp-admin'); } catch { }
    done('Logged out');
  } else $('#loginDlg').showModal();
};

$('#loginEl').onsubmit = e => {
  e.preventDefault();
  const v = Object.fromEntries(new FormData(e.target));
  if (v.u.trim() === ADMIN.u && v.p === ADMIN.p) {
    admin = true;
    try { sessionStorage.setItem('fwp-admin', '1'); } catch { }
    e.target.reset(); $('#loginErr').textContent = '';
    $('#loginDlg').close();
    done('Logged in as admin');
  } else $('#loginErr').textContent = 'Wrong username or password. Try again.';
};

$('#semSel').innerHTML = SEMS.map(s => `<option>${s}</option>`).join('');
$('#semSel').onchange = render;
render();
