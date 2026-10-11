import { Router, Request, Response } from 'express';
import { ProviderRegistry } from '../providers/registry.js';
import { SingleRegenerateRequest } from '../../shared/types.js';

export function createApiRouter(registry: ProviderRegistry): Router {
  const router = Router();

  /**
   * Health check and configuration status
   */
  router.get('/health', (_req: Request, res: Response) => {
    const providers = registry.getProvidersInfo();
    const configuredCount = providers.filter((p) => p.isConfigured && p.id !== 'demo').length;
    res.json({
      status: 'ok',
      service: 'AI Arena Backend',
      timestamp: new Date().toISOString(),
      configuredProviders: configuredCount,
      totalProviders: providers.length,
    });
  });

  /**
   * Get available providers and their supported models
   */
  router.get('/providers', (req: Request, res: Response) => {
    const includeDemo = req.query.includeDemo !== 'false';
    const providers = registry.getProvidersInfo(includeDemo);
    res.json({ providers });
  });

  /**
   * Compare multiple models concurrently with identical prompt
   */
  router.post('/compare', async (req: Request, res: Response) => {
    try {
      const validation = registry.validateRequest(req.body);
      if (validation.error || !validation.request) {
        res.status(400).json({ error: validation.error || 'Invalid comparison request' });
        return;
      }

      const response = await registry.compare(validation.request);
      res.json(response);
    } catch (err: unknown) {
      console.error('Unhandled error in /api/compare:', err);
      res.status(500).json({
        error: 'An internal server error occurred while processing the comparison.',
      });
    }
  });

  /**
   * Regenerate single model response
   */
  router.post('/regenerate', async (req: Request, res: Response) => {
    try {
      const payload = req.body as Partial<SingleRegenerateRequest>;
      if (!payload.prompt || typeof payload.prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }
      if (!payload.providerId || !payload.modelId) {
        res.status(400).json({ error: 'providerId and modelId are required' });
        return;
      }

      const provider = registry.getProvider(payload.providerId);
      if (!provider) {
        res.status(400).json({ error: `Provider '${payload.providerId}' not found.` });
        return;
      }

      const validation = registry.validateRequest({
        prompt: payload.prompt,
        models: [{ providerId: payload.providerId, modelId: payload.modelId }],
        isDemoMode: Boolean(payload.isDemoMode),
        timeoutMs: payload.timeoutMs,
        systemInstruction: payload.systemInstruction,
        temperature: payload.temperature,
      });

      if (validation.error || !validation.request) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const result = await registry.runSingleModel(
        { providerId: payload.providerId, modelId: payload.modelId },
        validation.request
      );

      res.json(result);
    } catch (err: unknown) {
      console.error('Unhandled error in /api/regenerate:', err);
      res.status(500).json({
        error: 'An internal server error occurred while regenerating model response.',
      });
    }
  });

  return router;
}
