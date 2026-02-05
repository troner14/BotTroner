import { prisma } from "@bot/database"

export const getCachedGuilds = cachedFunction(async (accessToken: string) => {
    const response: guildsResponse[] = await $fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    const botGuilds = await prisma.guilds.findMany({
      select: { id: true }
    });
    const botGuildIds = botGuilds.map(g => g.id);
    
    return response.filter((guild) => {
      return botGuildIds.includes(guild.id) && 
             (guild.owner || (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8));
    });
}, {
    maxAge: 300, // Cache por 5 minutos
    getKey(...args) {
        return `cachedGuilds_${args[0]}`;
    },
    name: 'getCachedGuilds'
})