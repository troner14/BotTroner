export default defineOAuthDiscordEventHandler({
    config: {
        scope: ['identify', 'email', 'guilds']
    },
    async onSuccess(event, { user, tokens}) {
        // Calcular el timestamp de expiración
        const currentTime = Math.floor(Date.now() / 1000);
        const expirationTime = currentTime + tokens.expires_in;
        
        await setUserSession(event, {
            secure: {
                ...tokens,
                expires_in: expirationTime, // Guardar como timestamp
            },
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            }
        })
        return sendRedirect(event, "/");
    },
    async onError(event, error) {
        return sendRedirect(event, `/login?error=${encodeURIComponent(error.message)}`);
    }
})