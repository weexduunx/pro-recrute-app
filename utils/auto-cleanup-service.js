// utils/auto-cleanup-service.js
// Service pour la suppression automatique des comptes candidats inactifs
import api from './api';

export class AutoCleanupService {
  // Configuration
  static INACTIVITY_THRESHOLD_DAYS = 90;
  static CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
  static BATCH_SIZE = 50; // Nombre de comptes à traiter par batch

  // Types de rôles cibles pour la suppression automatique
  static TARGET_ROLES = ['user']; // Seulement les candidats (pas les admins ou intérimaires)

  // Statistiques de nettoyage
  static cleanupStats = {
    lastRun: null,
    totalProcessed: 0,
    totalDeleted: 0,
    errors: 0,
  };

  /**
   * Obtenir la liste des comptes inactifs candidats pour suppression
   */
  static async getInactiveCandidateAccounts(page = 1, limit = this.BATCH_SIZE) {
    try {
      console.log('=== CLEANUP: Récupération des comptes inactifs START ===');
      
      const response = await api.get('/admin/inactive-accounts', {
        params: {
          roles: this.TARGET_ROLES,
          inactivity_days: this.INACTIVITY_THRESHOLD_DAYS,
          page,
          limit
        }
      });

      console.log('=== CLEANUP: Récupération des comptes inactifs SUCCESS ===');
      console.log(`Comptes inactifs trouvés: ${response.data.data?.length || 0}`);
      
      return response.data;
    } catch (error) {
      console.error('=== CLEANUP: Erreur lors de la récupération des comptes inactifs ===');
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      throw error;
    }
  }

  /**
   * Supprimer un compte candidat inactif
   */
  static async deleteInactiveCandidateAccount(userId, userData) {
    try {
      console.log(`=== CLEANUP: Suppression du compte utilisateur ${userId} START ===`);
      
      const response = await api.delete(`/admin/user/${userId}/auto-delete`, {
        data: {
          reason: 'inactivity',
          inactivity_days: userData.inactivity_days,
          last_login: userData.last_login,
          auto_cleanup: true
        }
      });

      console.log(`=== CLEANUP: Suppression du compte ${userId} SUCCESS ===`);
      return response.data;
    } catch (error) {
      console.error(`=== CLEANUP: Erreur lors de la suppression du compte ${userId} ===`);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      throw error;
    }
  }

  /**
   * Envoyer une notification d'alerte avant suppression
   */
  static async sendPreDeletionAlert(userId, userData, daysRemaining) {
    try {
      console.log(`=== CLEANUP: Envoi d'alerte pré-suppression pour ${userId} ===`);
      
      const response = await api.post(`/admin/user/${userId}/deletion-alert`, {
        alert_type: 'pre_deletion',
        days_remaining: daysRemaining,
        inactivity_days: userData.inactivity_days,
        scheduled_deletion: new Date(Date.now() + (daysRemaining * 24 * 60 * 60 * 1000))
      });

      console.log(`=== CLEANUP: Alerte envoyée pour ${userId} ===`);
      return response.data;
    } catch (error) {
      console.error(`=== CLEANUP: Erreur lors de l'envoi d'alerte pour ${userId} ===`);
      throw error;
    }
  }

  /**
   * Enregistrer les statistiques de nettoyage
   */
  static async logCleanupStats(stats) {
    try {
      const response = await api.post('/admin/cleanup-stats', {
        timestamp: Date.now(),
        stats: stats
      });
      
      console.log('=== CLEANUP: Statistiques enregistrées ===');
      return response.data;
    } catch (error) {
      console.error('=== CLEANUP: Erreur lors de l\'enregistrement des statistiques ===');
      // Ne pas faire échouer le processus pour les stats
    }
  }

