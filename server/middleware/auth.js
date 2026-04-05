// ============================================================
// middleware/auth.js — Vérification du token JWT
// ============================================================

const jwt = require('jsonwebtoken');

// Ce middleware protège les routes qui nécessitent une connexion.
// Il vérifie que le token JWT dans le header est valide.

const authMiddleware = (req, res, next) => {
  // Récupère le header Authorization (format: "Bearer <token>")
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant. Connecte-toi d\'abord.' });
  }

  // Extrait le token (après "Bearer ")
  const token = authHeader.split(' ')[1];

  try {
    // Vérifie et décode le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ajoute les infos de l'utilisateur à la requête
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    // Passe à la route suivante
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré. Reconnecte-toi.' });
  }
};

module.exports = authMiddleware;