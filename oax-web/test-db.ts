process.env.DATABASE_URL = 'file:./data/oax.db';
import { prisma } from './src/lib/db';

async function main() {
  console.log("Testing DB connection...");
  const count = await prisma.chatSession.count();
  console.log("Session count:", count);
}

main().catch(console.error);
