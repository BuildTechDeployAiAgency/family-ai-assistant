import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'family-ai-secret-key-2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Bind token payload (contains id, email, family_name) to request
    req.user = user;
    next();
  });
};
