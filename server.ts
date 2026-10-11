import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProviderRegistry } from './src/server/providers/registry.js';
import { createApiRouter } from './src/server/routes/api.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Body parser with safe payload limits
  app.use(express.json({ limit: '2mb' }));

  // Initialize Provider Registry & API Routes
  const registry = new ProviderRegistry();
  app.use('/api', createApiRouter(registry));

  // Development vs Production serving
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[AI Arena] Vite middleware initialized in development mode.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log(`[AI Arena] Static assets served from ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Arena] Server running on http://0.0.0.0:${PORT}`);
    const providers = registry.getProvidersInfo();
    console.log(
      `[AI Arena] Providers: ${providers
        .map((p) => `${p.name} (${p.isConfigured ? 'Configured' : 'Awaiting Key'})`)
        .join(', ')}`
    );
  });
}

startServer().catch((err) => {
  console.error('[AI Arena] Fatal error starting server:', err);
  process.exit(1);
});
