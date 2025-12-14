import { PrismaClient } from "@prismaClient/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb"

// Singleton Prisma client to avoid creating multiple pools/connections
const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5
})
export const prisma = new PrismaClient({
    adapter: adapter
})

export default prisma;
