import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Définition du type de traduction
type TranslationMap = { [key: string]: string };

// Définition des traductions
const translations: { [lang: string]: TranslationMap } = {
  fr: {
    // Général
    'Accueil': 'Accueil',
    'Paramètres': 'Paramètres',
    'Déconnexion': 'Déconnexion',
    'Annuler': 'Annuler',
    'Sauvegarder': 'Sauvegarder',
    'Erreur': 'Erreur',
    'Succès': 'Succès',
    'Chargement...': 'Chargement...',
    'Non renseigné': 'Non renseigné',
    'Voir tout': 'Voir tout',

    // Paramètres
    'Préférences': 'Préférences',
    'Langue': 'Langue',
    'Mode sombre': 'Mode sombre',
    'Activer le thème sombre': 'Activer le thème sombre',
    'Synchronisation auto': 'Synchronisation auto',
    'Synchroniser automatiquement les données': 'Synchroniser automatiquement les données',
    'Notifications': 'Notifications',
    'Notifications Push': 'Notifications Push',
    'Recevoir des notifications en temps réel': 'Recevoir des notifications en temps réel',
    'Notifications par email': 'Notifications par e-mail',
    'Recevoir des résumés par email': 'Recevoir des résumés par e-mail',
    'Envoyer notification test': 'Envoyer notification test',
    'Envoyer une notification pour tester': 'Envoyer une notification pour tester',
    'Sécurité': 'Sécurité',
    'Authentification biométrique': 'Authentification biométrique',
    'Utiliser Face ID / Touch ID': 'Utiliser Face ID / Touch ID',
    'Changer le mot de passe': 'Changer le mot de passe',
    'Modifier votre mot de passe': 'Modifier votre mot de passe',
    'Sessions actives': 'Sessions actives',
    'Gérer vos sessions connectées': 'Gérer vos sessions connectées',
    'Compte': 'Compte',
    'Informations personnelles': 'Informations personnelles',
    'Modifier votre profil': 'Modifier votre profil',
    'Confidentialité': 'Confidentialité',
    'Paramètres de confidentialité': 'Paramètres de confidentialité',
    'Exporter mes données': 'Exporter mes données',
    'Télécharger vos données': 'Télécharger vos données',
    'Support': 'Support',
    'Centre d\'aide': 'Centre d\'aide',
    'FAQ et guides d\'utilisation': 'FAQ et guides d\'utilisation',
    'Nous contacter': 'Nous contacter',
    'Obtenir de l\'aide': 'Obtenir de l\'aide',
    'À propos': 'À propos',
    'Informations sur l\'application': 'Informations sur l\'application',
    'Se déconnecter': 'Se déconnecter',
    'Déconnexion...': 'Déconnexion...',
    'Confirmation': 'Confirmation',
    'Êtes-vous sûr de vouloir vous déconnecter ?': 'Êtes-vous sûr de vouloir vous déconnecter ?',

    // Candidatures
    'Mes Candidatures': 'Mes Candidatures',
    'Toutes mes candidatures': 'Toutes mes candidatures',
    'En attente': 'En attente',
    'Acceptée': 'Acceptée',
    'Refusée': 'Refusée',
    'Aucune candidature': 'Aucune candidature',
    'Vos candidatures apparaîtront ici': 'Vos candidatures apparaîtront ici',
    'Chargement de vos candidatures...': 'Chargement de vos candidatures...',
    'Impossible de charger vos candidatures.': 'Impossible de charger vos candidatures.',
    'Retour': 'Retour',
    'Retour aux candidatures': 'Retour aux candidatures',
    'Candidature introuvable': 'Candidature introuvable',
    'Cette candidature n\'existe plus ou n\'est pas accessible.': 'Cette candidature n\'existe plus ou n\'est pas accessible.',
    'Postulé le:': 'Postulé le:',
    'Détails Candidature': 'Détails Candidature',
    'Statut de la candidature': 'Statut de la candidature',
    'Offre d\'emploi': 'Offre d\'emploi',
    'Lieu': 'Lieu',
    'Contrat': 'Contrat',
    'Salaire': 'Salaire',
    'Expérience': 'Expérience',
    'Niveau': 'Niveau',
    'Domaine': 'Domaine',
    'Lettre de motivation': 'Lettre de motivation',
    'Non spécifié': 'Non spécifié',
    'Non disponible': 'Non disponible',
    'N/A': 'N/A',
    'an(s)': 'an(s)',

    // Actualités
    'Actualités': 'Actualités',
    'Toutes les Actualités': 'Toutes les Actualités',
    'Dernières Actualités': 'Dernières Actualités',
    'Chargement des actualités...': 'Chargement des actualités...',
    'Impossible de charger les actualités.': 'Impossible de charger les actualités.',
    'Aucune actualité disponible pour le moment.': 'Aucune actualité disponible pour le moment.',
    'Publié le:': 'Publié le:',
    'Vues:': 'Vues:',
    'Catégorie:': 'Catégorie:',
    'Description non disponible.': 'Description non disponible.',
    'Détails Actualité': 'Détails Actualité',

    // CV & Profil Candidat
    'Mon Profil': 'Mon Profil',
    'Mon CV & Candidat': 'Mon CV & Candidat',
    'Mes informations personnelles': 'Mes informations personnelles',
    'Nom complet': 'Nom complet',
    'Email': 'E-mail',
    'Téléphone': 'Téléphone',
    'Nom': 'Nom',
    'Modifier ces informations': 'Modifier ces informations',
    'Nom complet CV': 'Nom complet CV',
    'Email CV': 'E-mail CV',
    'Téléphone CV': 'Téléphone CV',
    'Résumé': 'Résumé',
    'Résumé professionnel': 'Résumé professionnel',
    'Décrivez votre profil professionnel...': 'Décrivez votre profil professionnel...',
    'Compétences': 'Compétences',
    'Ajouter une compétence': 'Ajouter une compétence',
    'Expérience Professionnelle': 'Expérience Professionnelle',
    'Poste': 'Poste',
    'Entreprise': 'Entreprise',
    'Période': 'Période',
    'Lieu de travail': 'Lieu de travail',
    'Description': 'Description',
    'Formation': 'Formation',
    'Nom de l\'établissement/diplôme': 'Nom de l\'établissement/diplôme',
    'Supprimer': 'Supprimer',
    'Ajouter une expérience': 'Ajouter une expérience',
    'Ajouter une formation': 'Ajouter une formation',
    'Télécharger/Mettre à jour le CV': 'Télécharger/Mettre à jour le CV',
    'Mes informations de CV': 'Mes informations de CV',
    'Chargement des données...': 'Chargement des données...',
    'Aucune donnée CV': 'Aucune donnée CV',
    'Saisissez manuellement vos informations ou téléchargez un CV.': 'Saisissez manuellement vos informations ou téléchargez un CV.',
    'Modifier les données du CV': 'Modifier les données du CV',
    'Saisir les données du CV': 'Saisir les données du CV',
    'Exporter le CV (PDF)': 'Exporter le CV (PDF)',
    'Exportation...': 'Exportation...',
    'Impossible d\'exporter le CV.': 'Impossible d\'exporter le CV.',
    'Aucune donnée de CV à exporter.': 'Aucune donnée de CV à exporter.',
    'Titre de profil': 'Titre de profil',
    'Disponibilité': 'Disponibilité',
    'Statut': 'Statut',
    'En Écoute': 'En Écoute',
    'Indisponible': 'Indisponible',
    'Pas de profil candidat': 'Pas de profil candidat',
    'Créez votre profil candidat pour postuler à des offres.': 'Créez votre profil candidat pour postuler à des offres.',
    'Créer mon profil candidat': 'Créer mon profil candidat',
    'Statut (1: En Écoute, 0: Indisponible)': 'Statut (1: En Écoute, 0: Indisponible)',
  },
  en: {
    // General
    'Accueil': 'Home',
    'Paramètres': 'Settings',
    'Déconnexion': 'Logout',
    'Annuler': 'Cancel',
    'Sauvegarder': 'Save',
    'Erreur': 'Error',
    'Succès': 'Success',
    'Chargement...': 'Loading...',
    'Non renseigné': 'Not specified',
    'Voir tout': 'See all',

    // Settings
    'Préférences': 'Preferences',
    'Langue': 'Language',
    'Mode sombre': 'Dark Mode',
    'Activer le thème sombre': 'Enable dark theme',
    'Synchronisation auto': 'Auto Sync',
    'Synchroniser automatiquement les données': 'Automatically sync data',
    'Notifications': 'Notifications',
    'Notifications Push': 'Push Notifications',
    'Recevoir des notifications en temps réel': 'Receive real-time notifications',
    'Notifications par email': 'Email Notifications',
    'Recevoir des résumés par email': 'Receive email summaries',
    'Envoyer notification test': 'Send test notification',
    'Envoyer une notification pour tester': 'Send a test notification',
    'Sécurité': 'Security',
    'Authentification biométrique': 'Biometric Authentication',
    'Utiliser Face ID / Touch ID': 'Use Face ID / Touch ID',
    'Changer le mot de passe': 'Change password',
    'Modifier votre mot de passe': 'Modify your password',
    'Sessions actives': 'Active Sessions',
    'Gérer vos sessions connectées': 'Manage your connected sessions',
    'Compte': 'Account',
    'Informations personnelles': 'Personal Information',
    'Modifier votre profil': 'Edit your profile',
    'Confidentialité': 'Privacy',
    'Paramètres de confidentialité': 'Privacy settings',
    'Exporter mes données': 'Export my data',
    'Télécharger vos données': 'Download your data',
    'Support': 'Support',
    'Centre d\'aide': 'Help Center',
    'FAQ et guides d\'utilisation': 'FAQ and user guides',
    'Nous contacter': 'Contact Us',
    'Obtenir de l\'aide': 'Get help',
    'À propos': 'About',
    'Informations sur l\'application': 'App information',
    'Se déconnecter': 'Log Out',
    'Déconnexion...': 'Logging out...',
    'Confirmation': 'Confirmation',
    'Êtes-vous sûr de vouloir vous déconnecter ?': 'Are you sure you want to log out?',

    // Applications
    'Mes Candidatures': 'My Applications',
    'Toutes mes candidatures': 'All my applications',
    'En attente': 'Pending',
    'Acceptée': 'Accepted',
    'Refusée': 'Rejected',
    'Aucune candidature': 'No applications',
    'Vos candidatures apparaîtront ici': 'Your applications will appear here',
    'Chargement de vos candidatures...': 'Loading your applications...',
    'Impossible de charger vos candidatures.': 'Unable to load your applications.',
    'Retour': 'Back',
    'Retour aux candidatures': 'Back to applications',
    'Candidature introuvable': 'Application not found',
    'Cette candidature n\'existe plus ou n\'est pas accessible.': 'This application does not exist or is no longer accessible.',
    'Postulé le:': 'Applied on:',
    'Détails Candidature': 'Application Details',
    'Statut de la candidature': 'Application status',
    'Offre d\'emploi': 'Job Offer',
    'Lieu': 'Location',
    'Contrat': 'Contract',
    'Salaire': 'Salary',
    'Expérience': 'Experience',
    'Niveau': 'Level',
    'Domaine': 'Domain',
    'Lettre de motivation': 'Cover Letter',
    'Non spécifié': 'Not specified',
    'Non disponible': 'Not available',
    'N/A': 'N/A',
    'an(s)': 'year(s)',

    // News
    'Actualités': 'News',
    'Toutes les Actualités': 'All News',
    'Dernières Actualités': 'Latest News',
    'Chargement des actualités...': 'Loading news...',
    'Impossible de charger les actualités.': 'Unable to load news.',
    'Aucune actualité disponible pour le moment.': 'No news available at the moment.',
    'Publié le:': 'Published on:',
    'Vues:': 'Views:',
    'Catégorie:': 'Category:',
    'Description non disponible.': 'Description not available.',
    'Détails Actualité': 'News Details',

    // CV & Candidate Profile
    'Mon Profil': 'My Profile',
    'Mon CV & Candidat': 'My CV & Candidate',
    'Mes informations personnelles': 'My personal information',
    'Nom complet': 'Full name',
    'Email': 'Email',
    'Téléphone': 'Phone',
    'Nom': 'Name',
    'Modifier ces informations': 'Edit this information',
    'Nom complet CV': 'CV Full Name',
    'Email CV': 'CV Email',
    'Téléphone CV': 'CV Phone',
    'Résumé': 'Summary',
    'Résumé professionnel': 'Professional Summary',
    'Décrivez votre profil professionnel...': 'Describe your professional profile...',
    'Compétences': 'Skills',
    'Ajouter une compétence': 'Add a skill',
    'Expérience Professionnelle': 'Professional Experience',
    'Poste': 'Position',
    'Entreprise': 'Company',
    'Période': 'Period',
    'Lieu de travail': 'Work location',
    'Description': 'Description',
    'Formation': 'Education',
    'Nom de l\'établissement/diplôme': 'Institution/Degree Name',
    'Supprimer': 'Delete',
    'Ajouter une expérience': 'Add experience',
    'Ajouter une formation': 'Add education',
    'Télécharger/Mettre à jour le CV': 'Upload/Update CV',
    'Mes informations de CV': 'My CV Information',
    'Chargement des données...': 'Loading data...',
    'Aucune donnée CV': 'No CV data',
    'Saisissez manuellement vos informations ou téléchargez un CV.': 'Enter your information manually or upload a CV.',
    'Modifier les données du CV': 'Edit CV data',
    'Saisir les données du CV': 'Enter CV data',
    'Exporter le CV (PDF)': 'Export CV (PDF)',
    'Exportation...': 'Exporting...',
    'Impossible d\'exporter le CV.': 'Unable to export CV.',
    'Aucune donnée de CV à exporter.': 'No CV data to export.',
    'Titre de profil': 'Profile Title',
    'Disponibilité': 'Availability',
    'Statut': 'Status',
    'En Écoute': 'Available',
    'Indisponible': 'Unavailable',
    'Pas de profil candidat': 'No candidate profile',
    'Créez votre profil candidat pour postuler à des offres.': 'Create your candidate profile to apply for offers.',
    'Créer mon profil candidat': 'Create my candidate profile',
    'Statut (1: En Écoute, 0: Indisponible)': 'Status (1: Available, 0: Unavailable)',
  },
  ar: {
    // General (Arabic, RTL support might need more adjustments)
    'Accueil': 'الرئيسية',
    'Paramètres': 'الإعدادات',
    'Déconnexion': 'تسجيل الخروج',
    'Annuler': 'إلغاء',
    'Sauvegarder': 'حفظ',
    'Erreur': 'خطأ',
    'Succès': 'نجاح',
    'Chargement...': 'جاري التحميل...',
    'Non renseigné': 'غير محدد',
    'Voir tout': 'عرض الكل',

    // Settings
    'Préférences': 'التفضيلات',
    'Langue': 'اللغة',
    'Mode sombre': 'الوضع الداكن',
    'Activer le thème sombre': 'تفعيل الوضع الداكن',
    'Synchronisation auto': 'المزامنة التلقائية',
    'Synchroniser automatiquement les données': 'مزامنة البيانات تلقائيًا',
    'Notifications': 'الإشعارات',
    'Notifications Push': 'إشعارات الدفع',
    'Recevoir des notifications en temps réel': 'استلام الإشعارات في الوقت الفعلي',
    'Notifications par email': 'إشعارات البريد الإلكتروني',
    'Recevoir des résumés par email': 'استلام ملخصات عبر البريد الإلكتروني',
    'Envoyer notification test': 'إرسال إشعار تجريبي',
    'Envoyer une notification pour tester': 'إرسال إشعار لاختبار',
    'Sécurité': 'الأمان',
    'Authentification biométrique': 'المصادقة البيومترية',
    'Utiliser Face ID / Touch ID': 'استخدام Face ID / Touch ID',
    'Changer le mot de passe': 'تغيير كلمة المرور',
    'Modifier votre mot de passe': 'تعديل كلمة المرور الخاصة بك',
    'Sessions actives': 'الجلسات النشطة',
    'Gérer vos sessions connectées': 'إدارة جلساتك المتصلة',
    'Compte': 'الحساب',
    'Informations personnelles': 'المعلومات الشخصية',
    'Modifier votre profil': 'تعديل ملفك الشخصي',
    'Confidentialité': 'الخصوصية',
    'Paramètres de confidentialité': 'إعدادات الخصوصية',
    'Exporter mes données': 'تصدير بياناتي',
    'Télécharger vos données': 'تحميل بياناتك',
    'Support': 'الدعم',
    'Centre d\'aide': 'مركز المساعدة',
    'FAQ et guides d\'utilisation': 'الأسئلة الشائعة وأدلة المستخدم',
    'Nous contacter': 'اتصل بنا',
    'Obtenir de l\'aide': 'الحصول على المساعدة',
    'À propos': 'حول التطبيق',
    'Informations sur l\'application': 'معلومات عن التطبيق',
    'Se déconnecter': 'تسجيل الخروج',
    'Déconnexion...': 'جاري تسجيل الخروج...',
    'Confirmation': 'تأكيد',
    'Êtes-vous sûr de vouloir vous déconnecter ?': 'هل أنت متأكد أنك تريد تسجيل الخروج؟',

    // Applications
    'Mes Candidatures': 'طلباتي',
    'Toutes mes candidatures': 'جميع طلباتي',
    'En attente': 'في الانتظار',
    'Acceptée': 'مقبولة',
    'Refusée': 'مرفوضة',
    'Aucune candidature': 'لا توجد طلبات',
    'Vos candidatures apparaîtront ici': 'ستظهر طلباتك هنا',
    'Chargement de vos candidatures...': 'جاري تحميل طلباتك...',
    'Impossible de charger vos candidatures.': 'لا يمكن تحميل طلباتك.',
    'Retour': 'رجوع',
    'Retour aux candidatures': 'العودة إلى الطلبات',
    'Candidature introuvable': 'لم يتم العثور على الطلب',
    'Cette candidature n\'existe plus ou n\'est pas accessible.': 'هذا الطلب لم يعد موجودًا أو غير متاح.',
    'Postulé le:': 'تم التقديم في:',
    'Détails Candidature': 'تفاصيل الطلب',
    'Statut de la candidature': 'حالة الطلب',
    'Offre d\'emploi': 'عرض عمل',
    'Lieu': 'الموقع',
    'Contrat': 'العقد',
    'Salaire': 'الراتب',
    'Expérience': 'الخبرة',
    'Niveau': 'المستوى',
    'Domaine': 'المجال',
    'Lettre de motivation': 'رسالة تغطية',
    'Non spécifié': 'غير محدد',
    'Non disponible': 'غير متوفر',
    'N/A': 'غير متاح',
    'an(s)': 'سنة/سنوات',

    // Actualités
    'Actualités': 'الأخبار',
    'Toutes les Actualités': 'جميع الأخبار',
    'Dernières Actualités': 'آخر الأخبار',
    'Chargement des actualités...': 'جاري تحميل الأخبار...',
    'Impossible de charger les actualités.': 'لا يمكن تحميل الأخبار.',
    'Aucune actualité disponible pour le moment.': 'لا توجد أخبار متاحة حاليا.',
    'Publié le:': 'نشر في:',
    'Vues:': 'المشاهدات:',
    'Catégorie:': 'الفئة:',
    'Description non disponible.': 'الوصف غير متاح.',
    'Détails Actualité': 'تفاصيل الخبر',

    // CV & Candidat Profile
    'Mon Profil': 'ملفي الشخصي',
    'Mon CV & Candidat': 'سيرتي الذاتية والمترشح',
    'Mes informations personnelles': 'معلوماتي الشخصية',
    'Nom complet': 'الاسم الكامل',
    'Email': 'البريد الإلكتروني',
    'Téléphone': 'الهاتف',
    'Nom': 'الاسم',
    'Modifier ces informations': 'تعديل هذه المعلومات',
    'Nom complet CV': 'الاسم الكامل في السيرة الذاتية',
    'Email CV': 'البريد الإلكتروني في السيرة الذاتية',
    'Téléphone CV': 'الهاتف في السيرة الذاتية',
    'Résumé': 'الملخص',
    'Résumé professionnel': 'الملخص المهني',
    'Décrivez votre profil professionnel...': 'صف ملفك المهني...',
    'Compétences': 'المهارات',
    'Ajouter une compétence': 'إضافة مهارة',
    'Expérience Professionnelle': 'الخبرة المهنية',
    'Poste': 'المنصب',
    'Entreprise': 'الشركة',
    'Période': 'الفترة',
    'Lieu de travail': 'مكان العمل',
    'Description': 'الوصف',
    'Formation': 'التعليم',
    'Nom de l\'établissement/diplôme': 'اسم المؤسسة/الشهادة',
    'Supprimer': 'حذف',
    'Ajouter une expérience': 'إضافة خبرة',
    'Ajouter une formation': 'إضافة تعليم',
    'Télécharger/Mettre à jour le CV': 'تحميل/تحديث السيرة الذاتية',
    'Mes informations de CV': 'معلومات سيرتي الذاتية',
    'Chargement des données...': 'جاري تحميل البيانات...',
    'Aucune donnée CV': 'لا توجد بيانات سيرة ذاتية',
    'Saisissez manuellement vos informations ou téléchargez un CV.': 'أدخل معلوماتك يدويًا أو قم بتحميل سيرة ذاتية.',
    'Modifier les données du CV': 'تعديل بيانات السيرة الذاتية',
    'Saisir les données du CV': 'إدخال بيانات السيرة الذاتية',
    'Exporter le CV (PDF)': 'تصدير السيرة الذاتية (PDF)',
    'Exportation...': 'جاري التصدير...',
    'Impossible d\'exporter le CV.': 'لا يمكن تصدير السيرة الذاتية.',
    'Aucune donnée de CV à exporter.': 'لا توجد بيانات سيرة ذاتية لتصديرها.',
    'Titre de profil': 'عنوان الملف الشخصي',
    'Disponibilité': 'التوفر',
    'Statut': 'الحالة',
    'En Écoute': 'متاح',
    'Indisponible': 'غير متاح',
    'Pas de profil candidat': 'لا يوجد ملف مرشح',
    'Créez votre profil candidat pour postuler à des offres.': 'أنشئ ملفك الشخصي كمرشح للتقدم للوظائف.',
    'Créer mon profil candidat': 'إنشاء ملفي الشخصي كمرشح',
    'Statut (1: En Écoute, 0: Indisponible)': 'الحالة (1: متاح، 0: غير متاح)',
  },
};

