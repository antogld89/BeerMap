// ============================================================
// app.js — BeerMap Frontend
// ============================================================

// ─── Configuration ──────────────────────────────────────────
// En développement le serveur tourne sur localhost:3000
// En production, le serveur sert les fichiers statiques donc on
// utilise une URL relative (même domaine)
const API_BASE = '/api';

// ─── État global de l'application ───────────────────────────
const state = {
  token: localStorage.getItem('beermap_token') || null,
  user: JSON.parse(localStorage.getItem('beermap_user') || 'null'),
  map: null,           // Instance Leaflet
  markers: [],         // Marqueurs sur la carte
  currentPos: null,    // { lat, lng } position actuelle
  beers: [],           // Liste de toutes les bières
  selectedRating: 0,   // Note sélectionnée dans le formulaire
};


// ════════════════════════════════════════════════════════════
//  UTILITAIRES
// ════════════════════════════════════════════════════════════

// Affiche un message dans un élément (erreur ou succès)
function showMessage(elementId, text, type = 'error') {
  const el = document.getElementById(elementId);
  el.textContent = text;
  el.className = `message ${type}`;
  el.classList.remove('hidden');

  // Efface le message après 4 secondes
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// Formate une date en français
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Génère une chaîne d'étoiles (ex: "★★★☆☆" pour 3/5)
function starsHtml(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// Requête HTTP vers l'API avec gestion du token JWT
async function apiRequest(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };

  // Ajoute le token si disponible
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  const data = await response.json();

  if (!response.ok) {
    // Lance une erreur avec le message du serveur
    throw new Error(data.message || 'Erreur serveur');
  }

  return data;
}


// ════════════════════════════════════════════════════════════
//  AUTHENTIFICATION
// ════════════════════════════════════════════════════════════

// Sauvegarde le token et l'utilisateur dans localStorage
function saveSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('beermap_token', token);
  localStorage.setItem('beermap_user', JSON.stringify(user));
}

// Supprime la session
function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('beermap_token');
  localStorage.removeItem('beermap_user');
}

// Affiche la page principale ou la page de connexion selon l'état
function checkAuth() {
  if (state.token && state.user) {
    showMainPage();
  } else {
    showAuthPage();
  }
}

function showAuthPage() {
  document.getElementById('auth-page').classList.remove('hidden');
  document.getElementById('main-page').classList.add('hidden');
}

function showMainPage() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('main-page').classList.remove('hidden');
  initApp();
}

// Initialise les onglets connexion/inscription
function initAuthTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // Active l'onglet cliqué
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      // Affiche le bon contenu
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      document.getElementById(`tab-${tab}`).classList.add('active');

      // Cache le message
      document.getElementById('auth-message').classList.add('hidden');
    });
  });
}

// Connexion
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showMessage('auth-message', 'Remplis tous les champs !');
    return;
  }

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.textContent = 'Connexion...';

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    saveSession(data.token, data.user);
    showMainPage();
  } catch (err) {
    showMessage('auth-message', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
});

// Inscription
document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  if (!username || !email || !password) {
    showMessage('auth-message', 'Remplis tous les champs !');
    return;
  }

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Création...';

  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    saveSession(data.token, data.user);
    showMainPage();
  } catch (err) {
    showMessage('auth-message', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Créer mon compte';
  }
});

// Déconnexion
document.getElementById('btn-logout').addEventListener('click', () => {
  if (confirm('Tu veux vraiment te déconnecter ?')) {
    clearSession();

    // Détruit la carte Leaflet si elle existe
    if (state.map) {
      state.map.remove();
      state.map = null;
    }

    showAuthPage();
  }
});


// ════════════════════════════════════════════════════════════
//  NAVIGATION (Carte / Profil)
// ════════════════════════════════════════════════════════════

