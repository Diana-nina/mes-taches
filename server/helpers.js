const db = require('./db');
const { getWeekKey, getMonthKey, getWeekIndex, rotationMemberId } = require('./rollover');

function listMembers() {
  return db.prepare('SELECT * FROM members ORDER BY sort_order, id').all();
}

// period_key dépend de la fréquence : semaine pour daily, mois pour monthly.
// `ref` (Date optionnelle) permet de calculer pour un autre jour que today.
function periodKeyForTask(task, ref) {
  return task.freq === 'monthly' ? getMonthKey(ref) : getWeekKey(ref);
}

// Enrichit une tâche avec son état de complétion + le membre résolu pour la rotation.
function enrichTask(task, members, weekIndex, ref) {
  const periodKey = periodKeyForTask(task, ref);
  const comp = db.prepare(
    'SELECT member_id, done_at FROM completions WHERE task_id = ? AND period_key = ?'
  ).get(task.id, periodKey);

  let rotationMember = null;
  if (task.assignee === 'rotation') {
    rotationMember = rotationMemberId(task.id, members, weekIndex);
  }

  return {
    id: task.id,
    freq: task.freq,
    day_idx: task.day_idx,
    e: task.emoji,
    n: task.name,
    d: task.detail,
    c: task.cat,
    assignee: task.assignee,
    points: task.points,
    sort_order: task.sort_order,
    done: !!comp,
    done_by: comp ? comp.member_id : null,
    done_at: comp ? comp.done_at : null,
    rotation_member: rotationMember,
  };
}

module.exports = {
  listMembers, periodKeyForTask, enrichTask,
  getWeekKey, getMonthKey, getWeekIndex,
};
