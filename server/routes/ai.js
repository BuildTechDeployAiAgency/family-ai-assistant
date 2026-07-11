import express from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../middleware.js';
import { aiConfigured, callOpenRouterJSON } from '../lib/openrouter.js';
import { today } from '../lib/dates.js';

const router = express.Router();

router.use(authenticateToken);

// Routes that actually call the model need a server-side key; report a clear
// 503 otherwise so clients can fall back to demo behaviour. (Cache reads like
// /email-analyses work without a key.)
const requireAI = (req, res, next) => {
  if (!aiConfigured()) {
    return res.status(503).json({ error: 'AI is not configured on the server (missing OPENROUTER_API_KEY)' });
  }
  next();
};

async function memberNames(userId) {
  const rows = await query.all('SELECT name FROM family_members WHERE user_id = ?', [userId]);
  return rows.map((r) => r.name);
}

async function familyContext(userId) {
  const rows = await query.all('SELECT * FROM family_members WHERE user_id = ?', [userId]);
  if (rows.length === 0) return 'The household members are unknown — use "Family" as owner.';
  return (
    'Household members: ' +
    rows
      .map((r) => `${r.name} (${r.role || (r.is_child ? 'child' : 'adult')}${r.grade ? `, ${r.grade}` : ''})`)
      .join('; ')
  );
}

