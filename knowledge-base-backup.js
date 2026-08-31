/* 只处理可迁移的个人记录，不导入可执行代码或课程内容。 */
(function () {
  'use strict';
  var format = 'system-lab-personal-backup';
  var maxBytes = 2 * 1024 * 1024;
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function map(value, label) {
    if (!object(value)) throw new Error(label + '必须是对象');
    Object.keys(value).forEach(function (id) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || ['__proto__', 'constructor', 'prototype'].indexOf(id) !== -1 || typeof value[id] !== 'string') throw new Error(label + '包含无效 ID 或非文本内容');
    });
    return value;
  }
  function parse(text) {
    if (typeof text !== 'string' || new Blob([text]).size > maxBytes) throw new Error('文件超过 2 MB 或不是文本');
    var data;
    try { data = JSON.parse(text); } catch (e) { throw new Error('不是有效的 JSON 备份'); }
    if (!object(data) || data.format !== format || data.schemaVersion !== 1 || !object(data.record)) throw new Error('备份格式或版本不受支持');
    var record = data.record;
    map(record.answers, '答案'); map(record.defaults || {}, '参考稿'); map(data.drafts || {}, '草稿');
    reviewQueue(record.reviewQueue);
    if (!Array.isArray(record.gaps) || record.gaps.some(function (v) { return typeof v !== 'string'; })) throw new Error('知识缺口格式无效');
    var reviews = reviewList(record.gapReviews);
    if (reviews.some(function (r) { return record.gaps.indexOf(r.text) === -1; })) throw new Error('复核记录缺少对应原问题');
    // 只返回可恢复字段；其他元数据保存在下载文件中，不用来覆盖本机设置。
    return { answers: record.answers, defaults: record.defaults || {}, gaps: record.gaps, gapReviews: reviews, reviewQueue: reviewQueue(record.reviewQueue), drafts: data.drafts || {}, exportedAt: data.exportedAt || '' };
  }
  function reviewQueue(value) {
    if (value === undefined) return {};
    if (!object(value)) throw new Error('待处理清单格式无效');
    Object.keys(value).forEach(function (id) { var r = value[id]; if (!/^q\d+$/.test(id) || !object(r) || typeof r.remove !== 'boolean' || typeof r.change !== 'boolean' || typeof r.note !== 'string') throw new Error('待处理项无效'); });
    return value;
  }
  function reviewList(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error('缺口复核格式无效');
    var seen = new Set();
    value.forEach(function (r) {
      if (!object(r) || typeof r.text !== 'string' || !r.text.trim() || seen.has(r.text) || ['open', 'covered'].indexOf(r.status) === -1 || typeof r.questionId !== 'string' || !/^q\d+$/.test(r.questionId) || typeof r.reviewedAt !== 'string' || !Number.isFinite(Date.parse(r.reviewedAt)) || typeof r.contentVersion !== 'string') throw new Error('缺口复核内容无效');
      seen.add(r.text);
    });
    return value;
  }
  function mergeReviews(current, incoming) {
    // 无论答案采用哪种冲突策略，复核冲突都保留本机；不会用旧备份重新关闭已打开的缺口。
    var merged = reviewList(current).slice();
    reviewList(incoming).forEach(function (r) { if (!merged.some(function (now) { return now.text === r.text; })) merged.push(r); });
    return merged;
  }
  function encode(record, drafts, version) {
    return JSON.stringify({ format: format, schemaVersion: 1, exportedAt: new Date().toISOString(), contentVersion: version, record: record, drafts: drafts }, null, 2);
  }
  function effective(id, answer, defaults, originals, legacy) {
    if (Object.prototype.hasOwnProperty.call(originals, id) && (answer === defaults[id] || answer === legacy[id])) return originals[id];
    return answer;
  }
  function plan(incoming, current, drafts, originals, legacy, replace) {
    var updates = {}, restoreDrafts = {}, conflicts = 0, protectedDrafts = 0, unchanged = 0, unknown = 0;
    Object.keys(incoming.answers).forEach(function (id) {
      var known = Object.prototype.hasOwnProperty.call(originals, id);
      var next = effective(id, incoming.answers[id], incoming.defaults, originals, legacy);
      var now = Object.prototype.hasOwnProperty.call(current, id) ? current[id] : originals[id];
      if (known && next === originals[id] || next === now) { unchanged++; return; }
      if (Object.prototype.hasOwnProperty.call(drafts, id)) { protectedDrafts++; return; }
      var conflict = typeof now === 'string' && (!known || now !== originals[id]);
      if (conflict) { conflicts++; if (!replace) return; }
      updates[id] = next;
      if (!known) unknown++;
    });
    Object.keys(incoming.drafts).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(drafts, id)) { protectedDrafts++; return; }
      restoreDrafts[id] = incoming.drafts[id];
    });
    return { updates: updates, drafts: restoreDrafts, conflicts: conflicts, protectedDrafts: protectedDrafts, unchanged: unchanged, unknown: unknown };
  }
  window.SystemLabBackup = { parse: parse, encode: encode, plan: plan, effective: effective, maxBytes: maxBytes, reviewList: reviewList, reviewQueue: reviewQueue, mergeReviews: mergeReviews };
})();
