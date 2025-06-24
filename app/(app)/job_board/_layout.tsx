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
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, 
        }}
      />
      <Stack.Screen
        name="job_details"
        options={{
          headerShown: false, 
        }}
      />
    </Stack>
  );
}
