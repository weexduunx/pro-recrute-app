/**
 * Utilitaires pour la gestion sécurisée des tableaux
 */

/**
 * S'assure qu'une valeur est un tableau valide
 * @param data - La donnée à valider
 * @returns Un tableau vide si la donnée n'est pas un tableau, sinon la donnée originale
 */
export const ensureArray = <T>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  return [];
};

/**
 * Filtre sécurisé qui vérifie d'abord si l'array existe
 * @param array - Le tableau à filtrer
 * @param predicate - La fonction de filtrage
 * @returns Un tableau filtré ou un tableau vide si l'array n'est pas valide
 */
export const safeFilter = <T>(
  array: T[] | null | undefined,
  predicate: (item: T) => boolean
): T[] => {
  if (!array || !Array.isArray(array)) return [];
  return array.filter(predicate);
};

/**
 * Compte les éléments qui correspondent à un critère de manière sécurisée
 * @param array - Le tableau à analyser
 * @param predicate - La fonction de test
 * @returns Le nombre d'éléments correspondants
 */
export const safeCount = <T>(
  array: T[] | null | undefined,
  predicate: (item: T) => boolean
): number => {
  if (!array || !Array.isArray(array)) return 0;
  return array.filter(predicate).length;
};

/**
 * Obtient la longueur d'un tableau de manière sécurisée
 * @param array - Le tableau à mesurer
 * @returns La longueur du tableau ou 0 si invalide
 */
export const safeLength = <T>(array: T[] | null | undefined): number => {
  if (!array || !Array.isArray(array)) return 0;
  return array.length;
};