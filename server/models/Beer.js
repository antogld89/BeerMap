// ============================================================
// models/Beer.js — Modèle MongoDB pour les bières
// ============================================================

const mongoose = require('mongoose');

const beerSchema = new mongoose.Schema(
  {
    // Référence vers l'utilisateur qui a ajouté la bière
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Nom de la bière (ex: "Leffe Blonde")
    name: {
      type: String,
      required: [true, 'Le nom est obligatoire'],
      trim: true,
      maxlength: [100, 'Le nom est trop long'],
    },

    // Type de bière
    type: {
      type: String,
      required: [true, 'Le type est obligatoire'],
      enum: ['Blonde', 'Brune', 'Blanche', 'IPA', 'Stout', 'Ambrée', 'Lager', 'Trappiste', 'Fruitée', 'Autre'],
    },

    // Note de 1 à 5
    rating: {
      type: Number,
      required: [true, 'La note est obligatoire'],
      min: [1, 'La note minimum est 1'],
      max: [5, 'La note maximum est 5'],
    },

    // Commentaire facultatif
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Le commentaire est trop long'],
      default: '',
    },

    // Coordonnées GPS
    latitude: {
      type: Number,
      required: [true, 'La latitude est obligatoire'],
    },
    longitude: {
      type: Number,
      required: [true, 'La longitude est obligatoire'],
    },

    // Nom du lieu (facultatif, pour afficher dans le popup)
    location: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt et updatedAt automatiques
  }
);

module.exports = mongoose.model('Beer', beerSchema);