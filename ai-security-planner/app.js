(() => {
  const STORAGE_KEY = 'md_learning_planner_v1';
  const DEFAULT_PLAN_URL = 'plans/ai-security-24w.md';

  let plan = null;
  let state = loadState();

  const els = {
    title: document.getElementById('plan-title'),
    progress: document.getElementById('overall-progress'),
    startDate: document.getElementById('start-date'),
    shiftDays: document.getElementById('shift-days'),
    btnShift: document.getElementById('btn-shift'),
    mdUpload: document.getElementById('md-upload'),
    btnIcs: document.getElementById('btn-ics'),
    btnExportJson: document.getElementById('btn-export-json'),
    jsonImport: document.getElementById('json-import'),
    statusFilter: document.getElementById('status-filter'),
    searchInput: document.getElementById('search-input'),
    viewFocus: document.getElementById('view-focus'),
    viewRoadmap: document.getElementById('view-roadmap'),
    viewBookmarks: document.getElementById('view-bookmarks'),
    dropZone: document.getElementById('drop-zone')
  };

  function getNextMondayISO() {
    const d = new Date();
    const diff = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch (_) {}
    return {
      startDate: getNextMondayISO(),
      completed: {},
      notes: {},
      shifts: {}, // taskId -> extra days shifted
      customMd: null
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getTaskDate(task) {
    const base = new Date(`${state.startDate}T00:00:00`);
    const extra = state.shifts[task.id] || 0;
    base.setDate(base.getDate() + task.dayOffset + extra);
    return base;
  }

  function formatDate(d) {
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' });
  }

  function allTasks() {
    if (!plan) return [];
    return plan.modules.flatMap(m => m.weeks.flatMap(w => w.tasks));
  }

  function createTaskElement(task) {
    const row = document.createElement('div');
    const isDone = !!state.completed[task.id];
    const dueDate = getTaskDate(task);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    row.className = `task-row${isDone ? ' done' : ''}${!isDone && dueDate < today ? ' overdue' : ''}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = isDone;
    cb.addEventListener('change', () => {
      state.completed[task.id] = cb.checked;
      saveState();
      render();
    });

    const dateEl = document.createElement('span');
    dateEl.className = 'task-date';
    dateEl.textContent = formatDate(dueDate);

    const timeEl = document.createElement('span');
    timeEl.className = 'task-time';
    timeEl.textContent = task.time;

    const textEl = document.createElement('div');
    textEl.className = 'task-text';
    textEl.textContent = task.text;

    const noteEl = document.createElement('input');
    noteEl.type = 'text';
    noteEl.className = 'task-note';
    noteEl.placeholder = 'Add quick note, command, or GitHub PoC link...';
    noteEl.value = state.notes[task.id] || '';
    noteEl.addEventListener('change', () => {
      state.notes[task.id] = noteEl.value.trim();
      saveState();
    });

    row.append(cb, dateEl, timeEl, textEl, noteEl);
    return row;
  }

  function matchesFilter(task) {
    const f = els.statusFilter.value;
    const q = els.searchInput.value.trim().toLowerCase();
    const isDone = !!state.completed[task.id];

    if (f === 'pending' && isDone) return false;
    if (f === 'done' && !isDone) return false;
    if (f === 'labs' && !task.isLab) return false;
    if (q && !task.text.toLowerCase().includes(q) && !(state.notes[task.id] || '').toLowerCase().includes(q)) {
      return false;
    }
    return true;
  }

  function renderFocus() {
    els.viewFocus.replaceChildren();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAhead = new Date(today);
    weekAhead.setDate(today.getDate() + 7);

    const tasks = allTasks().filter(matchesFilter);
    const dueNow = tasks.filter(t => !state.completed[t.id] && getTaskDate(t) <= weekAhead);

    const card = document.createElement('div');
    card.className = 'card';
    const h2 = document.createElement('h2');
    h2.textContent = `Active Focus (Overdue + Next 7 Days: ${dueNow.length} tasks)`;
    card.appendChild(h2);

    if (dueNow.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'All caught up for the next 7 days. Check the Modules & Roadmap tab to get ahead.';
      card.appendChild(p);
    } else {
      dueNow.forEach(t => card.appendChild(createTaskElement(t)));
    }
    els.viewFocus.appendChild(card);
  }

  function renderRoadmap() {
    els.viewRoadmap.replaceChildren();
    plan.modules.forEach(mod => {
      const modTasks = mod.weeks.flatMap(w => w.tasks);
      const doneCount = modTasks.filter(t => state.completed[t.id]).length;
      const pct = modTasks.length ? Math.round((doneCount / modTasks.length) * 100) : 0;

      const card = document.createElement('div');
      card.className = 'card';

      const header = document.createElement('div');
      header.className = 'module-header';
      const h2 = document.createElement('h2');
      h2.textContent = mod.title;
      const stat = document.createElement('span');
      stat.className = 'badge';
      stat.textContent = `${doneCount}/${modTasks.length} (${pct}%)`;
      header.append(h2, stat);

      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = `${pct}%`;
      bar.appendChild(fill);

      const body = document.createElement('div');
      let visibleTasks = 0;

      mod.weeks.forEach(wk => {
        const filtered = wk.tasks.filter(matchesFilter);
        if (!filtered.length) return;
        visibleTasks += filtered.length;

        const wkDiv = document.createElement('div');
        wkDiv.className = 'week-block';
        const h3 = document.createElement('h3');
        h3.textContent = wk.title;
        wkDiv.appendChild(h3);
        filtered.forEach(t => wkDiv.appendChild(createTaskElement(t)));
        body.appendChild(wkDiv);
      });

      if (visibleTasks === 0) return;

      header.addEventListener('click', () => body.classList.toggle('hidden'));
      card.append(header, bar, body);
      els.viewRoadmap.appendChild(card);
    });
  }

  function renderBookmarks() {
    els.viewBookmarks.replaceChildren();
    const q = els.searchInput.value.trim().toLowerCase();

    if (!plan.bookmarks.length) {
      const p = document.createElement('p');
      p.textContent = 'No "## References / Bookmarks" section found in this Markdown file.';
      els.viewBookmarks.appendChild(p);
      return;
    }

    plan.bookmarks.forEach(group => {
      const items = group.items.filter(i => !q || i.text.toLowerCase().includes(q));
      if (!items.length) return;

      const card = document.createElement('div');
      card.className = 'card bookmark-group';
      const h3 = document.createElement('h3');
      h3.textContent = group.title;
      const ul = document.createElement('ul');
      ul.className = 'bookmark-list';

      items.forEach(item => {
        const li = document.createElement('li');
        if (item.url && /^https?:\/\//i.test(item.url)) {
          const a = document.createElement('a');
          a.href = item.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = item.text;
          li.appendChild(a);
        } else {
          li.textContent = item.text;
        }
        ul.appendChild(li);
      });

      card.append(h3, ul);
      els.viewBookmarks.appendChild(card);
    });
  }

  function render() {
    if (!plan) return;
    els.title.textContent = plan.title;
    els.startDate.value = state.startDate;

    const tasks = allTasks();
    const done = tasks.filter(t => state.completed[t.id]).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    els.progress.textContent = `${done}/${tasks.length} (${pct}%)`;

    renderFocus();
    renderRoadmap();
    renderBookmarks();
  }

  function exportICS() {
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MD Learning Planner//EN'];
    allTasks().filter(t => !state.completed[t.id]).forEach(t => {
      const d = getTaskDate(t);
      const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
      const summary = `[${t.time}] ${t.text}`.replace(/[,;\\]/g, ' ');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${t.id}@md-learning-planner`,
        `DTSTART;VALUE=DATE:${ymd}`,
        `SUMMARY:${summary}`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    downloadFile('learning-plan.ics', lines.join('\r\n'), 'text/calendar');
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function loadMarkdownContent(mdText, isCustom = false) {
    plan = window.PlanParser.parseMarkdown(mdText);
    if (isCustom) {
      state.customMd = mdText;
      saveState();
    }
    render();
  }

  // Event wiring
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    });
  });

  els.startDate.addEventListener('change', () => {
    state.startDate = els.startDate.value;
    saveState();
    render();
  });

  els.btnShift.addEventListener('click', () => {
    const days = parseInt(els.shiftDays.value, 10) || 0;
    if (days <= 0) return;
    allTasks().forEach(t => {
      if (!state.completed[t.id]) {
        state.shifts[t.id] = (state.shifts[t.id] || 0) + days;
      }
    });
    saveState();
    render();
  });

  els.mdUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(txt => loadMarkdownContent(txt, true));
  });

  els.btnIcs.addEventListener('click', exportICS);

  els.btnExportJson.addEventListener('click', () => {
    downloadFile('learning-planner-backup.json', JSON.stringify(state, null, 2), 'application/json');
  });

  els.jsonImport.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    file.text().then(txt => {
      state = JSON.parse(txt);
      saveState();
      if (state.customMd) loadMarkdownContent(state.customMd, false);
      else render();
    });
  });

  els.statusFilter.addEventListener('change', render);
  els.searchInput.addEventListener('input', render);

  // Drag-and-drop .md upload
  window.addEventListener('dragover', e => { e.preventDefault(); els.dropZone.classList.remove('hidden'); });
  window.addEventListener('dragleave', e => { if (e.target === document.documentElement) els.dropZone.classList.add('hidden'); });
  window.addEventListener('drop', e => {
    e.preventDefault();
    els.dropZone.classList.add('hidden');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.md')) file.text().then(txt => loadMarkdownContent(txt, true));
  });

  // Boot
  async function init() {
    if (state.customMd) {
      loadMarkdownContent(state.customMd, false);
      return;
    }
    try {
      const res = await fetch(DEFAULT_PLAN_URL);
      if (!res.ok) throw new Error('Default plan not found');
      loadMarkdownContent(await res.text(), false);
    } catch (_) {
      els.viewFocus.textContent = 'Place your plan at plans/ai-security-24w.md or click "Load .md" to upload one.';
    }
  }

  init();
})();
