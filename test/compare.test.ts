import assert from 'node:assert';
import { AIProvider, GenerateOptions, ProviderError, ProviderGenerateResult } from '../src/server/providers/base.js';
import { ProviderRegistry } from '../src/server/providers/registry.js';
import { ModelOption } from '../src/shared/types.js';

console.log('🧪 Starting AI Arena Backend Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (error) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(error);
  }
}

// Mock Provider for testing parallel behavior & partial failures
class MockTestProvider implements AIProvider {
  public id: 'gemini' | 'anthropic' | 'openai' | 'demo' = 'gemini';
  public name = 'Mock Test Provider';
  public description = 'Provider used exclusively for automated testing';
  public envKeyName = 'TEST_KEY';
  public shouldFail = false;
  public failCode: 'TIMEOUT' | 'RATE_LIMITED' | 'API_ERROR' = 'API_ERROR';
  public delayMs = 10;
  public mockText = 'Mock response generated successfully';

  constructor(id: 'gemini' | 'anthropic' | 'openai' | 'demo', name: string) {
    this.id = id;
    this.name = name;
  }

  public isConfigured(): boolean {
    return true;
  }

  public getSupportedModels(): ModelOption[] {
    return [
      {
        id: `${this.id}-model-1`,
        providerId: this.id,
        name: `${this.name} Model 1`,
        description: 'Test Model',
        isConfigured: true,
      },
      {
        id: `${this.id}-model-2`,
        providerId: this.id,
        name: `${this.name} Model 2`,
        description: 'Test Model 2',
        isConfigured: true,
      },
    ];
  }

  public async generateResponse(options: GenerateOptions): Promise<ProviderGenerateResult> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    if (this.shouldFail) {
      throw new ProviderError(
        `Simulated failure for ${this.id}`,
        this.failCode,
        this.id,
        this.failCode === 'RATE_LIMITED' ? 429 : 500
      );
    }

    return {
      text: `${this.mockText} for model ${options.model}`,
      usage: {
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40,
      },
    };
  }
}

