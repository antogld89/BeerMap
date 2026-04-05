// ============================================================
// server.js — Point d'entrée du serveur BeerMap
// ============================================================

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ────────────────────────────────────────────
// Permet de recevoir du JSON dans les requêtes
app.use(express.json());

// Permet les requêtes cross-origin (utile en développement)
app.use(cors());

// Sert les fichiers statiques du dossier client (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../client')));

// ─── Routes API ─────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const beerRoutes = require('./routes/beers');

app.use('/api/auth', authRoutes);   // POST /api/auth/register, /api/auth/login
app.use('/api/beers', beerRoutes);  // GET/POST /api/beers

// ─── Route fallback (renvoie index.html pour le SPA) ────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/index.html'));
});

// ─── Connexion MongoDB ───────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB');
    app.listen(PORT, () => {
      console.log(`🍺 BeerMap tourne sur http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur MongoDB :', err.message);
    process.exit(1);
  });