// POST /api/ai/scan-document - Multimodal extraction from a photographed document
router.post('/scan-document', requireAI, async (req, res) => {
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

// POST /api/ai/analyze-email - Structured analysis of one email (cached)
router.post('/analyze-email', async (req, res, next) => {
  // Serve the cache even without a key; only fresh analysis needs AI.
  if (!aiConfigured() && !req.body.force) {
    try {
      const cached = await query.get(
        'SELECT analysis FROM email_analyses WHERE email_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
        [req.body.emailId, req.user.id]
      );
      if (cached) return res.json(JSON.parse(cached.analysis));
    } catch {
      // fall through to the 503
    }
    return res.status(503).json({ error: 'AI is not configured on the server (missing OPENROUTER_API_KEY)' });
  }
  next();
}, async (req, res) => {
  const { emailId, force } = req.body;

  if (!emailId) {
    return res.status(400).json({ error: 'emailId is required' });
  }

  try {
    const email = await query.get(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?',
      [emailId, req.user.id]
    );
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    if (!force) {
      const cached = await query.get(
        'SELECT analysis FROM email_analyses WHERE email_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
        [emailId, req.user.id]
      );
      if (cached) {
        return res.json(JSON.parse(cached.analysis));
      }
    }

    const context = await familyContext(req.user.id);
    const names = await memberNames(req.user.id);

    const analysis = await callOpenRouterJSON({
      messages: [
        {
          role: 'user',
          content: `You are a family operations assistant. Today is ${today()}. ${context}

Analyze this email and reply with ONLY a JSON object:
{
  "events": [{ "date": "<YYYY-MM-DD or datetime>", "description": "<what>" }],
  "actionItems": [{ "action": "<imperative task>", "owner": "<one of: ${names.join(' | ') || 'Family'} | Both>", "deadline": "<YYYY-MM-DD>" }],
  "documentsNeeded": ["<document names mentioned as required>"],
  "deadlines": [{ "item": "<what is due>", "date": "<YYYY-MM-DD>", "urgency": "high|medium|low" }],
  "needsReply": <true if the sender expects a response>,
  "draftReply": <a short polite reply drafted on behalf of the family, or null>,
  "summary": "<one-sentence summary>"
}
Use empty arrays when nothing applies. Dates must be concrete — resolve relative phrases like "next Wednesday" against today's date and the email date.

From: ${email.sender}
Date: ${email.date}
Subject: ${email.subject}

${email.body}`,
        },
      ],
    });

    const normalized = {
      events: Array.isArray(analysis.events) ? analysis.events : [],
      actionItems: Array.isArray(analysis.actionItems) ? analysis.actionItems : [],
      documentsNeeded: Array.isArray(analysis.documentsNeeded) ? analysis.documentsNeeded : [],
      deadlines: Array.isArray(analysis.deadlines) ? analysis.deadlines : [],
      needsReply: !!analysis.needsReply,
      draftReply: analysis.draftReply || null,
      summary: analysis.summary || '',
    };

    await query.run(
      'INSERT INTO email_analyses (email_id, user_id, analysis) VALUES (?, ?, ?)',
      [emailId, req.user.id, JSON.stringify(normalized)]
    );
    await query.run(
      'UPDATE emails SET processed = 1 WHERE id = ? AND user_id = ?',
      [emailId, req.user.id]
    );

    res.json(normalized);
  } catch (err) {
    console.error('Email analysis error:', err);
    res.status(500).json({ error: 'Failed to analyze the email' });
  }
});

// GET /api/ai/email-analyses - All cached analyses for this user
router.get('/email-analyses', async (req, res) => {
  try {
    const rows = await query.all(
      `SELECT email_id, analysis FROM email_analyses
       WHERE user_id = ? AND id IN (
         SELECT MAX(id) FROM email_analyses WHERE user_id = ? GROUP BY email_id
       )`,
      [req.user.id, req.user.id]
    );
    const byEmail = {};
    for (const row of rows) {
      byEmail[row.email_id] = JSON.parse(row.analysis);
    }
    res.json(byEmail);
  } catch (err) {
    console.error('Error fetching analyses:', err);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// POST /api/ai/draft-reply - (Re)generate a reply draft for an email
router.post('/draft-reply', requireAI, async (req, res) => {
  const { emailId, instructions } = req.body;

  if (!emailId) {
    return res.status(400).json({ error: 'emailId is required' });
  }

  try {
    const email = await query.get(
      'SELECT * FROM emails WHERE id = ? AND user_id = ?',
      [emailId, req.user.id]
    );
    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const result = await callOpenRouterJSON({
      messages: [
        {
          role: 'user',
          content: `You draft email replies on behalf of a busy family (family name: ${req.user.family_name || 'the family'}). Today is ${today()}.
${instructions ? `Follow these instructions: ${instructions}` : 'Keep it short, warm and practical.'}

Reply with ONLY a JSON object: { "draftReply": "<the reply text>" }

Original email:
From: ${email.sender}
Subject: ${email.subject}

${email.body}`,
        },
      ],
    });

    res.json({ draftReply: result.draftReply || '' });
  } catch (err) {
    console.error('Draft reply error:', err);
    res.status(500).json({ error: 'Failed to draft a reply' });
  }
});

// Fetch a web page and reduce it to readable text for recipe extraction.
async function fetchPageText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FamilyAI/1.0)' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const html = await res.text();

  const ogImage = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1]
    ?? '';

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15000);

  return { text, ogImage };
}

// POST /api/ai/extract-recipe - Structure a recipe from a URL, pasted text, or photo
router.post('/extract-recipe', requireAI, async (req, res) => {
  const { url, text, imageBase64, mimeType } = req.body;

  if (!url && !text && !imageBase64) {
    return res.status(400).json({ error: 'Provide a url, text, or imageBase64' });
  }

  try {
    const instruction = `You extract recipes for a family cookbook. Reply with ONLY a JSON object:
{
  "title": "<recipe name>",
  "ingredients": ["<one ingredient per entry, with quantity>"],
  "steps": ["<one concise step per entry, in order>"]
}
If the content is not a recipe, return { "title": "", "ingredients": [], "steps": [] }.`;

    let messages;
    let image = '';

    if (imageBase64) {
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: instruction },
            { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
          ],
        },
      ];
    } else if (url) {
      const page = await fetchPageText(url);
      image = page.ogImage;
      messages = [{ role: 'user', content: `${instruction}\n\nPage content from ${url}:\n\n${page.text}` }];
    } else {
      messages = [{ role: 'user', content: `${instruction}\n\nRecipe text:\n\n${String(text).slice(0, 15000)}` }];
    }

    const result = await callOpenRouterJSON({ messages, maxTokens: 3000 });

    if (!result.title) {
      return res.status(422).json({ error: "Couldn't find a recipe in that content" });
    }

    res.json({
      title: result.title,
      ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
      steps: Array.isArray(result.steps) ? result.steps : [],
      image,
      sourceUrl: url || '',
    });
  } catch (err) {
    console.error('Recipe extraction error:', err);
    res.status(500).json({ error: 'Failed to extract the recipe' });
  }
});

export default router;
