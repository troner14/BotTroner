export * from "../generated/prisma/client";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb"

// Singleton Prisma client to avoid creating multiple pools/connections
const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: Number.isInteger(Number(process.env.DATABASE_CONNECTION_LIMIT)) && Number(process.env.DATABASE_CONNECTION_LIMIT) > 0
        ? Number(process.env.DATABASE_CONNECTION_LIMIT)
        : 5
})
export const prisma = new PrismaClient({
    adapter: adapter
})

export default prisma;