async function runAllTests() {
  // Test Suite 1: Input Validation
  await test('Validates empty prompt is rejected', () => {
    const registry = new ProviderRegistry();
    const result = registry.validateRequest({
      prompt: '   ',
      models: [{ providerId: 'gemini', modelId: 'gemini-3.8-flash' }],
    });
    assert.ok(result.error);
    assert.match(result.error, /Prompt cannot be empty/i);
  });

  await test('Validates oversized prompt is rejected', () => {
    const registry = new ProviderRegistry();
    const longPrompt = 'A'.repeat(12001);
    const result = registry.validateRequest({
      prompt: longPrompt,
      models: [{ providerId: 'gemini', modelId: 'gemini-3.8-flash' }],
    });
    assert.ok(result.error);
    assert.match(result.error, /exceeds maximum character limit/i);
  });

  await test('Validates empty models list is rejected', () => {
    const registry = new ProviderRegistry();
    const result = registry.validateRequest({
      prompt: 'Hello AI Arena',
      models: [],
    });
    assert.ok(result.error);
    assert.match(result.error, /At least one model must be selected/i);
  });

  await test('Validates maximum model concurrency cap (max 4)', () => {
    const registry = new ProviderRegistry();
    const result = registry.validateRequest({
      prompt: 'Hello AI Arena',
      models: [
        { providerId: 'gemini', modelId: 'gemini-3.8-flash' },
        { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite' },
        { providerId: 'anthropic', modelId: 'claude-3-5-sonnet' },
        { providerId: 'openai', modelId: 'gpt-4o' },
        { providerId: 'openai', modelId: 'gpt-4o-mini' },
      ],
    });
    assert.ok(result.error);
    assert.match(result.error, /Maximum 4 models/i);
  });

  await test('Validates unsupported model ID is rejected', () => {
    const registry = new ProviderRegistry();
    const result = registry.validateRequest({
      prompt: 'Hello',
      models: [{ providerId: 'gemini', modelId: 'non-existent-model-xyz' }],
    });
    assert.ok(result.error);
    assert.match(result.error, /is not supported by provider/i);
  });

  // Test Suite 2: Parallel Request Handling
  await test('Handles parallel requests across multiple providers concurrently', async () => {
    const registry = new ProviderRegistry();
    const mockP1 = new MockTestProvider('gemini', 'Mock Gemini');
    const mockP2 = new MockTestProvider('anthropic', 'Mock Claude');
    mockP1.delayMs = 30;
    mockP2.delayMs = 30;

    registry.register(mockP1);
    registry.register(mockP2);

    const start = performance.now();
    const response = await registry.compare({
      prompt: 'Explain gravity',
      models: [
        { providerId: 'gemini', modelId: 'gemini-model-1' },
        { providerId: 'anthropic', modelId: 'anthropic-model-1' },
      ],
      timeoutMs: 5000,
    });
    const elapsed = performance.now() - start;

    assert.strictEqual(response.results.length, 2);
    assert.strictEqual(response.results[0].status, 'success');
    assert.strictEqual(response.results[1].status, 'success');
    // Both 30ms tasks ran concurrently, so elapsed should be much lower than sequential (60ms+)
    assert.ok(elapsed < 100, `Execution took ${elapsed}ms, expected concurrent execution`);
  });

  // Test Suite 3: Partial Failures (One succeeds, one fails)
  await test('Preserves partial success when one provider fails with error', async () => {
    const registry = new ProviderRegistry();
    const mockSuccess = new MockTestProvider('gemini', 'Gemini Working');
    const mockFailed = new MockTestProvider('anthropic', 'Anthropic Failing');
    mockFailed.shouldFail = true;
    mockFailed.failCode = 'API_ERROR';

    registry.register(mockSuccess);
    registry.register(mockFailed);

    const response = await registry.compare({
      prompt: 'Test prompt',
      models: [
        { providerId: 'gemini', modelId: 'gemini-model-1' },
        { providerId: 'anthropic', modelId: 'anthropic-model-1' },
      ],
      timeoutMs: 5000,
    });

    assert.strictEqual(response.results.length, 2);
    assert.strictEqual(response.results[0].status, 'success');
    assert.ok(response.results[0].text?.includes('Mock response'));
    assert.strictEqual(response.results[1].status, 'error');
    assert.ok(response.results[1].error?.includes('Simulated failure'));
  });

  // Test Suite 4: Rate Limiting & Timeout Containment
  await test('Correctly marks rate limited provider status', async () => {
    const registry = new ProviderRegistry();
    const mockRateLimit = new MockTestProvider('openai', 'OpenAI RateLimited');
    mockRateLimit.shouldFail = true;
    mockRateLimit.failCode = 'RATE_LIMITED';

    registry.register(mockRateLimit);

    const response = await registry.compare({
      prompt: 'Test prompt',
      models: [{ providerId: 'openai', modelId: 'openai-model-1' }],
    });

    assert.strictEqual(response.results.length, 1);
    assert.strictEqual(response.results[0].status, 'rate_limited');
  });

  await test('Contains per-provider timeouts without crashing overall run', async () => {
    const registry = new ProviderRegistry();
    const mockFast = new MockTestProvider('gemini', 'Fast Model');
    mockFast.delayMs = 10;

    const mockSlow = new MockTestProvider('anthropic', 'Hanging Model');
    mockSlow.delayMs = 1000; // Will exceed test timeout limit

    registry.register(mockFast);
    registry.register(mockSlow);

    const response = await registry.compare({
      prompt: 'Benchmark query',
      models: [
        { providerId: 'gemini', modelId: 'gemini-model-1' },
        { providerId: 'anthropic', modelId: 'anthropic-model-1' },
      ],
      timeoutMs: 100, // 100ms timeout threshold
    });

    assert.strictEqual(response.results.length, 2);
    assert.strictEqual(response.results[0].status, 'success');
    assert.strictEqual(response.results[1].status, 'timeout');
    assert.match(response.results[1].error || '', /timed out/i);
  });

  // Test Suite 5: Security / Secret Leak Prevention
  await test('Guarantees responses and error messages never expose secret keys', async () => {
    const registry = new ProviderRegistry();
    const mockProvider = new MockTestProvider('gemini', 'Security Check');
    registry.register(mockProvider);

    const response = await registry.compare({
      prompt: 'Echo check',
      models: [{ providerId: 'gemini', modelId: 'gemini-model-1' }],
    });

    const serialized = JSON.stringify(response);
    assert.strictEqual(serialized.includes('MY_GEMINI_API_KEY'), false);
    assert.strictEqual(serialized.includes('TEST_KEY'), false);
    assert.strictEqual(serialized.includes('Bearer '), false);
  });

  console.log(`\n=========================================`);
  console.log(`Test Results: ${passedTests}/${totalTests} Passed`);
  console.log(`=========================================\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
