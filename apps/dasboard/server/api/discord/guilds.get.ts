import {prisma, PrismaClient, type guilds} from "@bot/database"
import { guildsResponse } from "~~/types/discord.types"

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (!session.secure) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }
    try {
        const guilds = await fetchDiscordGuilds(session.secure.access_token);
        return guilds;
    } catch (error) {
        if (error instanceof Error) {
            // if errors is for access token expired or invalid, return 401
            if (error.message.includes('401')) {
                throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
            }
        }
        throw createError({ statusCode: 500, statusMessage: 'Failed to fetch guilds' });
    }
});

async function fetchDiscordGuilds(accessToken: string) {
    const response: guildsResponse[] = await $fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const botGuilds = await fetchBotGuilds();

    const filtered = response.filter((guild) => {
        return botGuilds.includes(guild.id) && (guild.owner || (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8));
    })

    return filtered;
}

async function fetchBotGuilds() {
    const guilds: string[] = [];
    const p: PrismaClient = prisma
    try {
        const botGuilds = await p.guilds.findMany({
            select: {
                id: true
            }
        });
        botGuilds.forEach(guild => {
            guilds.push(guild.id);
        });
    } catch (error) {
        console.error('Error fetching bot guilds:', error);
    }

    return guilds;
}