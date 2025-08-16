// ========================================
// SECTIONS SAUVEGARDÉES DE L'INDEX INTÉRIMAIRE
// ========================================
// Ces sections ont été retirées du dashboard principal mais conservées ici
// pour une utilisation future si nécessaire

// Section Récap IPM (renderIpmRecap)
const renderIpmRecapBackup = () => {
  // Calculer le total et le pourcentage pour la barre de progression globale
  const totalConsultations = ipmRecap.reduce((sum, item) => sum + item.consultations, 0);
  const totalSoins = ipmRecap.reduce((sum, item) => sum + item.soins, 0);
  const totalMedicaments = ipmRecap.reduce((sum, item) => sum + item.medicaments, 0);
  const totalProtheses = ipmRecap.reduce((sum, item) => sum + item.protheses, 0);
  const totalExamens = ipmRecap.reduce((sum, item) => sum + item.examens, 0);

  const overallTotal = totalConsultations + totalSoins + totalMedicaments + totalProtheses + totalExamens;
  const overallCovered = ipmRecap.reduce((sum, item) => sum + item.remboursement, 0);
  const completionPercentage = overallTotal > 0 ? (overallCovered / overallTotal) * 100 : 0;

  const getMonthName = (monthNum: number) => {
    const date = new Date(2000, monthNum - 1, 1);
    return date.toLocaleString('fr-FR', { month: 'long' });
  };

  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
      {/* Header avec design épuré */}
      <View style={styles.sectionHeaderInner}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitleInner, { color: colors.textPrimary }]}>
          Votre Recap IPM
        </Text>
      </View>

      {loadingIpmRecap ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIndicator, { backgroundColor: colors.primary + '10' }]}>
            <ActivityIndicator size="small" color={colors.secondary} />
          </View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement du récap IPM...
          </Text>
        </View>
      ) : errorIpmRecap ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '08' }]}>
          <View style={[styles.errorIconContainer, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          </View>
          <Text style={[styles.errorText, { color: colors.error }]}>{errorIpmRecap}</Text>
        </View>
      ) : ipmRecap.length === 0 && !tauxRetenu && !tauxRemboursse ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background + '50' }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.secondary + '15' }]}>
            <Ionicons name="document-outline" size={20} color={colors.secondary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucun récap IPM disponible pour le moment.
          </Text>
        </View>
      ) : (
        <View style={styles.recapContent}>
          {/* Affichage des taux si disponibles */}
          {(tauxRetenu || tauxRemboursse) && (
            <View style={[styles.tauxContainer, { backgroundColor: colors.primary + '08' }]}>
              <View style={styles.tauxRow}>
                {tauxRetenu && (
                  <View style={styles.tauxItem}>
                    <Text style={[styles.tauxLabel, { color: colors.textSecondary }]}>Taux Retenu</Text>
                    <Text style={[styles.tauxValue, { color: colors.error }]}>{tauxRetenu}</Text>
                  </View>
                )}
                {tauxRemboursse && (
                  <View style={styles.tauxItem}>
                    <Text style={[styles.tauxLabel, { color: colors.textSecondary }]}>Taux Remboursé</Text>
                    <Text style={[styles.tauxValue, { color: colors.success }]}>{tauxRemboursse}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Progress bar globale */}
          <View style={[styles.progressContainer, { backgroundColor: colors.background + '30' }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Avancement global IPM
              </Text>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>
                {completionPercentage.toFixed(1)}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.background + '50' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: colors.success,
                    width: `${Math.min(completionPercentage, 100)}%`
                  }
                ]} 
              />
            </View>
          </View>

          {/* Liste des récaps par mois */}
          <FlatList
            data={ipmRecap}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recapList}
            keyExtractor={(item) => `${item.annee}-${item.mois}`}
            renderItem={({ item }) => {
              const monthTotal = item.consultations + item.soins + item.medicaments + item.protheses + item.examens;
              const monthPercentage = monthTotal > 0 ? (item.remboursement / monthTotal) * 100 : 0;
              
              return (
                <View style={[styles.recapCard, { backgroundColor: colors.background + '30' }]}>
                  <View style={styles.recapCardHeader}>
                    <Text style={[styles.recapMonth, { color: colors.textPrimary }]}>
                      {getMonthName(item.mois)}
                    </Text>
                    <Text style={[styles.recapYear, { color: colors.textSecondary }]}>
                      {item.annee}
                    </Text>
                  </View>
                  
                  <View style={styles.recapStats}>
                    <View style={styles.recapStatItem}>
                      <Text style={[styles.recapStatValue, { color: colors.success }]}>
                        {item.remboursement?.toLocaleString() || '0'} FCFA
                      </Text>
                      <Text style={[styles.recapStatLabel, { color: colors.textSecondary }]}>
                        Remboursé
                      </Text>
                    </View>
                    
                    <View style={styles.recapStatItem}>
                      <Text style={[styles.recapStatValue, { color: colors.error }]}>
                        {item.retenu?.toLocaleString() || '0'} FCFA
                      </Text>
                      <Text style={[styles.recapStatLabel, { color: colors.textSecondary }]}>
                        Retenu
                      </Text>
                    </View>
                  </View>
                  
                  {/* Mini progress bar pour ce mois */}
                  <View style={[styles.miniProgressBar, { backgroundColor: colors.background + '50' }]}>
                    <View 
                      style={[
                        styles.miniProgressFill, 
                        { 
                          backgroundColor: monthPercentage > 80 ? colors.success : 
                                          monthPercentage > 50 ? colors.warning : colors.error,
                          width: `${Math.min(monthPercentage, 100)}%`
                        }
                      ]} 
                    />
                  </View>
                  
                  <Text style={[styles.recapCardPercentage, { color: colors.textSecondary }]}>
                    {monthPercentage.toFixed(1)}%
                  </Text>
                  
                  {item.name && (
                    <Text style={[styles.recapSociety, { color: colors.textSecondary }]}>
                      {item.name}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
};

// Section Structures Affiliées (renderAffiliatedStructures)
const renderAffiliatedStructuresBackup = () => {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.sectionHeaderInner}>
        <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '15' }]}>
          <FontAwesome6 name="house-medical" size={16} color={colors.secondary} />
        </View>
        <Text style={[styles.sectionTitleInner, { color: colors.textPrimary }]}>
          Structures Affiliées
        </Text>
      </View>

      {loadingStructures ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingIndicator, { backgroundColor: colors.primary + '10' }]}>
            <ActivityIndicator size="small" color={colors.secondary} />
          </View>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des structures...
          </Text>
        </View>
      ) : errorStructures ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '08' }]}>
          <View style={[styles.errorIconContainer, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          </View>
          <Text style={[styles.errorText, { color: colors.error }]}>{errorStructures}</Text>
        </View>
      ) : affiliatedStructures.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background + '50' }]}>
          <View style={[styles.emptyIconContainer, { backgroundColor: colors.secondary + '15' }]}>
            <FontAwesome6 name="house-medical" size={20} color={colors.secondary} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucune structure affiliée trouvée.
          </Text>
        </View>
      ) : (
        <View style={styles.structuresContent}>
          <FlatList
            data={affiliatedStructures}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.structuresList}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={[styles.structureCard, { backgroundColor: colors.background + '30' }]}>
                <View style={styles.structureCardHeader}>
                  <View style={[styles.structureTypeIcon, { backgroundColor: colors.secondary + '15' }]}>
                    <FontAwesome6 name="house-medical" size={14} color={colors.secondary} />
                  </View>
                  <Text style={[styles.structureType, { color: colors.textSecondary }]}>
                    {item.type || 'Clinique'}
                  </Text>
                </View>
                
                <Text style={[styles.structureName, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.name}
                </Text>
                
                <View style={styles.structureDetails}>
                  <View style={styles.structureDetailItem}>
                    <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                    <Text style={[styles.structureDetailText, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.region}
                    </Text>
                  </View>
                  
                  {item.tel && (
                    <View style={styles.structureDetailItem}>
                      <Ionicons name="call-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.structureDetailText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.tel}
                      </Text>
                    </View>
                  )}
                  
                  {item.PersonneRessource && (
                    <View style={styles.structureDetailItem}>
                      <Ionicons name="person-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.structureDetailText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.PersonneRessource}
                      </Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity 
                  style={[styles.structureViewButton, { backgroundColor: colors.primary + '15' }]}
                  onPress={() => router.push(`/(app)/(interimaire)/structure-details?id=${item.id}`)}
                >
                  <Text style={[styles.structureViewButtonText, { color: colors.primary }]}>
                    Voir détails
                  </Text>
                  <Ionicons name="arrow-forward-outline" size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          />
          
          {hasMoreStructures && (
            <TouchableOpacity 
              style={[styles.loadMoreButton, { backgroundColor: colors.primary + '10' }]}
              onPress={handleLoadMoreStructures}
              disabled={loadingMoreStructures}
            >
              {loadingMoreStructures ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                    Charger plus
                  </Text>
                  <Ionicons name="chevron-down-outline" size={16} color={colors.primary} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// États pour les sections sauvegardées
/*
  const [ipmRecap, setIpmRecap] = useState<IpmRecap[]>([]);
  const [loadingIpmRecap, setLoadingIpmRecap] = useState(true);
  const [errorIpmRecap, setErrorIpmRecap] = useState<string | null>(null);
  const [tauxRetenu, setTauxRetenu] = useState<string | null>(null);
  const [tauxRemboursse, setTauxRemboursse] = useState<string | null>(null);

  const [affiliatedStructures, setAffiliatedStructures] = useState<Structure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [errorStructures, setErrorStructures] = useState<string | null>(null);
  const [structuresPage, setStructuresPage] = useState(1);
  const [hasMoreStructures, setHasMoreStructures] = useState(true);
  const [loadingMoreStructures, setLoadingMoreStructures] = useState(false);
*/

// Fonctions de chargement des données sauvegardées
/*
  const loadIpmRecap = useCallback(async () => {
    if (!user) {
      setIpmRecap([]);
      setTauxRetenu(null);
      setTauxRemboursse(null);
      setLoadingIpmRecap(false);
      return;
    }
    setLoadingIpmRecap(true);
    setErrorIpmRecap(null);
    try {
      const response = await getIpmRecapByMonth();
      setIpmRecap(response.recap_ipm || []);
      setTauxRetenu(response.taux_retenu || null);
      setTauxRemboursse(response.taux_remboursse || null);
    } catch (err: any) {
      console.error("Erreur de chargement du récap IPM:", err);
      setErrorIpmRecap(err.message || "Impossible de charger l'état d'avancement IPM.");
      setIpmRecap([]);
      setTauxRetenu(null);
      setTauxRemboursse(null);
    } finally {
      setLoadingIpmRecap(false);
    }
  }, [user]);

  const loadAffiliatedStructures = useCallback(async (page = 1, append = false) => {
    if (!user) {
      setAffiliatedStructures([]);
      setLoadingStructures(false);
      setLoadingMoreStructures(false);
      setHasMoreStructures(false);
      return;
    }

    if (page === 1) {
      setLoadingStructures(true);
    } else {
      setLoadingMoreStructures(true);
    }

    setErrorStructures(null);

    try {
      const response = await getAffiliatedStructures(page, 3);
      const structures = response.data;
      const currentPage = response.current_page;
      const lastPage = response.last_page;

      if (append) {
        setAffiliatedStructures(prev => {
          const newStructures = structures.filter(
            (newItem: Structure) => !prev.some(existingItem => existingItem.id === newItem.id)
          );
          return [...prev, ...newStructures];
        });
      } else {
        setAffiliatedStructures(structures);
      }

      setStructuresPage(currentPage);
      setHasMoreStructures(currentPage < lastPage);

    } catch (err: any) {
      console.error("Erreur de chargement des structures affiliées:", err);
      setErrorStructures(err.message || "Impossible de charger les structures affiliées.");
    } finally {
      setLoadingStructures(false);
      setLoadingMoreStructures(false);
    }
  }, [user]);
*/