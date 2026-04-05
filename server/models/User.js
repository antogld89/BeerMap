// ============================================================
// models/User.js — Modèle MongoDB pour les utilisateurs
// ============================================================

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Email unique pour identifier l'utilisateur
    email: {
      type: String,
      required: [true, "L'email est obligatoire"],
      unique: true,
      lowercase: true,  // Stocke toujours en minuscule
      trim: true,       // Supprime les espaces en début/fin
    },

    // Mot de passe hashé (jamais en clair !)
    password: {
      type: String,
      required: [true, 'Le mot de passe est obligatoire'],
      minlength: [6, 'Le mot de passe doit faire au moins 6 caractères'],
    },

    // Pseudo affiché sur le profil
    username: {
      type: String,
      required: [true, 'Le pseudo est obligatoire'],
      trim: true,
    },
  },
  {
    // Ajoute automatiquement createdAt et updatedAt
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);