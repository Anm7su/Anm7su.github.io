(function () {
  'use strict';
  var seed = window.SystemLabData;
  var storageKey = 'zhouziqi-system-lab-mvp';
  var knowledge = seed.knowledge;
  var questions = seed.questions.map(function (q) { return Object.assign({}, q); });
  var originals = Object.fromEntries(seed.questions.map(function (q) { return [q.id, q.answer]; }));
  var state = { tab: 'questions', question: 'q1', knowledge: 'loop', search: '', kSearch: '', qFullSearch: false, kFullSearch: false, kKind: 'all', kFamily: 'all', stars: 'all', type: 'all', topic: 'all', source: 'all', sort: 'number', gaps: [], reviewQueue: {}, drafts: {}, editing: false, largeText: false, fullReading: false, readStep: 0, readSteps: {} };
  var storageOK = true;
  var backup = window.SystemLabBackup;
  var baseline = {};
  var pendingImport = null;
  var gapReviews = [];
  var pendingGapReview = null;
  var importReadVersion = 0;
  var importFileReading = false;
  var recoveryKey = storageKey + '-before-import';
  function $(id) { return document.getElementById(id); }
  function escapeHTML(value) { return String(value).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
  function card(id) { return knowledge.find(function (k) { return k.id === id; }); }
  function currentQuestion() { return questions.find(function (q) { return q.id === state.question; }); }
  function status(message, error) { $('saveStatus').textContent = message; $('saveStatus').classList.toggle('error', Boolean(error)); }
  function readRecord() {
    var record = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid saved record');
    ['answers', 'defaults'].forEach(function (name) {
      if (record[name] !== undefined && (!record[name] || typeof record[name] !== 'object' || Array.isArray(record[name]))) throw new Error('Invalid ' + name);
      Object.keys(record[name] || {}).forEach(function (id) {
        if (['__proto__', 'constructor', 'prototype'].indexOf(id) !== -1 || typeof record[name][id] !== 'string') throw new Error('Invalid answer');
      });
    });
    if (record.reviewQueue !== undefined) {
      if (!record.reviewQueue || typeof record.reviewQueue !== 'object' || Array.isArray(record.reviewQueue)) throw new Error('Invalid review queue');
      Object.keys(record.reviewQueue).forEach(function (id) {
        var item = record.reviewQueue[id];
        if (!/^q\d+$/.test(id) || !item || typeof item !== 'object' || Array.isArray(item) || typeof item.remove !== 'boolean' || typeof item.change !== 'boolean' || typeof item.note !== 'string') throw new Error('Invalid review item');
      });
    }
    backup.reviewList(record.gapReviews);
    return record;
  }
  function effectiveAnswers(record) {
    var result = Object.assign({}, record.answers || {});
    questions.forEach(function (q) { result[q.id] = typeof result[q.id] === 'string' ? backup.effective(q.id, result[q.id], record.defaults || {}, originals, seed.legacyAnswers || {}) : originals[q.id]; });
    return result;
  }
  function acceptRecord(record, committedId) {
    var latest = effectiveAnswers(record);
    questions.forEach(function (q) {
      // 正在改稿的题保留最初读到的基线；保存另一题或缺口不能解除其冲突保护。
      if (q.id !== committedId && Object.prototype.hasOwnProperty.call(state.drafts, q.id)) return;
      baseline[q.id] = latest[q.id]; q.answer = latest[q.id];
    });
    if (Array.isArray(record.gaps)) state.gaps = record.gaps.filter(function (gap) { return typeof gap === 'string'; });
    gapReviews = backup.reviewList(record.gapReviews);
    state.reviewQueue = record.reviewQueue || {};
  }

  // 继续使用第一版的保存键和题目 ID，不清除已有答案。
  try {
    acceptRecord(readRecord());
  } catch (error) {
    storageOK = false;
    status('无法读取本地记录，请先备份', true);
  }
  function persist(questionId) {
    if (!storageOK) { status('保存不可用，请先复制答案', true); return false; }
    try {
      // 保留不属于当前示例集的答案，为后续题目增删留下兼容空间。
      var existing = readRecord();
      var answers = Object.assign({}, existing.answers || {});
      var defaults = Object.assign({}, existing.defaults || {});
      if (questionId) {
        if (effectiveAnswers(existing)[questionId] !== baseline[questionId]) { status('另一页面已改此题，草稿已保留；请备份后刷新核对', true); return false; }
        answers[questionId] = currentQuestion().answer;
        defaults[questionId] = originals[questionId];
      }
      var gaps = Array.from(new Set((Array.isArray(existing.gaps) ? existing.gaps : []).concat(state.gaps)));
      var next = Object.assign({}, existing, { answers: answers, gaps: gaps, defaults: defaults, reviewQueue: state.reviewQueue, contentVersion: seed.version });
      localStorage.setItem(storageKey, JSON.stringify(next));
      acceptRecord(next, questionId);
      status('已保存 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch (error) { status('保存失败，请先复制答案', true); return false; }
  }
  function renderStats() {
    $('questionCount').textContent = questions.length;
    $('knowledgeCount').textContent = knowledge.length;
    var open = [], closed = [];
    state.gaps.forEach(function (gap, index) {
      var review = gapReviews.find(function (r) { return r.text === gap; });
      var target = review && questions.find(function (q) { return q.id === review.questionId; });
      var covered = review && review.status === 'covered' && target;
      var evidence = review ? '<p class="helper">上次复核：' + escapeHTML(review.reviewedAt.slice(0, 10)) + ' · ' + escapeHTML(review.questionId.toUpperCase()) + (review.contentVersion !== seed.version ? ' · 课程版本已更新，建议重查' : '') + (!target ? ' · 引用题尚未收录，待复核' : '') + '</p>' : '';
      var row = '<li><p>' + escapeHTML(gap) + '</p>' + evidence + '<div class="link-row">' + (target ? '<button class="knowledge-link" data-question="' + target.id + '">查看支撑题</button>' : '') + '<button class="text-button" data-gapreview="' + index + '">复核覆盖</button>' + (covered ? '<button class="text-button" data-gapreopen="' + index + '">重新打开</button>' : '') + '</div></li>';
      (covered ? closed : open).push(row);
    });
    $('gapCount').textContent = open.length; $('gapClosedCount').textContent = closed.length;
    $('gapList').innerHTML = open.join('') || '<li>暂时没有待扩充问题。</li>';
    $('gapClosedList').innerHTML = closed.join('') || '<li>尚无人工复核记录。</li>';
    updateReviewCount();
  }
  function updateReviewCount() { $('reviewCount').textContent = Object.keys(state.reviewQueue).filter(function (id) { var r = state.reviewQueue[id]; return r && (r.remove || r.change || r.note); }).length; }
  function renderReviewControls() {
    var item = state.reviewQueue[state.question] || { remove: false, change: false, note: '' };
    $('reviewChange').checked = Boolean(item.change); $('reviewDelete').checked = Boolean(item.remove); $('reviewNote').value = item.note || '';
    $('reviewStatus').textContent = item.remove || item.change || item.note ? '已保存本机 · 等待导出' : '未标记';
    updateReviewCount();
  }
  function saveReviewField(field, value) {
    var id = state.question, previous = state.reviewQueue[id] ? Object.assign({}, state.reviewQueue[id]) : undefined;
    var item = Object.assign({ remove: false, change: false, note: '' }, state.reviewQueue[id] || {}); item[field] = value;
    if (!item.remove && !item.change && !item.note.trim()) delete state.reviewQueue[id]; else state.reviewQueue[id] = item;
    if (!persist()) { if (previous) state.reviewQueue[id] = previous; else delete state.reviewQueue[id]; renderReviewControls(); return; }
    $('reviewStatus').textContent = '已保存本机 · 等待导出'; updateReviewCount();
  }
  function beginGapReview(index) {
    if (!/^\d+$/.test(String(index)) || !state.gaps[Number(index)]) return;
    var text = state.gaps[Number(index)];
    var before = gapReviews.find(function (r) { return r.text === text; });
    pendingGapReview = { text: text, before: JSON.stringify(before || null) };
    $('gapReviewQuestion').textContent = text;
    $('gapReviewTarget').innerHTML = '<option value="">请选择</option>' + questions.map(function (q) { return '<option value="' + q.id + '">' + q.id.toUpperCase() + ' · ' + escapeHTML(q.title) + '</option>'; }).join('');
    $('gapReviewTarget').value = before && questions.some(function (q) { return q.id === before.questionId; }) ? before.questionId : '';
    $('gapReviewConfirm').checked = false; $('gapReviewPanel').hidden = false;
    $('gapReviewStatus').textContent = '先查看支撑题并用关联知识完整试答，确认后才归档。';
  }
  function commitGapReview(statusName) {
    if (!pendingGapReview) return;
    if (statusName === 'covered' && (!$('gapReviewConfirm').checked || !questions.some(function (q) { return q.id === $('gapReviewTarget').value; }))) { $('gapReviewStatus').textContent = '请选择支撑题，并确认已经完整试答。'; return; }
    try {
      if (!storageOK) throw new Error('本地记录不可用，请先备份');
      var existing = readRecord();
      var now = backup.reviewList(existing.gapReviews).find(function (r) { return r.text === pendingGapReview.text; });
      if (JSON.stringify(now || null) !== pendingGapReview.before) throw new Error('另一页面已复核此问题，请刷新核对；没有覆盖');
      var review = { text: pendingGapReview.text, status: statusName, questionId: statusName === 'covered' ? $('gapReviewTarget').value : now.questionId, reviewedAt: new Date().toISOString(), contentVersion: seed.version };
      var next = Object.assign({}, existing, { gaps: Array.from(new Set((existing.gaps || []).concat(state.gaps))), gapReviews: backup.reviewList(existing.gapReviews).filter(function (r) { return r.text !== review.text; }).concat([review]) });
      localStorage.setItem(storageKey, JSON.stringify(next)); acceptRecord(next);
      pendingGapReview = null; $('gapReviewPanel').hidden = true; renderStats();
      $('gapReviewStatus').textContent = statusName === 'covered' ? '已人工复核归档；原问题与关联保留。课程更新后仍建议重新检查。' : '已重新打开，原复核关联保留。';
    } catch (error) { $('gapReviewStatus').textContent = '复核未保存：' + error.message; }
  }
  function activateTab(name, focusTab) {
    if (name !== 'questions' && name !== 'knowledge') return;
    state.tab = name;
    closeMobileCatalogs();
    document.querySelectorAll('[data-tab]').forEach(function (el) {
      var on = el.dataset.tab === name;
      el.classList.toggle('active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      el.tabIndex = on ? 0 : -1;
      if (on && focusTab) el.focus();
    });
    $('questionsTab').hidden = name !== 'questions';
    $('knowledgeTab').hidden = name !== 'knowledge';
    $('currentSection').textContent = name === 'questions' ? '题库' : '知识卡';
    $('pageTitle').textContent = name === 'questions' ? '题目训练' : '知识阅读';
    $('pageDescription').textContent = name === 'questions' ? '选一道题，先理清思路，再完善自己的答案。' : '一次读懂一个概念，遇到新题时再把它们组合起来。';
    document.title = (name === 'questions' ? '题目训练' : '知识阅读') + ' · System Lab';
  }
  function setMobileCatalog(name, open) {
    var layout = $(name === 'questions' ? 'questionLayout' : 'knowledgeLayout');
    var toggle = $(name === 'questions' ? 'mobileQuestionToggle' : 'mobileKnowledgeToggle');
    var action = $(name === 'questions' ? 'mobileQuestionAction' : 'mobileKnowledgeAction');
    if (!layout || !toggle || !action) return;
    layout.classList.toggle('catalog-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    action.textContent = open ? '收起目录⌃' : (name === 'questions' ? '切换题目⌄' : '浏览目录⌄');
  }
  function closeMobileCatalogs() {
    setMobileCatalog('questions', false);
    setMobileCatalog('knowledge', false);
  }
  function isMobileViewport() { return typeof window.innerWidth === 'number' && window.innerWidth <= 760; }
  function isContinuousReading() { return state.fullReading || isMobileViewport(); }
  function shortTitle(q) { return q.id === 'q4' ? '四种娃娃，平均多少次能集齐？' : q.title; }
  function rowText(rows) { return (rows || []).map(function (row) { return row.join(' '); }).join(' '); }
  function referenceText(refs) {
    return (refs || []).map(function (r) { var s = seed.sources[r.id]; return [r.takeaway || '', r.boundary || '', s ? s.title + ' ' + s.author + ' ' + s.platform : ''].join(' '); }).join(' ');
  }
  function matchesQuestion(q) {
    var term = state.search.toLocaleLowerCase().trim();
    var text = q.id + ' ' + q.title + ' ' + (q.topic || '') + ' ' + q.knowledge.concat(q.terms).map(function (id) { var k = card(id); return k ? k.title + ' ' + k.tags.join(' ') : ''; }).join(' ') + ' ' + q.sources.map(function (r) { var s = seed.sources[r.id]; return s ? s.title + ' ' + s.author + ' ' + s.platform : ''; }).join(' ');
    if (state.qFullSearch) text += ' ' + [q.analysis, rowText(q.steps), q.answer, originals[q.id], rowText(q.pitfalls), q.coverageNote, q.table ? q.table.headers.join(' ') + ' ' + rowText(q.table.rows) : '', referenceText(q.references)].join(' ');
    return (state.stars === 'all' || String(q.stars) === state.stars) && (state.type === 'all' || q.type.indexOf(state.type) !== -1) && (state.topic === 'all' || q.topic === state.topic) && (state.source === 'all' || q.sources.some(function (r) { return seed.sources[r.id] && seed.sources[r.id].platform === state.source; })) && (!term || text.toLocaleLowerCase().indexOf(term) !== -1);
  }
  function clearQuestionFilters() {
    state.search = ''; state.stars = 'all'; state.type = 'all'; state.topic = 'all'; state.source = 'all';
    $('questionSearch').value = ''; $('importanceFilter').value = 'all'; $('typeFilter').value = 'all'; $('topicFilter').value = 'all'; $('sourceFilter').value = 'all';
  }
  function renderQuestions(notice) {
    var shown = questions.filter(matchesQuestion).sort(function (a, b) {
      var byNumber = Number(a.id.slice(1)) - Number(b.id.slice(1));
      return state.sort === 'priority' ? b.stars - a.stars || byNumber : state.sort === 'newest' ? -byNumber : byNumber;
    });
    var filtered = Boolean(state.search.trim()) || state.stars !== 'all' || state.type !== 'all' || state.topic !== 'all' || state.source !== 'all';
    $('resetQuestionFilters').hidden = !filtered;
    $('catalogHint').textContent = notice || (shown.some(function (q) { return q.id === state.question; }) ? '' : '当前阅读题目不在筛选结果中；清除筛选可找回，不影响草稿。');
    $('catalogHint').hidden = !$('catalogHint').textContent;
    $('questionResultCount').textContent = shown.length + ' 道';
    $('questionList').innerHTML = shown.length ? shown.map(function (q) {
      return '<button class="question-item' + (state.question === q.id ? ' selected' : '') + '" data-question="' + q.id + '" aria-current="' + (state.question === q.id ? 'true' : 'false') + '"><span class="item-meta"><span class="stars" aria-label="重要程度 ' + q.stars + ' 星">' + stars(q.stars) + '</span><span>' + q.id.toUpperCase() + ' · ' + escapeHTML(q.type) + '</span></span><span class="item-title">' + escapeHTML(shortTitle(q)) + '</span></button>';
    }).join('') : '<p class="empty-state">没有匹配的题目，试试其他关键词。</p>';
    renderQuestionPagination(shown);
  }
  function renderQuestionPagination(shown) {
    var list = shown || questions.filter(matchesQuestion).sort(function (a, b) {
      var byNumber = Number(a.id.slice(1)) - Number(b.id.slice(1));
      return state.sort === 'priority' ? b.stars - a.stars || byNumber : state.sort === 'newest' ? -byNumber : byNumber;
    });
    var index = list.findIndex(function (q) { return q.id === state.question; });
    if (index < 0) {
      $('previousQuestion').disabled = true; $('nextQuestion').disabled = true;
      $('questionPaginationStatus').textContent = '当前题目不在筛选结果中';
      return;
    }
    $('previousQuestion').disabled = index === 0;
    $('nextQuestion').disabled = index === list.length - 1;
    $('questionPaginationStatus').textContent = '第 ' + (index + 1) + ' / ' + list.length + ' 题';
  }
  function selectQuestion(id) {
    var target = questions.find(function (q) { return q.id === id; });
    if (!target) return;
    if (state.editing) captureDraft();
    // 跨页链接不能把当前题留在一个看不见它的目录中；普通选题保留筛选。
    var reset = !matchesQuestion(target);
    if (reset) clearQuestionFilters();
    // 同一题的跨页返回保留正在编辑的状态。
    if (state.question !== id) {
      state.editing = Object.prototype.hasOwnProperty.call(state.drafts, id);
      state.readStep = state.editing ? 2 : (state.readSteps[id] || 0);
      state.fullReading = true;
    }
    state.question = id;
    activateTab('questions');
    renderQuestions(reset ? '已清除筛选以定位关联题目；你的答案和草稿未改变。' : '');
    renderAnswer();
    setMobileCatalog('questions', false);
  }
  function paragraphs(text) {
    if (!text.trim()) return '<p class="muted">还没有答案，点击“编辑答案”开始写。</p>';
    var blocks = text.split(/\r?\n/).filter(function (part) { return part.trim(); });
    if (blocks.length === 1) {
      var sentences = text.match(/[^。！？]+[。！？]?/g) || [text];
      blocks = [];
      var buffer = '';
      sentences.forEach(function (sentence) {
        if (buffer && buffer.length + sentence.length > 115) { blocks.push(buffer); buffer = ''; }
        buffer += sentence;
      });
      if (buffer) blocks.push(buffer);
    }
    return blocks.map(function (block) { return '<p>' + escapeHTML(block) + '</p>'; }).join('');
  }
  function sourceLink(id) {
    var s = seed.sources[id];
    if (!s) return '<span>来源待核对</span>';
    return '<a href="' + escapeHTML(s.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(s.title) + ' ↗</a>';
  }
  function referencesHTML(refs) {
    return (refs || []).map(function (r) {
      var s = seed.sources[r.id];
      return '<div class="reference-item"><h4>' + sourceLink(r.id) + '</h4><p class="source-meta">' + escapeHTML(s.author + ' · ' + s.platform + ' · ' + s.date) + '</p><p class="source-meta">' + escapeHTML(s.kind + ' · 核对：' + (s.checkedAt || '待核对')) + '</p><p><strong>读什么：</strong>' + escapeHTML(r.takeaway) + '</p><p class="reference-boundary"><strong>别照搬：</strong>' + escapeHTML(r.boundary) + '</p></div>';
    }).join('');
  }
  function renderAnswer() {
    var q = currentQuestion();
    $('questionMeta').innerHTML = '<span class="stars" aria-label="重要程度 ' + q.stars + ' 星">' + stars(q.stars) + '</span><span>' + escapeHTML(q.type) + '</span><span>' + escapeHTML(q.id.toUpperCase()) + ' · 训练改编</span>';
    $('questionTitle').textContent = q.title;
    $('mobileQuestionLabel').textContent = q.id.toUpperCase() + ' · ' + shortTitle(q);
    $('questionSources').innerHTML = q.sources.map(function (r) { var s = seed.sources[r.id]; return '<div><span class="source-tag">' + escapeHTML(s.platform) + '</span>' + sourceLink(r.id) + '<p class="source-meta">' + escapeHTML(s.author + ' · ' + s.date + ' · ' + s.kind + ' · 核对：' + (s.checkedAt || '待核对')) + '</p><p class="source-explanation">' + escapeHTML(r.note) + '</p></div>'; }).join('') + '<p class="source-meta">个人回忆和学习清单不等于官方试卷。链接失效时按标题与作者站内检索；核对日期不代表保证永久可访问。</p>';
    $('priorityReason').textContent = '为什么 ' + q.stars + ' 星：' + q.priority;
    $('questionAnalysis').innerHTML = paragraphs(q.analysis);
    $('solutionSteps').innerHTML = '<ol class="reasoning-steps">' + q.steps.map(function (step) { return '<li><h4>' + escapeHTML(step[0]) + '</h4><p>' + escapeHTML(step[1]) + '</p></li>'; }).join('') + '</ol>';
    $('questionDiagram').innerHTML = q.table ? '<div class="table-scroll"><table><thead><tr>' + q.table.headers.map(function (h) { return '<th scope="col">' + escapeHTML(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + q.table.rows.map(function (row) { return '<tr>' + row.map(function (c) { return '<td>' + escapeHTML(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '';
    $('answerOutline').innerHTML = (seed.outlines[q.id] || []).map(function (item) { return '<li>' + escapeHTML(item) + '</li>'; }).join('');
    $('answerPreview').innerHTML = paragraphs(q.answer);
    var customized = q.answer !== originals[q.id];
    $('answerNote').textContent = customized ? '正在显示你保存的版本。新版参考答案在下方，可展开对照；不会覆盖你的编辑。' : '供组织表达的参考稿，不是招聘方标准答案。示例参数、假设方案与后续计划不等于你的真实成果。';
    $('latestAnswerBox').hidden = !customized;
    $('latestAnswer').innerHTML = paragraphs(originals[q.id]);
    $('answerPitfalls').innerHTML = q.pitfalls.map(function (p) { return '<div class="pitfall"><h4>不建议这样答</h4><p class="bad-answer">' + escapeHTML(p[0]) + '</p><p><strong>为什么：</strong>' + escapeHTML(p[1]) + '</p></div>'; }).join('');
    $('answerReferences').innerHTML = referencesHTML(q.references);
    $('answerKnowledge').innerHTML = q.knowledge.filter(card).map(function (id) { return '<button class="knowledge-link" data-knowledge="' + id + '">' + escapeHTML(card(id).title) + ' ↗</button>'; }).join('');
    $('answerTerms').innerHTML = q.terms.filter(card).map(function (id) { return '<button class="knowledge-link term-link" data-knowledge="' + id + '">' + escapeHTML(card(id).title) + ' ↗</button>'; }).join('');
    $('coverageNote').textContent = '覆盖检查：' + q.coverageNote;
    $('answerPreview').hidden = state.editing;
    $('answerEdit').hidden = !state.editing;
    $('editAnswer').hidden = state.editing;
    $('answerEditor').value = Object.prototype.hasOwnProperty.call(state.drafts, q.id) ? state.drafts[q.id] : q.answer;
    $('draftStatus').textContent = Object.prototype.hasOwnProperty.call(state.drafts, q.id) ? '有未保存修改；切换页签或题目会保留草稿。' : '切换页签不会丢失草稿；关闭前请保存。';
    renderReviewControls();
    renderReading();
  }
  function renderReading() {
    var sections = ['analysisSection', 'reasoningSection', 'answerSection', 'pitfallsSection', 'referencesSection'];
    var labels = ['审题', '思路', '答案', '避坑', '参考'];
    var continuous = isContinuousReading();
    sections.forEach(function (id, index) { $(id).hidden = !continuous && state.readStep !== index; });
    if (continuous || state.readStep === 1) $('reasoningDetails').open = true;
    if (continuous || state.readStep === 3) $('pitfallsSection').open = true;
    if (continuous || state.readStep === 4) $('referencesSection').open = true;
    $('latestAnswerBox').hidden = currentQuestion().answer === originals[state.question] || (!continuous && state.readStep !== 2);
    $('readingSteps').innerHTML = labels.map(function (label, i) { return '<button class="reading-step" data-step="' + i + '" aria-current="' + (!continuous && i === state.readStep ? 'step' : 'false') + '">' + label + '</button>'; }).join('');
    $('readingSteps').hidden = continuous;
    $('readingStatus').textContent = continuous ? '连续阅读 · 从上往下看完本题' : '第 ' + (state.readStep + 1) + ' / 5 步 · ' + labels[state.readStep];
    $('fullReading').textContent = continuous ? '分步阅读' : '连续阅读';
    $('fullReading').setAttribute('aria-pressed', String(continuous));
    $('readingPagination').hidden = continuous;
    $('previousStep').disabled = state.readStep === 0;
    $('nextStep').disabled = state.readStep === 4;
    $('questionPagination').hidden = false;
    renderQuestionPagination();
  }
  function selectReadingStep(step) {
    if (!Number.isInteger(step) || step < 0 || step > 4) return;
    if (state.editing) captureDraft();
    state.readStep = step; state.readSteps[state.question] = step; state.fullReading = false;
    renderReading();
  }
  function selectAdjacentQuestion(direction) {
    var list = questions.filter(matchesQuestion).sort(function (a, b) {
      var byNumber = Number(a.id.slice(1)) - Number(b.id.slice(1));
      return state.sort === 'priority' ? b.stars - a.stars || byNumber : state.sort === 'newest' ? -byNumber : byNumber;
    });
    var index = list.findIndex(function (q) { return q.id === state.question; });
    var target = index < 0 ? null : list[index + direction];
    if (target) {
      selectQuestion(target.id);
      if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
    }
  }
  function startEditing() { state.editing = true; state.fullReading = false; state.readStep = 2; state.readSteps[state.question] = 2; renderAnswer(); $('answerEditor').focus(); }
  function captureDraft() {
    var q = currentQuestion();
    var text = $('answerEditor').value;
    if (text === q.answer) delete state.drafts[q.id]; else state.drafts[q.id] = text;
    $('draftStatus').textContent = text === q.answer ? '尚未修改答案。' : '有未保存修改；切换页签或题目会保留草稿。';
  }
  function saveAnswer() {
    var q = currentQuestion();
    var previous = q.answer;
    var draft = $('answerEditor').value;
    q.answer = draft;
    if (!persist(q.id)) { q.answer = previous; state.drafts[q.id] = draft; return; }
    delete state.drafts[q.id];
    state.editing = false;
    renderAnswer();
    renderQuestions();
  }
  function matchesKnowledge(k) {
    var term = state.kSearch.toLocaleLowerCase().trim();
    var parent = k.kind === 'term' ? card(k.parent) : null;
    var text = [k.id, k.title, k.summary, k.tags.join(' '), parent ? parent.title + ' ' + parent.tags.join(' ') : ''].join(' ');
    var reading = seed.reading[k.id];
    if (state.kFullSearch && reading) text += ' ' + [k.detail, reading.gist, k.kind === 'method' ? reading.flowTitle + ' ' + rowText(reading.flow) : '', rowText(reading.checkpoints), reading.boundary, referenceText(reading.references)].join(' ');
    return (state.kKind === 'all' || state.kKind === k.kind) && (state.kFamily === 'all' || k.id === state.kFamily || k.parent === state.kFamily) && (!term || text.toLocaleLowerCase().indexOf(term) !== -1);
  }
  function clearKnowledgeFilters() {
    state.kKind = 'all'; state.kSearch = ''; state.kFamily = 'all';
    $('knowledgeKind').value = 'all'; $('knowledgeSearch').value = ''; $('knowledgeFamily').value = 'all';
  }
  function renderKnowledgeList(notice) {
    var shown = knowledge.filter(matchesKnowledge);
    $('resetKnowledgeFilters').hidden = !state.kSearch.trim() && state.kKind === 'all' && state.kFamily === 'all';
    $('knowledgeCatalogHint').textContent = notice || (shown.some(function (k) { return k.id === state.knowledge; }) ? '' : '当前阅读卡不在筛选结果中；清除筛选可找回，阅读内容保持不变。');
    $('knowledgeCatalogHint').hidden = !$('knowledgeCatalogHint').textContent;
    $('knowledgeResultCount').textContent = shown.length + ' 张';
    $('knowledgeList').innerHTML = shown.length ? shown.map(function (k) {
      var index = knowledge.indexOf(k) + 1;
      var use = questions.filter(function (q) { return q.knowledge.concat(q.terms).indexOf(k.id) !== -1; }).length;
      return '<button class="knowledge-item' + (state.knowledge === k.id ? ' selected' : '') + '" data-knowledge="' + k.id + '" aria-current="' + (state.knowledge === k.id ? 'true' : 'false') + '"><span class="knowledge-number">' + String(index).padStart(2, '0') + '</span><span><strong>' + escapeHTML(k.title) + '</strong><small>' + (k.kind === 'term' ? '名词卡' : '方法卡') + ' · 关联 ' + use + ' 道题</small></span></button>';
    }).join('') : '<p class="empty-state">暂时没有这类知识卡。</p>';
  }
  function renderKnowledgeReader() {
    var k = card(state.knowledge);
    var content = seed.reading[k.id];
    var related = questions.filter(function (q) { return q.knowledge.concat(q.terms).indexOf(k.id) !== -1; });
    var terms = knowledge.filter(function (other) { return other.kind === 'term' && other.parent === k.id; });
    var detail = k.detail && k.detail !== content.gist ? '<section class="knowledge-detail"><h3>具体含义</h3><p>' + escapeHTML(k.detail) + '</p></section>' : '';
    var examples = content.examples && content.examples.length ? '<section class="knowledge-examples"><h3>游戏里的实际例子</h3>' + content.examples.map(function (example) { return '<article><h4>' + escapeHTML(example[0]) + '</h4><p>' + escapeHTML(example[1]) + '</p></article>'; }).join('') + '</section>' : '';
    $('knowledgeReader').innerHTML = '<header><div class="article-meta"><span>' + (k.kind === 'term' ? '名词卡' : '方法卡') + ' ' + String(knowledge.indexOf(k) + 1).padStart(2, '0') + '</span><span>' + escapeHTML(k.tags.join(' · ')) + '</span></div><h2>' + escapeHTML(k.title) + '</h2><p class="knowledge-gist">' + escapeHTML(content.gist) + '</p></header>' +
      detail +
      (k.kind === 'method' ? '<section><h3>' + escapeHTML(content.flowTitle || '概念由哪些部分组成') + '</h3><dl class="concept-list flow-steps">' + content.flow.map(function (step) { return '<div><dt>' + escapeHTML(step[0]) + '</dt><dd>' + escapeHTML(step[1]) + '</dd></div>'; }).join('') + '</dl></section>' : '') +
      '<section><h3>' + (k.kind === 'term' ? '怎么理解' : '关键解释') + '</h3><ol class="checkpoints">' + content.checkpoints.map(function (point, index) { return '<li><span class="checkpoint-number">0' + (index + 1) + '</span><div><h4>' + escapeHTML(point[0]) + '</h4><p>' + escapeHTML(point[1]) + '</p></div></li>'; }).join('') + '</ol></section>' +
      examples +
      '<section class="boundary"><strong>常见误解与边界</strong><p>' + escapeHTML(content.boundary) + '</p></section>' +
      (content.parent ? '<div class="answer-links"><button class="knowledge-link" data-knowledge="' + content.parent + '">回到方法 · ' + escapeHTML(card(content.parent).title) + ' ↗</button></div>' : '') +
      (terms.length ? '<details class="quiet-details"><summary>这套方法里的名词 · ' + terms.length + '</summary><div class="link-row knowledge-family-links">' + terms.map(function (term) { return '<button class="knowledge-link term-link" data-knowledge="' + term.id + '">' + escapeHTML(term.title) + '</button>'; }).join('') + '</div></details>' : '') +
      '<details class="study-details"><summary>来源与延伸阅读 · ' + (content.references || []).length + '</summary>' + referencesHTML(content.references) + '</details>' +
      '<details class="quiet-details"><summary>用这张卡练习 · ' + related.length + ' 道题</summary>' + related.map(function (q) { return '<button class="related-question" data-question="' + q.id + '"><span>' + escapeHTML(shortTitle(q)) + '</span><span aria-hidden="true">↗</span></button>'; }).join('') + '</details>';
    $('mobileKnowledgeLabel').textContent = (k.kind === 'term' ? '名词卡' : '方法卡') + ' · ' + k.title;
  }
  function selectKnowledge(id) {
    var target = card(id);
    if (!target) return;
    var reset = !matchesKnowledge(target);
    if (reset) clearKnowledgeFilters();
    state.knowledge = id;
    activateTab('knowledge');
    renderKnowledgeList(reset ? '已清除筛选以定位关联知识卡；答案和草稿未改变。' : '');
    renderKnowledgeReader();
    setMobileCatalog('knowledge', false);
  }
  function analyzeNewQuestion() {
    var text = $('newQuestionInput').value.trim();
    if (!text) { $('analysisResult').innerHTML = '<p class="helper">请先输入题目。</p>'; return; }
    var legacyRules = [
      { id: 'number', words: ['概率', '抽卡', '掉落', '期望', '保底', '数值', '平衡'] },
      { id: 'growth', words: ['养成', '成长', '赛季', '经济', '资源', '商业化'] },
      { id: 'loop', words: ['核心', '好玩', '循环', '体验', '玩法'] },
      { id: 'decision', words: ['优缺点', '优化', '改进', '代价', '玩家'] },
      { id: 'delivery', words: ['协作', '落地', '文档', '原型', '测试', '程序'] },
      { id: 'social', words: ['社交', '公会', '匹配', '多人', 'mmo'] },
      { id: 'evaluation', words: ['验证', '有效', '指标', '留存', '反馈', '评估'] },
      { id: 'cadence', words: ['赛季', '活动', '春节', '战令', '追赶', '缺席'] },
      { id: 'onboarding', words: ['新手', '引导', '教学', '学习', '提示'] },
      { id: 'transactions', words: ['任务', '背包', '合成', '领取', '事务', '奖励'] },
      { id: 'combat', words: ['技能', '实时', '回合', '反制', '冷却', 'ttk', 'dps'] },
      { id: 'collaboration', words: ['复用', '沟通', '工期', '变更', '上级'] },
      { id: 'matchmaking', words: ['匹配', '排队', '组排', 'mmr'] },
      { id: 'diagnosis', words: ['诊断', '胜率', '分层', '样本', '因果'] },
      { id: 'attributes', words: ['护甲', '暴击', '属性', '攻击力', '预算'] },
      { id: 'randomness', words: ['随机', '抽牌', '波动'] },
      { id: 'adaptation', words: ['手游化', '跨端', '触屏', '界面', '交互'] }
    ];
    // 新方法自动从标签进入初筛；旧同义词保留，不再要求每批扩题手动改界面代码。
    var rules = knowledge.filter(function (k) { return k.kind === 'method'; }).map(function (k) {
      var legacy = legacyRules.find(function (r) { return r.id === k.id; });
      return { id: k.id, words: Array.from(new Set((legacy ? legacy.words : []).concat(k.tags || []))).filter(function (word) { return word.length >= 2; }) };
    });
    var matches = rules.filter(function (rule) { return rule.words.some(function (word) { return text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase()) !== -1; }); });
    $('analysisResult').innerHTML = '<div class="analysis"><strong>' + (matches.length ? '找到相关知识，覆盖情况待核对' : '暂未匹配，需要人工判断') + '</strong><p>' + (matches.length ? '先尝试用这些概念回答。缺少规则、方法或证据时，仍应记录缺口。' : '没有匹配不代表完全无关。检查现有知识后，再决定是否扩充。') + '</p><div class="link-row">' + matches.map(function (match) { return '<button class="knowledge-link" data-knowledge="' + match.id + '">' + escapeHTML(card(match.id).title) + '</button>'; }).join('') + '</div><button class="secondary" id="addGap">记录为待扩充</button></div>';
    $('addGap').addEventListener('click', function () {
      if (state.gaps.indexOf(text) === -1) state.gaps.push(text);
      var savedOK = persist();
      renderStats();
      $('addGap').textContent = savedOK ? '已记录' : '本次已记录，尚未保存';
      $('addGap').disabled = true;
    });
  }
  function invalidateImport() { pendingImport = null; $('confirmImport').hidden = true; }
  function cancelImportRead() {
    importReadVersion++;
    importFileReading = false;
    $('previewImport').disabled = false;
  }
  function downloadText(text, name) {
    var url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    var link = document.createElement('a'); link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function exportBackup() {
    cancelImportRead(); invalidateImport();
    try {
      if (state.editing) captureDraft();
      var record = readRecord();
      // 使用最新持久记录，避免另一个页面的更新被当前旧副本混入导出。
      record = Object.assign({}, record, { answers: effectiveAnswers(record), defaults: Object.assign({}, record.defaults || {}, originals), gaps: Array.from(new Set((record.gaps || []).concat(state.gaps))) });
      var text = backup.encode(record, state.drafts, seed.version);
      $('backupText').value = text; invalidateImport();
      downloadText(text, 'system-lab-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
      $('importPreview').textContent = '已发起下载；请确认文件已保存。若下载受阻，可复制上方全部文本。备份包含未保存草稿。';
    } catch (error) { $('importPreview').textContent = '无法生成完整备份：' + error.message + '。请先复制正在编辑的答案，不要清理浏览器。'; }
  }
  function exportReviewQueue() {
    try {
      var items = Object.keys(state.reviewQueue).map(function (id) {
        var q = questions.find(function (item) { return item.id === id; }), r = state.reviewQueue[id];
        return q && r && (r.remove || r.change || r.note.trim()) ? { questionId: id, title: q.title, stars: q.stars, delete: Boolean(r.remove), changeAnswer: Boolean(r.change), note: r.note || '' } : null;
      }).filter(Boolean);
      if (!items.length) { status('还没有待处理标记'); return; }
      var text = JSON.stringify({ format: 'system-lab-review-queue', schemaVersion: 1, exportedAt: new Date().toISOString(), contentVersion: seed.version, items: items }, null, 2);
      downloadText(text, 'system-lab-review-queue-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
      status('已导出 ' + items.length + ' 项待处理清单');
    } catch (error) { status('清单导出失败，请先复制题目标记', true); }
  }
  function previewImport() {
    invalidateImport();
    if (importFileReading) { $('importPreview').textContent = '文件仍在读取；也可以直接粘贴文本取消本次读取。尚未修改答案。'; return; }
    try {
      if (!storageOK) throw new Error('本机记录异常，先处理原记录；不会覆盖');
      if (state.editing) captureDraft();
      var incoming = backup.parse($('backupText').value);
      var raw = localStorage.getItem(storageKey);
      var plan = backup.plan(incoming, effectiveAnswers(readRecord()), state.drafts, originals, seed.legacyAnswers || {}, $('importPolicy').value === 'replace');
      pendingImport = { raw: raw, draftState: JSON.stringify(state.drafts), text: $('backupText').value, policy: $('importPolicy').value, incoming: incoming, plan: plan };
      $('importPreview').textContent = '将合并 ' + Object.keys(plan.updates).length + ' 份答案、恢复 ' + Object.keys(plan.drafts).length + ' 份未保存草稿；答案冲突 ' + plan.conflicts + ' 份（' + ($('importPolicy').value === 'replace' ? '采用备份' : '保留本机') + '）；保护当前草稿 ' + plan.protectedDrafts + ' 项。未收录题号 ' + plan.unknown + ' 份也会保留。知识缺口合并去重；备份含 ' + incoming.gapReviews.length + ' 份复核，复核冲突始终保留本机。确认前会保存一份导入前快照。';
      $('confirmImport').hidden = false;
    } catch (error) { $('importPreview').textContent = '不能导入：' + error.message; }
  }
  function confirmImport() {
    var pending = pendingImport;
    if (!pending) return;
    try {
      if (state.editing) captureDraft();
      if (localStorage.getItem(storageKey) !== pending.raw || JSON.stringify(state.drafts) !== pending.draftState || $('backupText').value !== pending.text || $('importPolicy').value !== pending.policy) throw new Error('记录或草稿已变化，请重新预览');
      var existing = readRecord();
      var next = Object.assign({}, existing, { answers: Object.assign({}, existing.answers || {}, pending.plan.updates), defaults: Object.assign({}, existing.defaults || {}), gaps: Array.from(new Set((existing.gaps || []).concat(state.gaps, pending.incoming.gaps))), reviewQueue: Object.assign({}, existing.reviewQueue || {}, pending.incoming.reviewQueue || {}), contentVersion: seed.version });
      next.gapReviews = backup.mergeReviews(existing.gapReviews, pending.incoming.gapReviews);
      Object.keys(pending.plan.updates).forEach(function (id) {
        if (Object.prototype.hasOwnProperty.call(originals, id)) next.defaults[id] = originals[id];
        // 尚未收录的题也保留它随备份携带的默认稿，未来扩题时才能辨别默认内容与自改稿。
        else if (Object.prototype.hasOwnProperty.call(pending.incoming.defaults, id)) next.defaults[id] = pending.incoming.defaults[id];
        else delete next.defaults[id];
      });
      localStorage.setItem(recoveryKey, backup.encode(Object.assign({}, existing, { answers: effectiveAnswers(existing), defaults: Object.assign({}, existing.defaults || {}, originals), gaps: state.gaps }), state.drafts, seed.version));
      localStorage.setItem(storageKey, JSON.stringify(next));
      acceptRecord(next);
      Object.assign(state.drafts, pending.plan.drafts);
      state.editing = Object.prototype.hasOwnProperty.call(state.drafts, state.question);
      if (state.editing) state.readStep = 2;
      renderStats(); renderAnswer();
      $('importPreview').textContent = '已合并。恢复的草稿仍需逐题保存；复核冲突保留本机，可在待扩充区重新复核。上次导入前快照可下载。网页课程内容没有被替换。';
      status('备份合并完成');
    } catch (error) { $('importPreview').textContent = '未完成导入：' + error.message + '。当前草稿保留，请重新检查。'; }
    invalidateImport();
  }
  document.querySelectorAll('[data-tab]').forEach(function (el) {
    el.addEventListener('click', function () { activateTab(el.dataset.tab); });
    el.addEventListener('keydown', function (event) {
      var target;
      if (event.key === 'Home') target = 'questions';
      else if (event.key === 'End') target = 'knowledge';
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') target = state.tab === 'questions' ? 'knowledge' : 'questions';
      if (target) { event.preventDefault(); activateTab(target, true); }
    });
  });
  $('mobileQuestionToggle').addEventListener('click', function () {
    setMobileCatalog('questions', !$('questionLayout').classList.contains('catalog-open'));
  });
  $('mobileKnowledgeToggle').addEventListener('click', function () {
    setMobileCatalog('knowledge', !$('knowledgeLayout').classList.contains('catalog-open'));
  });
  document.addEventListener('click', function (event) {
    var review = event.target.closest('[data-gapreview]');
    if (review) { beginGapReview(review.dataset.gapreview); return; }
    var reopen = event.target.closest('[data-gapreopen]');
    if (reopen) {
      var index = reopen.dataset.gapreopen;
      if (/^\d+$/.test(String(index)) && gapReviews.some(function (r) { return r.text === state.gaps[Number(index)] && r.status === 'covered'; })) { beginGapReview(index); commitGapReview('open'); }
      return;
    }
    var step = event.target.closest('[data-step]');
    if (step) { selectReadingStep(Number(step.dataset.step)); return; }
    var q = event.target.closest('[data-question]');
    if (q) { selectQuestion(q.dataset.question); return; }
    var k = event.target.closest('[data-knowledge]');
    if (k) selectKnowledge(k.dataset.knowledge);
  });
  $('questionSearch').addEventListener('input', function (event) { state.search = event.target.value; renderQuestions(); });
  $('questionFullSearch').addEventListener('change', function (event) { state.qFullSearch = Boolean(event.target.checked); $('questionSearchHelp').hidden = !state.qFullSearch; renderQuestions(); });
  $('resetQuestionFilters').addEventListener('click', function () { clearQuestionFilters(); renderQuestions(); });
  $('importanceFilter').addEventListener('change', function (event) { state.stars = event.target.value; renderQuestions(); });
  $('typeFilter').addEventListener('change', function (event) { state.type = event.target.value; renderQuestions(); });
  $('topicFilter').innerHTML = '<option value="all">全部主题</option>' + Array.from(new Set(questions.map(function (q) { return q.topic; }).filter(Boolean))).map(function (topic) { return '<option value="' + escapeHTML(topic) + '">' + escapeHTML(topic) + '</option>'; }).join('');
  $('topicFilter').addEventListener('change', function (event) { state.topic = event.target.value; renderQuestions(); });
  var sourcePlatforms = Array.from(new Set(questions.flatMap(function (q) { return q.sources.map(function (r) { return seed.sources[r.id].platform; }); })));
  $('sourceFilter').innerHTML = '<option value="all">全部题源</option>' + sourcePlatforms.map(function (platform) {
    var count = questions.filter(function (q) { return q.sources.some(function (r) { return seed.sources[r.id].platform === platform; }); }).length;
    return '<option value="' + escapeHTML(platform) + '">' + escapeHTML(platform) + ' · ' + count + '题</option>';
  }).join('');
  $('sourceFilter').addEventListener('change', function (event) { state.source = event.target.value; renderQuestions(); });
  $('questionSort').addEventListener('change', function (event) { state.sort = ['number', 'priority', 'newest'].includes(event.target.value) ? event.target.value : 'number'; renderQuestions(); });
  $('knowledgeSearch').addEventListener('input', function (event) { state.kSearch = event.target.value; renderKnowledgeList(); });
  $('knowledgeFullSearch').addEventListener('change', function (event) { state.kFullSearch = Boolean(event.target.checked); $('knowledgeSearchHelp').hidden = !state.kFullSearch; renderKnowledgeList(); });
  $('knowledgeKind').addEventListener('change', function (event) { state.kKind = event.target.value; renderKnowledgeList(); });
  $('knowledgeFamily').innerHTML = '<option value="all">全部方法主题</option>' + knowledge.filter(function (k) { return k.kind === 'method'; }).map(function (k) { return '<option value="' + escapeHTML(k.id) + '">' + escapeHTML(k.title) + '</option>'; }).join('');
  $('knowledgeFamily').addEventListener('change', function (event) { state.kFamily = event.target.value; renderKnowledgeList(); });
  $('resetKnowledgeFilters').addEventListener('click', function () { clearKnowledgeFilters(); renderKnowledgeList(); });
  $('editAnswer').addEventListener('click', startEditing);
  $('answerEditor').addEventListener('input', captureDraft);
  $('saveAnswer').addEventListener('click', saveAnswer);
  $('cancelAnswer').addEventListener('click', function () { delete state.drafts[state.question]; state.editing = false; renderAnswer(); });
  $('resetAnswer').addEventListener('click', function () { $('answerEditor').value = originals[state.question]; captureDraft(); });
  $('reviewChange').addEventListener('change', function (event) { saveReviewField('change', Boolean(event.target.checked)); });
  $('reviewDelete').addEventListener('change', function (event) { saveReviewField('remove', Boolean(event.target.checked)); });
  $('reviewNote').addEventListener('input', function (event) { saveReviewField('note', event.target.value); });
  $('analyzeBtn').addEventListener('click', analyzeNewQuestion);
  $('gapReviewSave').addEventListener('click', function () { commitGapReview('covered'); });
  $('gapReviewCancel').addEventListener('click', function () { pendingGapReview = null; $('gapReviewPanel').hidden = true; $('gapReviewStatus').textContent = '已取消，原记录未改变。'; });
  $('gapReviewRead').addEventListener('click', function () {
    if (questions.some(function (q) { return q.id === $('gapReviewTarget').value; })) selectQuestion($('gapReviewTarget').value);
    else $('gapReviewStatus').textContent = '请先选择支撑题。';
  });
  $('gapReviewTarget').addEventListener('change', function () { $('gapReviewConfirm').checked = false; });
  $('previousStep').addEventListener('click', function () { selectReadingStep(state.readStep - 1); });
  $('nextStep').addEventListener('click', function () { selectReadingStep(state.readStep + 1); });
  $('previousQuestion').addEventListener('click', function () { selectAdjacentQuestion(-1); });
  $('nextQuestion').addEventListener('click', function () { selectAdjacentQuestion(1); });
  $('fullReading').addEventListener('click', function () { if (state.editing) captureDraft(); state.fullReading = !state.fullReading; renderReading(); });
  $('exportBackup').addEventListener('click', exportBackup);
  $('exportReview').addEventListener('click', exportReviewQueue);
  $('previewImport').addEventListener('click', previewImport);
  $('confirmImport').addEventListener('click', confirmImport);
  $('backupText').addEventListener('input', function () {
    cancelImportRead(); invalidateImport();
    $('importPreview').textContent = '以当前文本为准，请检查并预览；尚未修改答案。';
  });
  $('importPolicy').addEventListener('change', invalidateImport);
  $('importFile').addEventListener('change', async function (event) {
    cancelImportRead(); invalidateImport();
    var readVersion = importReadVersion;
    $('backupText').value = '';
    var file = event.target.files && event.target.files[0];
    if (!file) { $('importPreview').textContent = '未选择文件，可选择文件或粘贴文本；尚未修改答案。'; return; }
    if (file.size > backup.maxBytes) { $('importPreview').textContent = '文件超过 2 MB，未读取。'; return; }
    importFileReading = true; $('previewImport').disabled = true;
    $('importPreview').textContent = '正在读取文件；切换文件或粘贴文本会取消旧读取。尚未修改答案。';
    try {
      var text = await file.text();
      if (readVersion !== importReadVersion) return;
      if (typeof text !== 'string' || new Blob([text]).size > backup.maxBytes) throw new Error('文件内容超过 2 MB 或不是文本');
      cancelImportRead(); invalidateImport(); $('backupText').value = text;
      $('importPreview').textContent = '文件已读取，请检查并预览；尚未修改答案。';
    } catch (error) {
      if (readVersion !== importReadVersion) return;
      cancelImportRead(); $('importPreview').textContent = '文件未能读取，可改为粘贴文本；尚未修改答案。';
    }
  });
  $('exportRecovery').addEventListener('click', function () {
    cancelImportRead(); invalidateImport();
    try {
      var text = localStorage.getItem(recoveryKey);
      if (!text) { $('importPreview').textContent = '尚无导入前快照。'; return; }
      $('backupText').value = text; invalidateImport(); downloadText(text, 'system-lab-before-import.json');
      $('importPreview').textContent = '已发起快照下载；恢复答案可预览后选择采用备份版本。复核冲突仍保留本机，请在待扩充区重新核对。';
    } catch (error) { $('importPreview').textContent = '快照读取或下载失败；不会修改当前答案。'; }
  });
  $('textSizeBtn').addEventListener('click', function () {
    state.largeText = !state.largeText;
    document.documentElement.style.setProperty('--read-size', state.largeText ? '19px' : '17px');
    $('textSizeBtn').setAttribute('aria-pressed', String(state.largeText));
  });
  window.addEventListener('beforeunload', function (event) {
    if (Object.keys(state.drafts).length) { event.preventDefault(); event.returnValue = ''; }
  });
  renderStats();
  renderQuestions();
  renderAnswer();
  renderKnowledgeList();
  renderKnowledgeReader();
  activateTab('questions');
})();
