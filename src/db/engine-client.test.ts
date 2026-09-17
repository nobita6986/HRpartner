import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getEnginePrisma } from './engine-client';
import { PrismaClient } from '@prisma/client';

describe('engine-client', () => {
  const originalEnv = process.env.HRPARTNER_ENGINE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.HRPARTNER_ENGINE_URL;
    } else {
      process.env.HRPARTNER_ENGINE_URL = originalEnv;
    }
  });

  it('fails closed when HRPARTNER_ENGINE_URL is missing', () => {
    delete process.env.HRPARTNER_ENGINE_URL;
    expect(() => getEnginePrisma()).toThrow('ENV_BLOCKED: HRPARTNER_ENGINE_URL is missing. Engine client fail-closed.');
  });

  it('returns a PrismaClient instance when HRPARTNER_ENGINE_URL is present', () => {
    process.env.HRPARTNER_ENGINE_URL = 'postgresql://fake:fake@localhost:5432/fake';
    const client = getEnginePrisma();
    expect(client).toBeInstanceOf(PrismaClient);
  });
});
