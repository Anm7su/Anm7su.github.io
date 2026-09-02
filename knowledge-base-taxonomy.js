/* 题目分类：第一层区分通用能力与目标品类；第二层允许一题对应多个相邻品类。 */
(function () {
  'use strict';
  var d = window.SystemLabData;
  var genresByQuestion = {
    q6: ['MMO', 'RPG'], q7: ['MMO'], q8: ['卡牌'], q13: ['MMO', 'RPG'],
    q17: ['动作', 'RPG'], q24: ['MMO'], q27: ['卡牌'], q29: ['射击', '动作'],
    q33: ['MMO', 'RPG'], q34: ['射击'], q36: ['卡牌', '策略'], q38: ['动作', 'RPG'],
    q39: ['动作', 'RPG'], q40: ['MMO', 'RPG', '动作'], q44: ['MMO'], q46: ['MMO'],
    q49: ['动作', 'RPG'], q50: ['卡牌', 'RPG'], q51: ['策略'], q52: ['卡牌'],
    q53: ['卡牌'], q54: ['射击'], q57: ['射击', '动作'], q58: ['策略'],
    q59: ['动作', 'RPG'], q61: ['MMO'], q62: ['动作', 'RPG'], q64: ['MMO', 'RPG'],
    q65: ['RPG'], q67: ['卡牌', 'RPG'], q68: ['MMO', 'RPG'], q75: ['策略'],
    q76: ['MMO', '策略'], q77: ['MMO'], q78: ['射击'], q79: ['卡牌', '策略'],
    q84: ['卡牌', '策略'], q85: ['动作', 'RPG'], q86: ['动作'], q89: ['动作', 'RPG'],
    q91: ['RPG'], q93: ['MMO', 'RPG'], q94: ['MMO', 'RPG'], q95: ['策略'],
    q99: ['动作'],
    q101: ['MMO'], q102: ['MMO'], q103: ['MMO'], q104: ['MMO'], q105: ['MMO'],
    q106: ['MMO', 'RPG', '动作'], q107: ['MMO', 'RPG', '动作'], q108: ['MMO'],
    q109: ['MMO'], q110: ['MMO']
  };
  d.questions.forEach(function (q) {
    q.genres = genresByQuestion[q.id] ? genresByQuestion[q.id].slice() : [];
    q.scope = q.genres.length ? '目标品类' : '通用';
  });
  d.taxonomy = {
    scopes: ['通用', '目标品类'],
    genres: ['MMO', 'RPG', '卡牌', '射击', '动作', '策略'],
    rule: '只有回答依赖该品类的结构、玩家关系或战斗形态时才标为目标品类；仅在答案中举例不改变分类。'
  };
})();
