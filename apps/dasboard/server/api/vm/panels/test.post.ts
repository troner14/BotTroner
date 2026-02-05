import { VirtualizationManager } from "@bot/virtualization";
import type { PanelCredentials } from "@bot/virtualization";

/**
 * POST /api/vm/panels/test
 * Prueba la conexión a un panel sin guardarlo
 * Prioridad: Seguridad > Velocidad
 */
export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readBody(event);

    const { type, apiUrl, credentials } = body;

    // Validaciones
    if (!type || typeof type !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Panel type is required'
        });
    }

    const allowedTypes = ['proxmox', 'vmware', 'hyper-v'];
    if (!allowedTypes.includes(type.toLowerCase())) {
        throw createError({
            statusCode: 400,
            statusMessage: `Invalid panel type. Allowed: ${allowedTypes.join(', ')}`
        });
    }

    if (!apiUrl || typeof apiUrl !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'API URL is required'
        });
    }

    // Validar formato de URL
    try {
        new URL(apiUrl);
    } catch {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid API URL format'
        });
    }

    const url = new URL(apiUrl);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        throw createError({
            statusCode: 400,
            statusMessage: 'HTTPS is required for API URLs in production'
        });
    }

    if (!credentials || typeof credentials !== 'object') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Credentials are required'
        });
    }

    try {
        const manager = useVirtualizationManager();
        
        // Validar credenciales (esto crea una conexión temporal)
        const result = await manager.validatePanelCredentials(
            type.toLowerCase(),
            apiUrl,
            credentials as PanelCredentials
        );

        if (!result.success) {
            return {
                success: false,
                message: result.error || 'Failed to connect to panel',
                connected: false
            };
        }

        return {
            success: true,
            message: 'Connection successful',
            connected: result.data
        };
    } catch (error: any) {
        console.error('Error testing panel connection:', error);
        
        return {
            success: false,
            message: error.message || 'Connection test failed',
            connected: false
        };
    }
});