document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;

    // Mise à jour des boutons nav
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    // Affiche la bonne vue
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.remove('active');
      v.classList.add('hidden');
    });

    const targetView = document.getElementById(`view-${view}`);
    targetView.classList.remove('hidden');
    targetView.classList.add('active');

    // Si on va sur le profil, on recharge les données
    if (view === 'profile') {
      loadProfile();
    }

    // Leaflet a besoin d'un refresh si la carte était cachée
    if (view === 'map' && state.map) {
      setTimeout(() => state.map.invalidateSize(), 100);
    }
  });
});


// ════════════════════════════════════════════════════════════
//  CARTE LEAFLET
// ════════════════════════════════════════════════════════════

function initMap() {
  // Si la carte existe déjà, pas besoin de la recréer
  if (state.map) return;

  // Crée la carte centrée sur la France par défaut
  state.map = L.map('map').setView([46.5, 2.5], 6);

  // Fond de carte OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(state.map);

  // Essaye de centrer sur la position de l'utilisateur
  locateUser();

  // Charge les bières sur la carte
  loadBeersOnMap();
}

// Géolocalise l'utilisateur
function locateUser() {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      state.currentPos = { lat: latitude, lng: longitude };

      // Centre et zoom sur la position
      state.map.setView([latitude, longitude], 14);

      // Marqueur bleu pour "ma position"
      const myIcon = L.divIcon({
        html: '<div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: '',
      });

      L.marker([latitude, longitude], { icon: myIcon })
        .addTo(state.map)
        .bindPopup('<b>📍 Vous êtes ici</b>');
    },
    (err) => {
      console.warn('Géolocalisation refusée :', err.message);
    }
  );
}

