import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware.js';
import { aiConfigured, callOpenRouter } from '../lib/openrouter.js';
import { today } from '../lib/dates.js';

const router = express.Router();
router.use(authenticateToken);

// ---------------------------------------------------------------
// Tools the agent can call. Each executor returns a JSON-able result
// and may push a client-visible entry onto actionsTaken.
// ---------------------------------------------------------------

const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a to-do task for the family.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          assignee: { type: 'string', description: 'Family member name, or "Family"' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' },
          category: { type: 'string' },
          urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string' },
        },
        required: ['title', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_reminder',
      description:
        'Schedule a reminder that will notify the user at a specific date and time. Use for "remind me ..." requests.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          remindAt: { type: 'string', description: 'ISO 8601 datetime, e.g. 2026-07-14T08:00:00' },
          assignee: { type: 'string' },
          channel: { type: 'string', enum: ['push', 'call'], description: 'push = phone notification (default); call = phone call (experimental)' },
          notes: { type: 'string' },
        },
        required: ['title', 'remindAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_meeting',
      description: 'Create a meeting/appointment with a start and end time.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          startAt: { type: 'string', description: 'ISO 8601 datetime' },
          endAt: { type: 'string', description: 'ISO 8601 datetime' },
          assignee: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['title', 'startAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'Search the family document vault by title, owner or category.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search text; empty returns everything' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_upcoming',
      description: 'List open tasks/reminders/meetings due soon and documents expiring soon.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Window in days (default 30)' },
        },
        required: [],
      },
    },
  },
];

const newId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

