/**
 * Génère 3 variantes d'email probables à partir du prénom, nom et domaine.
 * Utilisé quand aucun email vérifié n'est disponible.
 */
export function generateEmailVariants(
  firstName: string,
  lastName: string,
  domain: string
): [string, string, string] {
  const f = normalize(firstName)
  const l = normalize(lastName)

  return [
    `${f}.${l}@${domain}`,       // prenom.nom@   (le plus courant ~45%)
    `${f[0]}.${l}@${domain}`,    // p.nom@        (~25%)
    `${f}@${domain}`,            // prenom@       (~15%)
  ]
}

/** Supprime accents, espaces, tirets — garde uniquement a-z */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // supprime les accents
    .replace(/[^a-z0-9]/g, "")       // supprime tout sauf lettres/chiffres
}
