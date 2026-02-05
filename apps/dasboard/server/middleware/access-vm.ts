const ExcludePaths = [
    '/_nuxt',
    '/__nuxt',
    '/auth',
    '/api/_nuxt',
    '/api/_auth',
    '/api/discord',
    '/favicon.ico'
]
const ENABLED = false;

export default defineEventHandler(async (event) => {
    const path = event.path;
    const session = await getUserSession(event);
    const query = getQuery(event);

    if (!ENABLED) {
        return;
    }

    if (!session || !session.secure) {
        return;
    }

    if (ExcludePaths.some(excludePath => (path.startsWith(excludePath) || path === excludePath))) {
        return
    }

    let guilds = await getCachedGuilds(session.secure.access_token);

    if (!guilds) {
        guilds = [];
    }

   
    if (query.guildid && typeof query.guildid === 'string') {
        const hasAccess = guilds.some((g) => g.id === query.guildid);
        if (!hasAccess) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Access to the specified guild is denied'
            });
        }
        
    }
    const guild = guilds.find((g) => g.id === query.guildid);
    if (path.includes('panel')) {
        if (!guild?.owner || !guild?.permissions || (BigInt(guild.permissions) & BigInt(0x20)) === BigInt(0)) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Insufficient permissions to access the panel'
            });
        }
    }
});