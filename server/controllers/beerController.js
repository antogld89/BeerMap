// ============================================================
// controllers/beerController.js — Logique des bières
// ============================================================

const Beer = require('../models/Beer');
const User = require('../models/User');

// ─── GET /api/beers — Récupérer les bières ──────────────────
// Par défaut : toutes les bières (pour la carte publique)
// Avec ?mine=true : seulement les bières de l'utilisateur connecté
const getBeers = async (req, res) => {
  try {
    let query = {};

    // Si le paramètre "mine" est présent, filtre par userId
    if (req.query.mine === 'true') {
      query.userId = req.userId;
    }

    // Récupère les bières triées par date (plus récente en premier)
    // .populate() remplace l'ID par les données de l'utilisateur
    const beers = await Beer.find(query)
      .populate('userId', 'username') // Inclut seulement le username
      .sort({ createdAt: -1 });

    res.json(beers);
  } catch (err) {
    console.error('Erreur getBeers:', err);
    res.status(500).json({ message: 'Erreur lors de la récupération des bières.' });
  }
};

// ─── POST /api/beers — Ajouter une bière ────────────────────
const addBeer = async (req, res) => {
  try {
    const { name, type, rating, comment, latitude, longitude, location } = req.body;

    // Validation des champs obligatoires
    if (!name || !type || !rating || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        message: 'Champs obligatoires manquants : nom, type, note, coordonnées GPS.',
      });
    }

    // Crée la bière en base
    const beer = await Beer.create({
      userId: req.userId, // Injecté par le middleware auth
      name,
      type,
      rating: Number(rating),
      comment: comment || '',
      latitude: Number(latitude),
      longitude: Number(longitude),
      location: location || '',
    });

    // Récupère la bière avec le username pour la réponse
    const populatedBeer = await beer.populate('userId', 'username');

    res.status(201).json({
      message: 'Bière ajoutée ! 🍺',
      beer: populatedBeer,
    });
  } catch (err) {
    console.error('Erreur addBeer:', err);
    // Gestion des erreurs de validation Mongoose
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Erreur lors de l\'ajout de la bière.' });
  }
};

// ─── DELETE /api/beers/:id — Supprimer une bière ────────────
const deleteBeer = async (req, res) => {
  try {
    const beer = await Beer.findById(req.params.id);

    if (!beer) {
      return res.status(404).json({ message: 'Bière introuvable.' });
    }

    // Vérifie que la bière appartient à l'utilisateur connecté
    if (beer.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Tu ne peux pas supprimer la bière d\'un autre !' });
    }

    await beer.deleteOne();
    res.json({ message: 'Bière supprimée.' });
  } catch (err) {
    console.error('Erreur deleteBeer:', err);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};

// ─── GET /api/beers/stats — Statistiques de l'utilisateur ───
const getStats = async (req, res) => {
  try {
    const beers = await Beer.find({ userId: req.userId });

    const total = beers.length;
    const avgRating =
      total > 0
        ? (beers.reduce((sum, b) => sum + b.rating, 0) / total).toFixed(1)
        : 0;

    // Compte par type de bière
    const byType = beers.reduce((acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    }, {});

    res.json({ total, avgRating, byType });
  } catch (err) {
    console.error('Erreur getStats:', err);
    res.status(500).json({ message: 'Erreur lors du calcul des stats.' });
  }
};

module.exports = { getBeers, addBeer, deleteBeer, getStats };