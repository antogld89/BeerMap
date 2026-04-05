// ============================================================
// routes/beers.js — Routes des bières
// ============================================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getBeers, addBeer, deleteBeer, getStats } = require('../controllers/beerController');

// Toutes ces routes nécessitent d'être connecté (authMiddleware)

// GET  /api/beers        — Récupérer toutes les bières (ou les miennes avec ?mine=true)
router.get('/', authMiddleware, getBeers);

// POST /api/beers        — Ajouter une bière
router.post('/', authMiddleware, addBeer);

// DELETE /api/beers/:id  — Supprimer une bière
router.delete('/:id', authMiddleware, deleteBeer);

// GET  /api/beers/stats  — Statistiques personnelles
router.get('/stats', authMiddleware, getStats);

module.exports = router;