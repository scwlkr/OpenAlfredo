import path from 'node:path';

import { PrismaClient } from '@prisma/client';

import { DATA_ROOT, toPosixPath } from './paths';

function defaultDatabaseUrl(): string {
  return `file:${toPosixPath(path.join(DATA_ROOT, 'oax.db'))}`;
}

const databaseUrl = process.env.DATABASE_URL || defaultDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

const globalForPrisma = globalThis as unknown as {
  prismaByUrl: Map<string, PrismaClient> | undefined;
};

const prismaByUrl = globalForPrisma.prismaByUrl ?? new Map<string, PrismaClient>();
const existing = prismaByUrl.get(databaseUrl);
export const prisma = existing ?? new PrismaClient();

if (!existing) prismaByUrl.set(databaseUrl, prisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaByUrl = prismaByUrl;
}
