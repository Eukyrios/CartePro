/**
 * Le texte des CGU, transcrit du document de référence.
 *
 * La source est `docs/03_Projet_CGU_Ticket_Tout.docx` : c'est lui qui part au
 * service juridique, c'est donc lui qui fait foi. Ce fichier en est la copie
 * lisible par le navigateur — et cette dualité est le vrai coût de la page :
 * une correction dans le .docx doit être reportée ici, sinon le site affirme
 * autre chose que ce que l'administration a visé. À la première divergence, la
 * bonne réponse sera de générer ce fichier depuis le .docx plutôt que de le
 * tenir à la main.
 *
 * Servir le .docx tel quel depuis /public a été écarté : un lien de pied de
 * page qui télécharge un Word ne se lit ni sur un téléphone, ni par un lecteur
 * d'écran, ne suit pas le thème et ne s'indexe pas.
 */

/** Ce que le document dit de lui-même. Repris mot pour mot, en tête de page. */
export const CGU_STATUS =
  "Le présent document constitue un projet de CGU spécifique au fonctionnement décrit pour le démonstrateur CartePro. Il est transmis pour avis préalable au service juridique de l'administration et ne doit pas être publié en l’état.";

export type Article = {
  /** « Article 1 », tel qu'il est numéroté dans le document. */
  number: string;
  title: string;
  /** Un ou plusieurs paragraphes, dans l'ordre du document. */
  body: readonly string[];
};

export const CGU_ARTICLES: readonly Article[] = [
  {
    number: "Article 1",
    title: "Objet du service",
    body: [
      "CartePro est un démonstrateur de dispositif d’avantages salariés dématérialisés. Il permet à des salariés de disposer d’un crédit fictif utilisable auprès de partenaires référencés par l'Administration. Les montants affichés dans l’application sont exclusivement destinés à la simulation : aucun paiement, transfert ou encaissement de valeur monétaire réelle n’est réalisé par le démonstrateur.",
    ],
  },
  {
    number: "Article 2",
    title: "Espaces utilisateurs",
    body: [
      "Le service comprend un espace salarié, un espace partenaire et un espace d’administration. Le salarié peut consulter son solde, son historique, rechercher des partenaires et générer un QR code destiné à présenter une opération simulée. Le partenaire peut gérer son compte, valider une opération et consulter son tableau de bord. L’administration assure notamment la gestion des comptes et la validation des partenaires.",
    ],
  },
  {
    number: "Article 3",
    title: "Compte et sécurité",
    body: [
      "Chaque utilisateur est responsable de la confidentialité de ses moyens d’accès. Les comptes peuvent être activés ou désactivés par l’administration selon les règles du service. Les informations nécessaires à la gestion du compte doivent être exactes et à jour.",
    ],
  },
  {
    number: "Article 4",
    title: "Crédit et solde",
    body: [
      "Le solde affiché correspond au crédit disponible dans le démonstrateur. Le crédit est fictif et ne constitue pas une somme d’argent détenue par l’utilisateur. Il n’expire pas : le crédit non consommé reste disponible dans le cadre du fonctionnement du démonstrateur, sous réserve des règles applicables au compte.",
      "Une opération dont le montant est supérieur au solde disponible est refusée. Le solde ne peut pas devenir négatif. L’application affiche un message permettant de comprendre la raison du refus.",
    ],
  },
  {
    number: "Article 5",
    title: "Transactions et QR code",
    body: [
      "Le salarié génère un QR code destiné à une opération simulée auprès d’un partenaire. Le QR code est à usage unique et sa durée de validité est limitée à cinq minutes. Une fois une transaction validée, son enregistrement initial n’est pas modifié ou supprimé. Le système doit empêcher qu’un même encaissement soit enregistré plusieurs fois.",
    ],
  },
  {
    number: "Article 6",
    title: "Annulation exceptionnelle",
    body: [
      "Une transaction validée est en principe irréversible. Lorsqu’une correction exceptionnelle est nécessaire, elle relève d’un administrateur habilité de l'administration. L’annulation doit être justifiée par un motif enregistré et laisser une trace de l’opération. Elle ne doit pas supprimer ou modifier l’enregistrement initial ; le cas échéant, une opération corrective distincte peut recréditer le salarié.",
      "Cette procédure constitue une règle cible du présent projet : la fonctionnalité d’annulation n’est pas actuellement implémentée dans le démonstrateur et devra être validée avant toute mise en œuvre.",
    ],
  },
  {
    number: "Article 7",
    title: "Partenaires",
    body: [
      "L’inscription d’un partenaire est soumise à validation administrative. Les informations nécessaires à son référencement, notamment son identité professionnelle et son numéro SIRET/SIREN selon les informations demandées par le service, doivent être renseignées. Les règles détaillées de validation et de refus sont définies par l’administration.",
    ],
  },
  {
    number: "Article 8",
    title: "Données personnelles",
    body: [
      "Le fonctionnement du service implique le traitement de données relatives aux comptes et aux transactions. Les modalités détaillées de ces traitements figurent dans le registre des traitements associé au projet. Les utilisateurs doivent être informés des droits dont ils disposent et des coordonnées du responsable du traitement selon les mentions validées par l'administration.",
    ],
  },
  {
    number: "Article 9",
    title: "Simulation et absence de paiement réel",
    body: [
      "Les montants affichés dans CartePro sont fictifs. Une mention de simulation est affichée à proximité des montants dans les écrans concernés. Toute présentation ou capture du démonstrateur doit conserver cette information visible.",
    ],
  },
  {
    number: "Article 10",
    title: "Modification et validation",
    body: [
      "Le présent texte est un projet. Il ne peut être mis en ligne avant l’avis préalable du service juridique de l'administration. Les mentions légales, coordonnées, règles de responsabilité, modalités relatives aux droits des personnes et toute autre clause juridique requise devront être complétées ou ajustées avant publication.",
    ],
  },
];
