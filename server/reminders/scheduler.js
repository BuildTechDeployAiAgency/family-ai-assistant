// Reminder dispatch loop: every 30s, deliver pending reminders that are due.
// The server is authoritative for channels it can reach (call, future remote
// push); on-device local notifications are scheduled separately by the app.
import { Cron } from 'croner';
import { query } from '../db.js';
import { getChannel } from './channels/index.js';

async function dispatchDueReminders() {
  const nowIso = new Date().toISOString();

  let due;
  try {
    due = await query.all(
      `SELECT * FROM reminders WHERE status = 'pending' AND remind_at <= ?`,
      [nowIso]
    );
  } catch (err) {
    console.error('Reminder scheduler query error:', err);
    return;
  }

  for (const reminder of due) {
    try {
      const user = await query.get('SELECT id, email FROM users WHERE id = ?', [reminder.user_id]);
      const task = reminder.task_id
        ? await query.get('SELECT * FROM tasks WHERE id = ?', [reminder.task_id])
        : null;

      await getChannel(reminder.channel).send(reminder, user, task);

      await query.run(
        `UPDATE reminders SET status = 'sent', sent_at = ? WHERE id = ?`,
        [nowIso, reminder.id]
      );
    } catch (err) {
      console.error(`Failed to dispatch reminder ${reminder.id}:`, err);
      await query.run(`UPDATE reminders SET status = 'failed' WHERE id = ?`, [reminder.id]).catch(() => {});
    }
  }
}

export function startReminderScheduler() {
  const job = new Cron('*/30 * * * * *', dispatchDueReminders);
  console.log('Reminder scheduler started (30s tick).');
  return job;
}
