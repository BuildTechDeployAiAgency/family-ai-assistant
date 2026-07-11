import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware.js';

const router = express.Router();

// Map a family_members row to the camelCase shape the mobile client uses.
export function mapMember(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role || '',
    color: row.color || '#6366f1',
    avatar: row.avatar || '👤',
    isChild: !!row.is_child,
    grade: row.grade || '',
    schoolEmail: row.school_email || '',
    aliases: row.aliases ? JSON.parse(row.aliases) : [],
  };
}

// GET /api/members - List family members
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await query.all(
      'SELECT * FROM family_members WHERE user_id = ? ORDER BY id',
      [req.user.id]
    );
    res.json(rows.map(mapMember));
  } catch (err) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: 'Failed to fetch family members' });
  }
});

// POST /api/members - Add a family member
router.post('/', authenticateToken, async (req, res) => {
  const { name, role, color, avatar, isChild, grade, schoolEmail, aliases } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Member name is required' });
  }

  try {
    const result = await query.run(
      `INSERT INTO family_members (user_id, name, role, color, avatar, is_child, grade, school_email, aliases)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        name.trim(),
        role || '',
        color || '#6366f1',
        avatar || '👤',
        isChild ? 1 : 0,
        grade || '',
        schoolEmail || '',
        JSON.stringify(aliases || []),
      ]
    );

    const row = await query.get('SELECT * FROM family_members WHERE id = ?', [result.id]);
    res.status(201).json(mapMember(row));
  } catch (err) {
    console.error('Error creating member:', err);
    res.status(500).json({ error: 'Failed to create family member' });
  }
});

// PUT /api/members/:id - Update a family member
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, role, color, avatar, isChild, grade, schoolEmail, aliases } = req.body;

  try {
    const existing = await query.get(
      'SELECT * FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    await query.run(
      `UPDATE family_members
       SET name = ?, role = ?, color = ?, avatar = ?, is_child = ?, grade = ?, school_email = ?, aliases = ?
       WHERE id = ? AND user_id = ?`,
      [
        name !== undefined ? name.trim() : existing.name,
        role !== undefined ? role : existing.role,
        color !== undefined ? color : existing.color,
        avatar !== undefined ? avatar : existing.avatar,
        isChild !== undefined ? (isChild ? 1 : 0) : existing.is_child,
        grade !== undefined ? grade : existing.grade,
        schoolEmail !== undefined ? schoolEmail : existing.school_email,
        aliases !== undefined ? JSON.stringify(aliases) : existing.aliases,
        id,
        req.user.id,
      ]
    );

    const row = await query.get('SELECT * FROM family_members WHERE id = ?', [id]);
    res.json(mapMember(row));
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(500).json({ error: 'Failed to update family member' });
  }
});

// DELETE /api/members/:id - Remove a family member
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query.run(
      'DELETE FROM family_members WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    res.json({ message: 'Family member deleted successfully', id: Number(id) });
  } catch (err) {
    console.error('Error deleting member:', err);
    res.status(500).json({ error: 'Failed to delete family member' });
  }
});

export default router;