// Crée une icône de marqueur bière personnalisée
function createBeerMarker(rating) {
  // Couleur selon la note
  const colors = { 5: '#22C55E', 4: '#84CC16', 3: '#F59E0B', 2: '#F97316', 1: '#EF4444' };
  const color = colors[rating] || '#F59E0B';

  return L.divIcon({
    html: `<div style="
      background:${color};
      width:32px;height:32px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:14px;margin-left:1px;margin-top:1px;">🍺</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    className: '',
  });
}

// Charge toutes les bières et les affiche sur la carte
async function loadBeersOnMap() {
  try {
    const beers = await apiRequest('/beers');
    state.beers = beers;

    // Supprime les anciens marqueurs
    state.markers.forEach((m) => state.map.removeLayer(m));
    state.markers = [];

    // Ajoute un marqueur pour chaque bière
    beers.forEach((beer) => addMarkerToMap(beer));
  } catch (err) {
    console.error('Erreur chargement bières:', err);
  }
}

function addMarkerToMap(beer) {
  const marker = L.marker([beer.latitude, beer.longitude], {
    icon: createBeerMarker(beer.rating),
  });

  // Contenu du popup
  const isOwner = beer.userId && beer.userId._id === state.user?.id;
  const popupContent = `
    <div class="popup-name">${beer.name}</div>
    <span class="popup-type">${beer.type}</span>
    <div class="popup-stars">${starsHtml(beer.rating)}</div>
    ${beer.comment ? `<div class="popup-comment">"${beer.comment}"</div>` : ''}
    <div class="popup-meta">
      Par ${beer.userId?.username || 'Anonyme'} · ${formatDate(beer.createdAt)}
      ${beer.location ? ` · ${beer.location}` : ''}
    </div>
    ${isOwner ? `<button class="popup-delete" onclick="deleteBeer('${beer._id}')">🗑️ Supprimer</button>` : ''}
  `;

  marker.addTo(state.map).bindPopup(popupContent, { maxWidth: 260 });
  state.markers.push(marker);
}


// ════════════════════════════════════════════════════════════
//  FORMULAIRE AJOUT DE BIÈRE
// ════════════════════════════════════════════════════════════

// Ouvre la modale et démarre la géolocalisation
document.getElementById('btn-add-beer').addEventListener('click', () => {
  openModal();
});

function openModal() {
  // Réinitialise le formulaire
  document.getElementById('beer-name').value = '';
  document.getElementById('beer-type').value = '';
  document.getElementById('beer-comment').value = '';
  document.getElementById('beer-rating').value = '0';
  document.getElementById('form-message').classList.add('hidden');
  resetStars();
  state.selectedRating = 0;
  state.currentPos = null;

  // Affiche la modale
  document.getElementById('modal-add-beer').classList.remove('hidden');

  // Lance la géolocalisation
  getPosition();
}

function closeModal() {
  document.getElementById('modal-add-beer').classList.add('hidden');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', closeModal);

// Récupère la position GPS
function getPosition() {
  const gpsText = document.getElementById('gps-text');
  const gpsDot = document.querySelector('.gps-dot');

  gpsDot.className = 'gps-dot loading';
  gpsText.textContent = 'Récupération de la position...';

  if (!navigator.geolocation) {
    gpsDot.className = 'gps-dot error';
    gpsText.textContent = 'Géolocalisation non supportée par ce navigateur.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.currentPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      gpsDot.className = 'gps-dot success';
      gpsText.textContent = `Position trouvée ✓ (${state.currentPos.lat.toFixed(4)}, ${state.currentPos.lng.toFixed(4)})`;
    },
    (err) => {
      gpsDot.className = 'gps-dot error';
      gpsText.textContent = 'Position indisponible. Vérifie les permissions.';
      console.warn('Géoloc erreur:', err.message);
    },
    { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
  );
}

// ─── Gestion des étoiles ─────────────────────────────────────

function resetStars() {
  document.querySelectorAll('.star').forEach((s) => s.classList.remove('active'));
}

function setStars(value) {
  document.querySelectorAll('.star').forEach((star) => {
    const starVal = parseInt(star.dataset.value);
    star.classList.toggle('active', starVal <= value);
  });
}

// Survol des étoiles
document.querySelectorAll('.star').forEach((star) => {
  star.addEventListener('mouseenter', () => {
    setStars(parseInt(star.dataset.value));
  });
  star.addEventListener('mouseleave', () => {
    setStars(state.selectedRating);
  });
  star.addEventListener('click', () => {
    state.selectedRating = parseInt(star.dataset.value);
    document.getElementById('beer-rating').value = state.selectedRating;
    setStars(state.selectedRating);
  });
});

// ─── Soumission du formulaire ─────────────────────────────────

document.getElementById('btn-submit-beer').addEventListener('click', async () => {
  const name = document.getElementById('beer-name').value.trim();
  const type = document.getElementById('beer-type').value;
  const rating = parseInt(document.getElementById('beer-rating').value);
  const comment = document.getElementById('beer-comment').value.trim();

  // Validation
  if (!name) {
    showMessage('form-message', 'Donne un nom à ta bière !');
    return;
  }
  if (!type) {
    showMessage('form-message', 'Choisis un type de bière.');
    return;
  }
  if (!rating || rating < 1) {
    showMessage('form-message', 'Donne une note (1 à 5 étoiles).');
    return;
  }
  if (!state.currentPos) {
    showMessage('form-message', 'Position GPS indisponible. Autorise la géolocalisation.');
    return;
  }

  // Désactive le bouton pendant l'envoi
  const btn = document.getElementById('btn-submit-beer');
  document.getElementById('submit-text').classList.add('hidden');
  document.getElementById('submit-loader').classList.remove('hidden');
  btn.disabled = true;

  try {
    const data = await apiRequest('/beers', {
      method: 'POST',
      body: JSON.stringify({
        name,
        type,
        rating,
        comment,
        latitude: state.currentPos.lat,
        longitude: state.currentPos.lng,
      }),
    });

    // Ferme la modale
    closeModal();

    // Ajoute le marqueur sur la carte directement (sans recharger tout)
    addMarkerToMap(data.beer);
    state.beers.push(data.beer);

    // Centre la carte sur la nouvelle bière
    state.map.setView([state.currentPos.lat, state.currentPos.lng], 16);

    // Petite notification de succès (optionnel)
    console.log('Bière ajoutée :', data.beer.name);
  } catch (err) {
    showMessage('form-message', err.message);
  } finally {
    document.getElementById('submit-text').classList.remove('hidden');
    document.getElementById('submit-loader').classList.add('hidden');
    btn.disabled = false;
  }
});


// ════════════════════════════════════════════════════════════
//  SUPPRESSION D'UNE BIÈRE
// ════════════════════════════════════════════════════════════

// Accessible depuis le popup (window.deleteBeer pour appel depuis le HTML inline)
window.deleteBeer = async (beerId) => {
  if (!confirm('Supprimer cette bière ?')) return;

  try {
    await apiRequest(`/beers/${beerId}`, { method: 'DELETE' });

    // Recharge la carte
    await loadBeersOnMap();

    // Ferme tous les popups ouverts
    state.map.closePopup();

    // Si on est sur la vue profil, recharge
    const profileVisible = !document.getElementById('view-profile').classList.contains('hidden');
    if (profileVisible) loadProfile();
  } catch (err) {
    alert('Erreur : ' + err.message);
  }
};


// ════════════════════════════════════════════════════════════
//  PROFIL & STATISTIQUES
// ════════════════════════════════════════════════════════════

async function loadProfile() {
  if (!state.user) return;

  // Affiche le nom et l'email de l'utilisateur
  document.getElementById('profile-username').textContent = state.user.username;
  document.getElementById('profile-email').textContent = state.user.email;

  try {
    // Charge les stats
    const stats = await apiRequest('/beers/stats');
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-avg').textContent = stats.total > 0 ? `${stats.avgRating}★` : '-';

    // Affiche les types si on en a
    const typesSection = document.getElementById('types-section');
    if (stats.total > 0 && Object.keys(stats.byType).length > 0) {
      typesSection.style.display = 'block';
      const typesList = document.getElementById('types-list');
      typesList.innerHTML = Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1]) // Trie par quantité
        .map(([type, count]) =>
          `<span class="type-badge">${type} <span class="type-count">${count}</span></span>`
        )
        .join('');
    } else {
      typesSection.style.display = 'none';
    }

    // Charge la liste des bières
    const beers = await apiRequest('/beers?mine=true');
    renderBeerList(beers);
  } catch (err) {
    console.error('Erreur profil:', err);
  }
}

function renderBeerList(beers) {
  const container = document.getElementById('beer-list');

  if (beers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>🍻</span>
        <p>Aucune bière enregistrée pour l'instant.</p>
        <p>Clique sur <strong>+</strong> pour ajouter ta première bière !</p>
      </div>`;
    return;
  }

  container.innerHTML = beers
    .map(
      (beer) => `
      <div class="beer-card">
        <div class="beer-card-info">
          <div class="beer-card-name">${beer.name}</div>
          <div class="beer-card-meta">
            <span>${beer.type}</span>
            <span>·</span>
            <span>${formatDate(beer.createdAt)}</span>
            ${beer.location ? `<span>· ${beer.location}</span>` : ''}
          </div>
          ${beer.comment ? `<div class="beer-card-comment">"${beer.comment}"</div>` : ''}
        </div>
        <div class="beer-card-right">
          <div class="beer-card-stars">${starsHtml(beer.rating)}</div>
          <button class="btn-delete" onclick="deleteBeer('${beer._id}')" title="Supprimer">🗑️</button>
        </div>
      </div>`
    )
    .join('');
}


// ════════════════════════════════════════════════════════════
//  INITIALISATION
// ════════════════════════════════════════════════════════════

function initApp() {
  // Met à jour le profil header si les données existent
  if (state.user) {
    document.getElementById('profile-username').textContent = state.user.username;
    document.getElementById('profile-email').textContent = state.user.email;
  }

  // Initialise la carte Leaflet
  initMap();
}

// Point d'entrée : vérifie si l'utilisateur est connecté
function start() {
  initAuthTabs();
  checkAuth();
}

// Lance l'application
start();