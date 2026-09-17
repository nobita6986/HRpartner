import { PrismaClient } from '@prisma/client';

export function getEnginePrisma(): PrismaClient {
  const url = process.env.HRPARTNER_ENGINE_URL;
  if (!url) {
    throw new Error('ENV_BLOCKED: HRPARTNER_ENGINE_URL is missing. Engine client fail-closed.');
  }

  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });
}
