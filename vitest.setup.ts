import { vi } from 'vitest';

// Simuler (mocker) process.exit pour empêcher les tests de s'arrêter
vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

// Définir les variables d'environnement requises avant que les tests ne les lisent
process.env.AUTH_TOKEN = 'UN_TOKEN_DE_TEST_SECRET_ET_ASSEZ_LONG';
process.env.WEBHOOK_SECRET = 'UN_SECRET_WEBHOOK_DE_TEST_TRES_TRES_LONG_POUR_PASSER_LA_VALIDATION';

// Vous pouvez ajouter d'autres variables nécessaires ici