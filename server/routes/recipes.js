import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware.js';

const router = express.Router();
router.use(authenticateToken);

export const mapRecipe = (row) => ({
  id: row.id,
  title: row.title,
  sourceUrl: row.source_url || '',
  image: row.image || '',
  ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
  steps: row.steps ? JSON.parse(row.steps) : [],
  createdAt: row.created_at,
});

// GET /api/recipes - List saved recipes
router.get('/', async (req, res) => {
  try {
    const rows = await query.all(
      'SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows.map(mapRecipe));
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// POST /api/recipes - Save a recipe
router.post('/', async (req, res) => {
  const { id, title, sourceUrl, image, ingredients, steps } = req.body;

  if (!id || !title) {
    return res.status(400).json({ error: 'id and title are required' });
  }

  try {
    await query.run(
      `INSERT OR REPLACE INTO recipes (id, user_id, title, source_url, image, ingredients, steps)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        title,
        sourceUrl || '',
        image || '',
        JSON.stringify(ingredients || []),
        JSON.stringify(steps || []),
      ]
    );
    const row = await query.get('SELECT * FROM recipes WHERE id = ?', [id]);
    res.status(201).json(mapRecipe(row));
  } catch (err) {
    console.error('Error saving recipe:', err);
    res.status(500).json({ error: 'Failed to save recipe' });
  }
});

// DELETE /api/recipes/:id - Remove a recipe
router.delete('/:id', async (req, res) => {
  try {
    const result = await query.run(
      'DELETE FROM recipes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting recipe:', err);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

export default router;
