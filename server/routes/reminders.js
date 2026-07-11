import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware.js';

const router = express.Router();

export const mapReminder = (row) => ({
  id: row.id,
  taskId: row.task_id,
  remindAt: row.remind_at,
  channel: row.channel,
  status: row.status,
  sentAt: row.sent_at,
});

// GET /api/reminders - List reminders (optionally ?taskId=...)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.query;
    const rows = taskId
      ? await query.all('SELECT * FROM reminders WHERE user_id = ? AND task_id = ? ORDER BY remind_at', [req.user.id, taskId])
      : await query.all('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at', [req.user.id]);
    res.json(rows.map(mapReminder));
  } catch (err) {
    console.error('Error fetching reminders:', err);
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST /api/reminders - Schedule a reminder
router.post('/', authenticateToken, async (req, res) => {
  const { taskId, remindAt, channel } = req.body;

  if (!remindAt) {
    return res.status(400).json({ error: 'remindAt is required (ISO datetime)' });
  }
  const validChannels = ['push', 'call', 'telegram'];
  if (channel && !validChannels.includes(channel)) {
    return res.status(400).json({ error: `channel must be one of: ${validChannels.join(', ')}` });
  }

  try {
    const result = await query.run(
      `INSERT INTO reminders (user_id, task_id, remind_at, channel, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, taskId || null, remindAt, channel || 'push']
    );
    const row = await query.get('SELECT * FROM reminders WHERE id = ?', [result.id]);
    res.status(201).json(mapReminder(row));
  } catch (err) {
    console.error('Error creating reminder:', err);
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

// DELETE /api/reminders/:id - Cancel a reminder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await query.run(
      'DELETE FROM reminders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }
    res.json({ message: 'Reminder deleted successfully', id: Number(req.params.id) });
  } catch (err) {
    console.error('Error deleting reminder:', err);
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
});

export default router;