  /**
   * Processus principal de nettoyage automatique
   */
  static async runAutoCleanup() {
    console.log('=== DÉMARRAGE DU NETTOYAGE AUTOMATIQUE ===');
    const startTime = Date.now();
    
    let totalProcessed = 0;
    let totalDeleted = 0;
    let totalErrors = 0;
    let currentPage = 1;
    let hasMoreData = true;

    try {
      while (hasMoreData) {
        console.log(`=== CLEANUP: Traitement de la page ${currentPage} ===`);
        
        // Récupérer le batch d'utilisateurs inactifs
        const inactiveAccountsResponse = await this.getInactiveCandidateAccounts(
          currentPage, 
          this.BATCH_SIZE
        );

        const inactiveAccounts = inactiveAccountsResponse.data || [];
        const pagination = inactiveAccountsResponse.pagination || {};
        
        if (inactiveAccounts.length === 0) {
          console.log('=== CLEANUP: Aucun compte inactif trouvé ===');
          hasMoreData = false;
          break;
        }

        // Traiter chaque compte
        for (const account of inactiveAccounts) {
          totalProcessed++;
          
          try {
            console.log(`Traitement du compte: ${account.id} (${account.email})`);
            console.log(`Jours d'inactivité: ${account.inactivity_days}`);

            // Vérifier si le compte doit être supprimé
            if (account.inactivity_days >= this.INACTIVITY_THRESHOLD_DAYS) {
              // Supprimer le compte
              await this.deleteInactiveCandidateAccount(account.id, account);
              totalDeleted++;
              
              console.log(`✅ Compte ${account.id} supprimé avec succès`);
            } else {
              console.log(`⏳ Compte ${account.id} pas encore prêt pour suppression`);
            }

          } catch (error) {
            totalErrors++;
            console.error(`❌ Erreur lors du traitement du compte ${account.id}:`, error.message);
            
            // Continuer avec les autres comptes même en cas d'erreur
            continue;
          }
        }

        // Vérifier s'il y a plus de données
        hasMoreData = pagination.current_page < pagination.total_pages;
        currentPage++;

        // Pause entre les batches pour éviter la surcharge
        if (hasMoreData) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Mettre à jour les statistiques globales
      this.cleanupStats = {
        lastRun: new Date().toISOString(),
        totalProcessed,
        totalDeleted,
        errors: totalErrors,
      };

      // Enregistrer les statistiques
      await this.logCleanupStats({
        processed: totalProcessed,
        deleted: totalDeleted,
        errors: totalErrors,
        duration: Date.now() - startTime,
        threshold_days: this.INACTIVITY_THRESHOLD_DAYS,
        target_roles: this.TARGET_ROLES
      });

      console.log('=== NETTOYAGE AUTOMATIQUE TERMINÉ ===');
      console.log(`Comptes traités: ${totalProcessed}`);
      console.log(`Comptes supprimés: ${totalDeleted}`);
      console.log(`Erreurs: ${totalErrors}`);
      console.log(`Durée: ${(Date.now() - startTime) / 1000}s`);

      return {
        success: true,
        processed: totalProcessed,
        deleted: totalDeleted,
        errors: totalErrors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      console.error('=== ERREUR CRITIQUE LORS DU NETTOYAGE AUTOMATIQUE ===');
      console.error(error);
      
      return {
        success: false,
        error: error.message,
        processed: totalProcessed,
        deleted: totalDeleted,
        errors: totalErrors + 1
      };
    }
  }

  /**
   * Démarrer le service de nettoyage automatique avec intervalle
   */
  static startAutoCleanupService() {
    console.log('=== DÉMARRAGE DU SERVICE DE NETTOYAGE AUTOMATIQUE ===');
    console.log(`Intervalle: ${this.CLEANUP_INTERVAL / 1000 / 60 / 60} heures`);
    console.log(`Seuil d'inactivité: ${this.INACTIVITY_THRESHOLD_DAYS} jours`);
    console.log(`Rôles cibles: ${this.TARGET_ROLES.join(', ')}`);

    // Exécuter immédiatement
    this.runAutoCleanup().catch(error => {
      console.error('Erreur lors de l\'exécution initiale du nettoyage:', error);
    });

    // Planifier les exécutions récurrentes
    const intervalId = setInterval(() => {
      this.runAutoCleanup().catch(error => {
        console.error('Erreur lors de l\'exécution planifiée du nettoyage:', error);
      });
    }, this.CLEANUP_INTERVAL);

    console.log('Service de nettoyage automatique démarré');
    
    return intervalId;
  }

  /**
   * Arrêter le service de nettoyage automatique
   */
  static stopAutoCleanupService(intervalId) {
    if (intervalId) {
      clearInterval(intervalId);
      console.log('Service de nettoyage automatique arrêté');
    }
  }

  /**
   * Obtenir les statistiques de nettoyage
   */
  static getCleanupStats() {
    return this.cleanupStats;
  }

  /**
   * Test du service (pour développement uniquement)
   */
  static async testCleanupService() {
    console.log('=== TEST DU SERVICE DE NETTOYAGE ===');
    
    try {
      // Test de récupération des comptes inactifs
      const inactiveAccounts = await this.getInactiveCandidateAccounts(1, 5);
      console.log('Test récupération comptes:', inactiveAccounts);

      return { success: true, data: inactiveAccounts };
    } catch (error) {
      console.error('Test échoué:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AutoCleanupService;