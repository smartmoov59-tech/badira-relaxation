/* ------------------------------------------------------------------
   BADIRA — réglages du site (seul fichier à modifier pour les infos)
   Site statique : aucune donnée n'est envoyée nulle part.
   La réservation prépare un SMS / un appel / un fichier agenda (.ics).
------------------------------------------------------------------- */
window.BADIRA = {
  nom: "Badira",
  praticienne: "Christine Joyeux",

  // Contact (source : fiche Google Maps « Badira » + PagesJaunes)
  telephone: "+33660574678",
  telephoneAffiche: "06 60 57 46 78",
  adresse: "86 Rue du Vieux Château, 84240 La Tour-d'Aigues",
  instagram: "https://www.instagram.com/badira_relaxation/",

  // Horaires (source : fiche Google Maps) — 0 = dimanche … 6 = samedi
  // [ouverture, fermeture] en heures décimales. null = fermé.
  horaires: {
    0: null,
    1: [9, 13],
    2: [9, 13],
    3: [9, 19],
    4: [9, 19],
    5: [9, 19],
    6: [9, 17]
  },

  // TARIFS ET DURÉES — non publiés sur Instagram / Google / PagesJaunes.
  // Renseignez ici (ex. "60 €", "1 h") : ils s'affichent automatiquement
  // sur les cartes et dans le formulaire. Laisser null = « sur demande ».
  soins: {
    relax:    { nom: "Massage relaxation sur-mesure",         prix: null, duree: null },
    corps:    { nom: "Madothérapie corps · démarche silhouette", prix: null, duree: null },
    visage:   { nom: "Madothérapie visage",                    prix: null, duree: null },
    sport:    { nom: "Récupération physique et sportive",      prix: null, duree: null },
    drainant: { nom: "Massage drainant",                       prix: null, duree: null }
  }
};
