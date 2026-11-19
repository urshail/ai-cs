/**
 * Parses a Markdown learning plan formatted with:
 *   # Title
 *   ### Module X: ...
 *   #### Week Y: ...
 *   | Day | Time | Focus & Concrete Task |
 *   ## ... References & Bookmarks
 */
window.PlanParser = (() => {
  const DAY_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

  function stripMd(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim();
  }

  function parseLinks(cell) {
    if (!cell) return [];
    const refs = [];
    const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let match;
    while ((match = mdLinkRe.exec(cell)) !== null) {
      refs.push({ label: match[1].trim(), url: match[2].trim() });
    }
    if (refs.length === 0) {
      const bareUrls = cell.match(/https?:\/\/[^\s`)]+/g) || [];
      bareUrls.forEach(url => {
        try {
          refs.push({ label: new URL(url).hostname.replace(/^www\./, ''), url });
        } catch (_) {}
      });
    }
    return refs;
  }

  function parseMarkdown(mdText) {
    const lines = mdText.split(/\r?\n/);
    const plan = { title: 'Learning Planner', modules: [], bookmarks: [] };

    let currentModule = null;
    let currentWeek = null;
    let inBookmarks = false;
    let currentBookmarkGroup = null;
    let weekCounter = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line.startsWith('# ') && plan.title === 'Learning Planner') {
        plan.title = stripMd(line.slice(2));
        continue;
      }

      if (/^##\s+.*(reference|bookmark)/i.test(line)) {
        inBookmarks = true;
        currentModule = null;
        currentWeek = null;
        continue;
      }

      if (inBookmarks) {
        if (line.startsWith('### ')) {
          currentBookmarkGroup = { title: stripMd(line.slice(4)), items: [] };
          plan.bookmarks.push(currentBookmarkGroup);
        } else if ((line.startsWith('* ') || line.startsWith('- ')) && currentBookmarkGroup) {
          const content = line.slice(2).trim();
          const urlMatch = content.match(/https?:\/\/[^\s`)]+/);
          currentBookmarkGroup.items.push({
            text: stripMd(content),
            url: urlMatch ? urlMatch[0] : null
          });
        }
        continue;
      }

      if (line.startsWith('### ')) {
        currentModule = { id: `mod-${plan.modules.length + 1}`, title: stripMd(line.slice(4)), weeks: [] };
        plan.modules.push(currentModule);
        currentWeek = null;
        continue;
      }

      if (line.startsWith('#### ')) {
        weekCounter += 1;
        const wkMatch = line.match(/Week\s+(\d+)/i);
        const weekNum = wkMatch ? parseInt(wkMatch[1], 10) : weekCounter;
        if (!currentModule) {
          currentModule = { id: 'mod-1', title: 'General', weeks: [] };
          plan.modules.push(currentModule);
        }
        currentWeek = { number: weekNum, title: stripMd(line.slice(5)), tasks: [] };
        currentModule.weeks.push(currentWeek);
        continue;
      }

      if (line.startsWith('|') && currentWeek) {
        const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (cols.length < 3) continue;
        if (/^:?-+:?$/.test(cols[0]) || /^day$/i.test(stripMd(cols[0]))) continue;

        const dayLabel = stripMd(cols[0]);
        const dayKey = dayLabel.slice(0, 3).toLowerCase();
        const offset = DAY_OFFSET[dayKey] ?? currentWeek.tasks.length;
        const time = stripMd(cols[1]);
        const taskText = stripMd(cols[2]);
        const isLab = dayKey === 'sat' || dayKey === 'sun' || /\blab\b|\bcapstone\b/i.test(taskText);
	const refs = cols[3] ? parseLinks(cols[3]) : [];

        currentWeek.tasks.push({
          id: `w${currentWeek.number}-${dayKey}-${currentWeek.tasks.length}`,
          week: currentWeek.number,
          dayLabel,
          dayOffset: (currentWeek.number - 1) * 7 + offset,
          time,
          text: taskText,
          isLab,
	  refs
        });
      }
    }

    return plan;
  }

  return { parseMarkdown };
})();
