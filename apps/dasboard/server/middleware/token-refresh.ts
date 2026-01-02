interface DiscordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

export default defineEventHandler(async (event) => {
    // Solo verificar en rutas que requieren autenticación
    const path = event.path;
    
    // Excluir rutas públicas y de autenticación
    if (path.startsWith('/api/auth') || path === '/login' || path.startsWith('/_nuxt') || path.startsWith('/api/discord/refresh')) {
        return;
    }

    try {
        const session = await getUserSession(event);
        
        // Si no hay sesión, continuar (otros middlewares se encargarán)
        if (!session || !session.secure) {
            return;
        }

        // Verificar si el token ha expirado
        const { expires_in, refresh_token } = session.secure;
        
        if (!expires_in || !refresh_token) {
            return;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        let expirationTime: number;

        // Si expires_in es mayor que el tiempo actual, es un timestamp
        // Si es menor, es una duración desde que se recibió
        if (expires_in > currentTime) {
            expirationTime = expires_in;
        } else {
            // No podemos determinar la expiración exacta, asumimos que expiró
            expirationTime = currentTime - 1;
        }

        // Si el token ha expirado o está por expirar (dentro de 5 minutos)
        if (currentTime >= expirationTime - 300) {
            try {
                // Intentar renovar el token
                const response = await $fetch<DiscordTokenResponse>('https://discord.com/api/oauth2/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: process.env.DISCORD_CLIENT_ID!,
                        client_secret: process.env.DISCORD_CLIENT_SECRET!,
                        grant_type: 'refresh_token',
                        refresh_token: refresh_token,
                        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
                    }).toString(),
                });

                // Calcular el timestamp de expiración
                const newExpirationTime = currentTime + response.expires_in;

                // Actualizar la sesión con el nuevo token
                await setUserSession(event, {
                    secure: {
                        access_token: response.access_token,
                        refresh_token: response.refresh_token,
                        expires_in: newExpirationTime, // Guardar como timestamp
                        token_type: response.token_type,
                        scope: response.scope,
                    },
                    user: session.user,
                });

                console.log('Token renovado automáticamente para el usuario:', session.user.id);
            } catch (error) {
                // Si falla la renovación, borrar la sesión
                console.error('Error al renovar el token, cerrando sesión:', error);
                await clearUserSession(event);
                
                // Si es una petición de API, devolver error 401
                if (path.startsWith('/api')) {
                    throw createError({
                        statusCode: 401,
                        statusMessage: 'Token expirado y no se pudo renovar',
                    });
                }
            }
        }
    } catch (error) {
        // Si hay algún error inesperado, log y continuar
        console.error('Error en middleware de renovación de token:', error);
    }
});