async function executeTool(name, args, userId, actionsTaken) {
  switch (name) {
    case 'create_task': {
      const id = newId('task');
      await query.run(
        `INSERT INTO tasks (id, user_id, title, assignee, due_date, completed, category, type, urgency, notes)
         VALUES (?, ?, ?, ?, ?, 0, ?, 'task', ?, ?)`,
        [id, userId, args.title, args.assignee || 'Family', args.dueDate, args.category || 'Admin', args.urgency || 'medium', args.notes || '']
      );
      actionsTaken.push({ type: 'task', id, title: args.title, dueDate: args.dueDate });
      return { ok: true, id };
    }
    case 'create_reminder': {
      const id = newId('task');
      const dueDate = String(args.remindAt).slice(0, 10);
      const channel = args.channel === 'call' ? 'call' : 'push';
      await query.run(
        `INSERT INTO tasks (id, user_id, title, assignee, due_date, completed, category, type, urgency, notes)
         VALUES (?, ?, ?, ?, ?, 0, 'Admin', 'reminder', 'medium', ?)`,
        [id, userId, args.title, args.assignee || 'Family', dueDate, args.notes || '']
      );
      await query.run(
        `INSERT INTO reminders (user_id, task_id, remind_at, channel, status) VALUES (?, ?, ?, ?, 'pending')`,
        [userId, id, args.remindAt, channel]
      );
      actionsTaken.push({ type: 'reminder', id, title: args.title, remindAt: args.remindAt, channel });
      return { ok: true, id, channel };
    }
    case 'create_meeting': {
      const id = newId('task');
      const startAt = args.startAt;
      const endAt = args.endAt || null;
      await query.run(
        `INSERT INTO tasks (id, user_id, title, assignee, due_date, completed, category, type, urgency, notes, start_at, end_at)
         VALUES (?, ?, ?, ?, ?, 0, 'Admin', 'meeting', 'medium', ?, ?, ?)`,
        [id, userId, args.title, args.assignee || 'Family', String(startAt).slice(0, 10), args.notes || '', startAt, endAt]
      );
      actionsTaken.push({ type: 'meeting', id, title: args.title, startAt, endAt });
      return { ok: true, id };
    }
    case 'search_documents': {
      const q = `%${args.query || ''}%`;
      const rows = await query.all(
        `SELECT id, title, member, category, expiry_date, document_number FROM documents
         WHERE user_id = ? AND (title LIKE ? OR member LIKE ? OR category LIKE ?) LIMIT 20`,
        [userId, q, q, q]
      );
      return rows.map((r) => ({
        id: r.id, title: r.title, owner: r.member, category: r.category,
        expiryDate: r.expiry_date, number: r.document_number,
      }));
    }
    case 'list_upcoming': {
      const days = Math.min(Math.max(Number(args.days) || 30, 1), 365);
      const end = new Date();
      end.setDate(end.getDate() + days);
      const endStr = end.toISOString().slice(0, 10);
      const tasks = await query.all(
        `SELECT id, title, assignee, due_date, type, urgency FROM tasks
         WHERE user_id = ? AND completed = 0 AND due_date <= ? ORDER BY due_date LIMIT 25`,
        [userId, endStr]
      );
      const docs = await query.all(
        `SELECT id, title, member, expiry_date FROM documents
         WHERE user_id = ? AND expiry_date <= ? ORDER BY expiry_date LIMIT 25`,
        [userId, endStr]
      );
      return {
        openItems: tasks.map((t) => ({ id: t.id, title: t.title, assignee: t.assignee, dueDate: t.due_date, type: t.type, urgency: t.urgency })),
        expiringDocuments: docs.map((d) => ({ id: d.id, title: d.title, owner: d.member, expiryDate: d.expiry_date })),
      };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function familyContext(userId) {
  const rows = await query.all('SELECT * FROM family_members WHERE user_id = ?', [userId]);
  if (rows.length === 0) return 'No family members configured yet.';
  return rows
    .map((r) => `${r.name} (${r.role || (r.is_child ? 'child' : 'adult')}${r.grade ? `, ${r.grade}` : ''})`)
    .join('; ');
}

// GET /api/ai/chat/history - Recent conversation (works without an AI key)
router.get('/history', async (req, res) => {
  try {
    const rows = await query.all(
      `SELECT id, role, content, created_at FROM chat_messages
       WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows.reverse().map((r) => ({ id: r.id, role: r.role, content: r.content, createdAt: r.created_at })));
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// POST /api/ai/chat - One conversational turn with server-executed tools
router.post('/', async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }
  if (!aiConfigured()) {
    return res.status(503).json({ error: 'AI is not configured on the server (missing OPENROUTER_API_KEY)' });
  }

  try {
    const context = await familyContext(req.user.id);
    const historyRows = await query.all(
      `SELECT role, content FROM chat_messages WHERE user_id = ? ORDER BY id DESC LIMIT 20`,
      [req.user.id]
    );

    const now = new Date();
    const messages = [
      {
        role: 'system',
        content: `You are Nori, the family operations assistant for the ${req.user.family_name || ''} household.
Today is ${today()} (${now.toLocaleDateString('en-GB', { weekday: 'long' })}, current time ${now.toISOString()}).
Household: ${context}.
You manage documents, tasks, reminders, meetings and school life. Use the tools to actually do what the user asks — resolve relative dates/times ("next Tuesday at 8am") into concrete values before calling a tool. Prefer creating a reminder when the user says "remind me". Phone-call reminders are experimental — mention that when used. Be concise and warm; confirm what you did in one or two sentences.`,
      },
      ...historyRows.reverse(),
      { role: 'user', content: message.trim() },
    ];

    await query.run(
      'INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)',
      [req.user.id, 'user', message.trim()]
    );

    const actionsTaken = [];
    let reply = await callOpenRouter({ messages, tools: TOOL_DEFS });

    // Tool loop: execute requested tools, feed results back, cap iterations.
    for (let round = 0; round < 5 && reply.tool_calls?.length; round++) {
      messages.push(reply);
      for (const call of reply.tool_calls) {
        let result;
        try {
          const args = JSON.parse(call.function.arguments || '{}');
          result = await executeTool(call.function.name, args, req.user.id, actionsTaken);
        } catch (err) {
          console.error(`Tool ${call.function.name} failed:`, err);
          result = { error: 'Tool execution failed' };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      reply = await callOpenRouter({ messages, tools: TOOL_DEFS });
    }

    const assistantText = reply.content || 'Done.';
    await query.run(
      'INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)',
      [req.user.id, 'assistant', assistantText]
    );

    res.json({ message: assistantText, actionsTaken });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'The assistant hit a problem — try again' });
  }
});

export default router;
