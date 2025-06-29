// src/server.ts (Corrigé)

import { z } from 'zod';
import { FastMCP, UserError } from 'fastmcp';
// CORRECTION : 'IncomingHttpHeaders' a été supprimé car il n'était plus utilisé.
// import type { IncomingHttpHeaders } from 'http';
import type { SessionData } from './types.js';

// --- Types de Données et Simulation de Base de Données ---

// Pour la clarté, nous définissons le type de nos produits
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}
// ... le reste du fichier est inchangé ...

// Simulons une base de données de produits
const dbProducts: Product[] = [
  {
    id: 'prod_001',
    name: 'Laptop Pro',
    description: 'Un ordinateur portable puissant pour les professionnels.',
    price: 1499.99,
    stock: 50,
  },
  {
    id: 'prod_002',
    name: 'Souris Ergonomique',
    description: 'Une souris conçue pour le confort.',
    price: 89.99,
    stock: 200,
  },
  {
    id: 'prod_003',
    name: 'Clavier Mécanique',
    description: 'Un clavier réactif pour le jeu et la frappe.',
    price: 129.99,
    stock: 150,
  },
];

// --- Définition du type de Session ---
// CORRECTION : La définition locale de SessionData a été supprimée.
// Nous utilisons maintenant le type importé de src/types.ts qui inclut
// la signature d'index requise par FastMCP.

// --- Création et Configuration du Serveur FastMCP ---

const server = new FastMCP<SessionData>({
  name: 'Serveur de Gestion de Produits',
  version: '1.0.0',
  instructions:
    'Ce serveur permet de rechercher des produits, de vérifier les stocks et de passer des commandes. Utilisez les outils disponibles pour interagir avec le catalogue.',

  // BONNE PRATIQUE: Implémenter une fonction d'authentification robuste
  authenticate: async (request): Promise<SessionData> => {
    const apiKey = request.headers['x-api-key'];

    if (apiKey === 'user_key') {
      return {
        userId: 'user_123',
        permissions: ['read'],
        headers: request.headers,
        // Propriétés requises par SessionData dans types.ts
        id: 'user_123',
        clientIp: request.headers['x-forwarded-for']?.toString() || 'unknown',
        authenticatedAt: Date.now(),
      };
    }
    if (apiKey === 'admin_key') {
      return {
        userId: 'admin_001',
        permissions: ['read', 'write'],
        headers: request.headers,
        // Propriétés requises par SessionData dans types.ts
        id: 'admin_001',
        clientIp: request.headers['x-forwarded-for']?.toString() || 'unknown',
        authenticatedAt: Date.now(),
      };
    }

    // Pour toute autre clé, rejeter la connexion
    throw new Response('Unauthorized', { status: 401 });
  },

  // BONNE PRATIQUE: Configurer le ping pour les transports réseau
  ping: {
    enabled: true,
    intervalMs: 15000,
    logLevel: 'debug',
  },

  // BONNE PRATIQUE: Exposer un endpoint de santé pour la supervision
  health: {
    enabled: true,
    message: 'Le serveur de produits est opérationnel',
  },

  // BONNE PRATIQUE: Activer la gestion des "Roots" pour les clients compatibles
  roots: {
    enabled: true,
  },
});
// --- Définition des "Resource Templates" ---

server.addResourceTemplate({
  uriTemplate: 'product://details/{productId}',
  name: 'Détails du Produit',
  mimeType: 'application/json',
  arguments: [{ name: 'productId', description: "L'ID unique du produit", required: true }],
  load: async ({ productId }) => {
    const product = dbProducts.find((p) => p.id === productId);
    if (!product) {
      return { text: JSON.stringify({ error: 'Produit non trouvé' }) };
    }
    return { text: JSON.stringify(product) };
  },
});
// --- Définition des Outils ---

// Outil 1: Recherche de produits
const SearchProductsParams = z.object({
  query: z.string().describe('Le terme à rechercher dans le nom ou la description des produits.'),
});
server.addTool({
  name: 'searchProducts',
  description: 'Recherche des produits dans le catalogue.',
  parameters: SearchProductsParams,
  annotations: {
    readOnlyHint: true,
    title: 'Rechercher des Produits',
  },
  execute: async (args, { log }) => {
    log.info(`Recherche de produits avec le terme: "${args.query}"`);
    const results = dbProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(args.query.toLowerCase()) ||
        p.description.toLowerCase().includes(args.query.toLowerCase())
    );

    if (results.length === 0) {
      return 'Aucun produit trouvé pour votre recherche.';
    }

    const content = results.map((p) => ({
      type: 'resource_link' as const, // 'as const' peut aider l'inférence de type
      uri: `product://details/${p.id}`,
      name: p.name,
      description: `${p.description.substring(0, 50)}...`,
      title: `${p.name} - ${p.price} €`,
    }));
    // La correction de SessionData devrait résoudre l'erreur d'inférence ici.
    return { content };
  },
});

// Outil 2: Passer une commande (streaming)
const PlaceOrderParams = z.object({
  productId: z.string().describe("L'ID du produit à commander."),
  quantity: z.number().int().positive().describe('La quantité à commander.'),
});
server.addTool({
  name: 'placeOrder',
  description: 'Passe une commande pour un produit et suit sa progression.',
  parameters: PlaceOrderParams,
  annotations: {
    streamingHint: true,
    destructiveHint: false,
    idempotentHint: false,
    title: 'Passer une Commande',
  },
  execute: async (args, { session, log, streamContent, reportProgress }) => {
    if (!session?.permissions.includes('write')) {
      throw new UserError("Permission refusée. Vous n'avez pas le droit de passer une commande.");
    }

    const product = dbProducts.find((p) => p.id === args.productId);
    if (!product) {
      throw new UserError(`Produit avec l'ID "${args.productId}" non trouvé.`);
    }
    if (product.stock < args.quantity) {
      throw new UserError(
        `Stock insuffisant pour "${product.name}". Stock restant: ${product.stock}.`
      );
    }

    log.info(`Commande de ${args.quantity} x ${product.name} par l'utilisateur ${session.userId}.`);
    await streamContent({ type: 'text', text: 'Vérification des informations de la commande...' });
    await reportProgress({ progress: 1, total: 4 });
    await new Promise((res) => setTimeout(res, 1000));
    await streamContent({ type: 'text', text: 'Validation du paiement...' });
    await reportProgress({ progress: 2, total: 4 });
    await new Promise((res) => setTimeout(res, 1500));

    await streamContent({ type: 'text', text: "Préparation de l'expédition..." });
    await reportProgress({ progress: 3, total: 4 });
    await new Promise((res) => setTimeout(res, 1000));
    product.stock -= args.quantity;
    await streamContent({
      type: 'text',
      text: `Expédition en cours ! Le nouveau stock pour ${product.name} est de ${product.stock}.`,
    });
    await reportProgress({ progress: 4, total: 4 });

    return {
      content: [
        {
          type: 'resource',
          resource: await server.embedded(`product://details/${product.id}`),
        },
      ],
    };
  },
});

// --- Démarrage du Serveur ---

const transportType = process.argv.includes('--http-stream') ? 'httpStream' : 'stdio';

server.start({
  transportType: transportType,
  httpStream: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
    endpoint: '/mcp',
  },
});
if (transportType === 'httpStream') {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  console.log(`Serveur MCP démarré en mode HTTP Stream sur http://localhost:${port}/mcp`);
} else {
  console.log('Serveur MCP démarré en mode stdio.');
}
