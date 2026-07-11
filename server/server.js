import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';
import { authenticateToken } from './middleware.js';
import { progressFromExpiry, statusFromExpiry } from './lib/dates.js';
import membersRouter from './routes/members.js';

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'family-ai-secret-key-2026';

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image uploads

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// POST /api/auth/register - Sign up
app.post('/api/auth/register', async (req, res) => {
  const { email, password, familyName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await query.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Save user
    const result = await query.run(
      'INSERT INTO users (email, password_hash, family_name) VALUES (?, ?, ?)',
      [email, passwordHash, familyName || 'Family']
    );

    const userId = result.id;

    // Seed starter members so assignee/owner pickers are never empty.
    await query.run(
      `INSERT INTO family_members (user_id, name, role, color, avatar, is_child, aliases)
       VALUES (?, ?, ?, ?, ?, 0, '[]')`,
      [userId, 'Parent 1', 'Parent', '#6366f1', '👤']
    );
    await query.run(
      `INSERT INTO family_members (user_id, name, role, color, avatar, is_child, aliases)
       VALUES (?, ?, ?, ?, ?, 0, '[]')`,
      [userId, 'Family', 'Household', '#14b8a6', '🏡']
    );

    // Sign token
    const token = jwt.sign(
      { id: userId, email, family_name: familyName || 'Family' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      user: { id: userId, email, familyName: familyName || 'Family' }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Database error occurred during registration' });
  }
});

// POST /api/auth/login - Log in
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await query.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign token
    const token = jwt.sign(
      { id: user.id, email: user.email, family_name: user.family_name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, familyName: user.family_name }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Database error occurred during login' });
  }
});

// GET /api/auth/me - Verify session
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ 
    user: { 
      id: req.user.id, 
      email: req.user.email, 
      familyName: req.user.family_name 
    } 
  });
});


// -------------------------------------------------------------
// Documents Endpoints (Authenticated)
// -------------------------------------------------------------

// GET /api/documents - Get all user documents
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await query.all('SELECT * FROM documents WHERE user_id = ?', [req.user.id]);
    
    const formattedDocs = documents.map(doc => {
      const progress = progressFromExpiry(doc.expiry_date);

      return {
        id: doc.id,
        name: doc.title,
        number: doc.document_number,
        expiryDate: doc.expiry_date,
        owner: doc.member,
        category: doc.category,
        progress: progress,
        notes: doc.notes || '',
        status: doc.status
      };
    });
    res.json(formattedDocs);
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// POST /api/documents - Add or update a document
app.post('/api/documents', authenticateToken, async (req, res) => {
  const { id, title, name, category, member, owner, expiryDate, expiry_date, status, documentNumber, number, notes } = req.body;

  const finalId = id;
  const finalTitle = title || name;
  const finalCategory = category;
  const finalMember = member || owner;
  const finalExpiryDate = expiryDate || expiry_date;
  const finalNumber = documentNumber || number || '';
  const finalNotes = notes || '';
  
  let finalStatus = status;
  if (!finalStatus && finalExpiryDate) {
    finalStatus = statusFromExpiry(finalExpiryDate);
  }
  if (!finalStatus) finalStatus = 'Valid';

  if (!finalId || !finalTitle || !finalCategory || !finalMember || !finalExpiryDate) {
    return res.status(400).json({ error: 'Missing required document fields' });
  }

  try {
    await query.run(
      `INSERT OR REPLACE INTO documents (id, user_id, title, category, member, expiry_date, status, document_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [finalId, req.user.id, finalTitle, finalCategory, finalMember, finalExpiryDate, finalStatus, finalNumber, finalNotes]
    );

    res.status(201).json({
      id: finalId,
      name: finalTitle,
      category: finalCategory,
      owner: finalMember,
      expiryDate: finalExpiryDate,
      status: finalStatus,
      number: finalNumber,
      notes: finalNotes
    });
  } catch (err) {
    console.error('Error saving document:', err);
    res.status(500).json({ error: 'Failed to save document' });
  }
});

// DELETE /api/documents/:id - Delete a document
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query.run(
      'DELETE FROM documents WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    res.json({ message: 'Document deleted successfully', id });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});


// -------------------------------------------------------------
// Emails Endpoints (Authenticated)
// -------------------------------------------------------------

// GET /api/emails - Get all user emails
app.get('/api/emails', authenticateToken, async (req, res) => {
  try {
    const emails = await query.all('SELECT * FROM emails WHERE user_id = ?', [req.user.id]);
    
    // Map read / has_attachment / processed from 0/1 back to boolean for React
    const formattedEmails = emails.map(email => ({
      ...email,
      from: email.sender,
      read: !!email.read,
      has_attachment: !!email.has_attachment,
      processed: !!email.processed,
      icon: email.icon || '✉️'
    }));

    res.json(formattedEmails);
  } catch (err) {
    console.error('Error fetching emails:', err);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// POST /api/emails/sync - Bulk sync user emails on first-run or dashboard reset
app.post('/api/emails/sync', authenticateToken, async (req, res) => {
  const { emails } = req.body;

  if (!Array.isArray(emails)) {
    return res.status(400).json({ error: 'Emails array is required' });
  }

  try {
    // Insert all emails
    for (const email of emails) {
      await query.run(
        `INSERT OR REPLACE INTO emails (id, user_id, sender, subject, date, body, read, has_attachment, attachment_name, processed, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          email.id,
          req.user.id,
          email.from || email.sender,
          email.subject,
          email.date,
          email.body,
          email.read ? 1 : 0,
          email.has_attachment ? 1 : 0,
          email.attachment_name || '',
          email.processed ? 1 : 0,
          email.icon || '✉️'
        ]
      );
    }
    res.json({ message: 'Emails synchronized successfully', count: emails.length });
  } catch (err) {
    console.error('Error syncing emails:', err);
    res.status(500).json({ error: 'Failed to synchronize emails' });
  }
});

