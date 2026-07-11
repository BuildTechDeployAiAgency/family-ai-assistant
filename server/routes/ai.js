import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware.js';
import { aiConfigured, callOpenRouterJSON } from '../lib/openrouter.js';
import { today } from '../lib/dates.js';

const router = express.Router();

// All AI endpoints need a server-side key; report a clear 503 otherwise so
// clients can fall back to demo behaviour.
router.use(authenticateToken, (req, res, next) => {
  if (!aiConfigured()) {
    return res.status(503).json({ error: 'AI is not configured on the server (missing OPENROUTER_API_KEY)' });
  }
  next();
});

async function memberNames(userId) {
  const rows = await query.all('SELECT name FROM family_members WHERE user_id = ?', [userId]);
  return rows.map((r) => r.name);
}

// POST /api/ai/scan-document - Multimodal extraction from a photographed document
router.post('/scan-document', async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    const names = await memberNames(req.user.id);
    const ownerList = names.length > 0 ? names.join(' | ') : 'Family';

    const result = await callOpenRouterJSON({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a document scanner for a family organizer app. Today is ${today()}.
Analyze the document image and reply with ONLY a JSON object:
{
  "name": "<document title, e.g. 'UAE Passport', 'School Consent Form'>",
  "number": "<document/reference number, or empty string>",
  "category": "<one of: Identity | Driving | Education | Health | Finance | Insurance | Travel | Admin>",
  "expiryDate": "<YYYY-MM-DD expiry or due date, or empty string if none visible>",
  "owner": "<who this belongs to — exactly one of: ${ownerList} — pick the closest match from names visible in the document, or 'Family' if shared/unclear>",
  "notes": "<one short sentence of anything important, or empty string>",
  "confidence": <0 to 1>
}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
            },
          ],
        },
      ],
    });

    res.json({
      name: result.name || 'Document',
      number: result.number || '',
      category: result.category || 'Admin',
      expiryDate: result.expiryDate || '',
      owner: result.owner || 'Family',
      notes: result.notes || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.8,
    });
  } catch (err) {
    console.error('Document scan error:', err);
    res.status(500).json({ error: 'Failed to analyze the document image' });
  }
});

export default router;
