import { Stack } from 'expo-router';
import React from 'react';

/**
 * Layout imbriqué pour l'onglet "Offres d'emploi".
 * Gère la navigation au sein de cet onglet (par exemple, vers les détails d'une offre).
 * Par défaut, les écrans de cette pile s'ouvriront au-dessus du contenu de l'onglet,
 * mais la barre d'onglets restera visible.
 */
export default function JobBoardStackLayout() {
  return (
    <Stack>
      {/* job_board/index.tsx est l'écran par défaut de cet onglet */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Masquer l'en-tête pour l'écran principal de l'onglet
        }}
      />
      {/* job_board/job_details.tsx est un écran dans la pile de cet onglet */}
      <Stack.Screen
        name="job_details"
        options={{
          headerShown: false, // Masquer l'en-tête de la page de détails (gérée par le composant lui-même)
          // `presentation: 'modal'` pourrait masquer la barre d'onglets si souhaité,
          // mais le comportement standard pour les piles imbriquées est de la garder visible.
          // presentation: 'modal', // Décommenter si vous voulez cacher les onglets pour les détails
        }}
      />
    </Stack>
  );
}
