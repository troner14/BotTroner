import { PrismaClient } from "@prismaClient";

// Singleton Prisma client to avoid creating multiple pools/connections
export const prisma = new PrismaClient();

export default prisma;