// PUT /api/emails/:id - Update read/processed state
app.put('/api/emails/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { read, processed } = req.body;

  try {
    // Check what parameters are passed and dynamically build statement
    if (read !== undefined && processed !== undefined) {
      await query.run(
        'UPDATE emails SET read = ?, processed = ? WHERE id = ? AND user_id = ?',
        [read ? 1 : 0, processed ? 1 : 0, id, req.user.id]
      );
    } else if (read !== undefined) {
      await query.run(
        'UPDATE emails SET read = ? WHERE id = ? AND user_id = ?',
        [read ? 1 : 0, id, req.user.id]
      );
    } else if (processed !== undefined) {
      await query.run(
        'UPDATE emails SET processed = ? WHERE id = ? AND user_id = ?',
        [processed ? 1 : 0, id, req.user.id]
      );
    }

    res.json({ message: 'Email updated successfully', id });
  } catch (err) {
    console.error('Error updating email:', err);
    res.status(500).json({ error: 'Failed to update email' });
  }
});


// -------------------------------------------------------------
// Tasks Endpoints (Authenticated)
// -------------------------------------------------------------

// GET /api/tasks - Get user tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await query.all('SELECT * FROM tasks WHERE user_id = ?', [req.user.id]);
    
    // Map completed from 0/1 back to boolean for React
    const formattedTasks = tasks.map(task => ({
      ...task,
      completed: !!task.completed
    }));

    res.json(formattedTasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Add or replace a task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  const { id, title, assignee, dueDate, completed, category } = req.body;

  if (!id || !title || !assignee || !dueDate || !category) {
    return res.status(400).json({ error: 'Missing required task fields' });
  }

  try {
    await query.run(
      `INSERT OR REPLACE INTO tasks (id, user_id, title, assignee, due_date, completed, category)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, title, assignee, dueDate, completed ? 1 : 0, category]
    );

    res.status(201).json({ id, title, assignee, dueDate, completed, category });
  } catch (err) {
    console.error('Error saving task:', err);
    res.status(500).json({ error: 'Failed to save task' });
  }
});

// PUT /api/tasks/:id - Update complete or content status
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { completed, title, assignee, dueDate, category } = req.body;

  try {
    if (completed !== undefined) {
      await query.run(
        'UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?',
        [completed ? 1 : 0, id, req.user.id]
      );
    } else {
      await query.run(
        `UPDATE tasks SET title = ?, assignee = ?, due_date = ?, category = ? 
         WHERE id = ? AND user_id = ?`,
        [title, assignee, dueDate, category, id, req.user.id]
      );
    }

    res.json({ message: 'Task updated successfully', id });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query.run(
      'DELETE FROM tasks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    res.json({ message: 'Task deleted successfully', id });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});


// -------------------------------------------------------------
// Family Members Endpoints (Authenticated)
// -------------------------------------------------------------
app.use('/api/members', membersRouter);


// -------------------------------------------------------------
// Serve static client bundle in production
// -------------------------------------------------------------
app.use(express.static('dist'));

// Server listening
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
