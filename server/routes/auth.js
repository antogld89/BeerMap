// ============================================================
// routes/auth.js — Routes d'authentification
// ============================================================

const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register — Créer un compte
router.post('/register', register);

// POST /api/auth/login — Se connecter
router.post('/login', login);

module.exports = router;