// Interface pour le contexte de langue
interface LanguageContextType {
  language: string; // 'fr', 'en', 'ar'
  setLanguage: (lang: string) => void;
  t: (key: string) => string; // Fonction de traduction
}

// Création du contexte avec des valeurs par défaut
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Clé pour AsyncStorage
const ASYNC_STORAGE_KEY_LANG = '@app_language_mode';

// Fournisseur de langue
interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Langue par défaut : français
  const [language, setLanguageState] = useState('fr');

  // Charger la langue préférée de l'utilisateur depuis AsyncStorage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem(ASYNC_STORAGE_KEY_LANG);
        if (storedLang && ['fr', 'en', 'ar'].includes(storedLang)) {
          setLanguageState(storedLang);
        } else {
          // Définir la langue par défaut du système si aucune préférence n'est stockée et que la détection système est possible
          // Pour l'instant, on reste sur 'fr' si rien n'est stocké
          setLanguageState('fr'); 
        }
      } catch (e) {
        console.error("Failed to load language from AsyncStorage", e);
      }
    };
    loadLanguage();
  }, []);

  // Fonction pour changer la langue et la sauvegarder
  const setLanguage = useCallback(async (lang: string) => {
    if (['fr', 'en', 'ar'].includes(lang)) {
      setLanguageState(lang);
      try {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEY_LANG, lang);
      } catch (e) {
        console.error("Failed to save language to AsyncStorage", e);
      }
    } else {
      console.warn("Langue non supportée:", lang);
    }
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language as keyof typeof translations][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Hook personnalisé pour utiliser la langue
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
