
interface discordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    if (!session.secure) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    try {
        const response = await $fetch<discordTokenResponse>('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID!,
                client_secret: process.env.DISCORD_CLIENT_SECRET!,
                grant_type: 'refresh_token',
                refresh_token: session.secure.refresh_token,
                redirect_uri: process.env.DISCORD_REDIRECT_URI!,
            }).toString(),
        });
        
        // Calcular el timestamp de expiración
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime + response.expires_in;
        
        const updateSecureSession = {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            expires_in: expirationTime, // Guardar como timestamp
            token_type: response.token_type,
            scope: response.scope,
        };
        session.secure = updateSecureSession;
        await setUserSession(event, {
            secure: updateSecureSession,
            user: session.user
        });
        return response;
    } catch (error) {
        throw createError({ statusCode: 500, statusMessage: `Failed to refresh token ${error}` });
    }
});