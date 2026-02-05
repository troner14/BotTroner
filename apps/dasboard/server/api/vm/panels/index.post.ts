import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";
import type { PanelCredentials } from "@bot/virtualization";

/**
 * POST /api/vm/panels
 * Crea un nuevo panel de virtualización
 * Prioridad: Seguridad > Velocidad
 */
export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const body = await readBody(event);

    const { guildid, name, type, apiUrl, credentials, isDefault } = body;

    // Validaciones exhaustivas
    if (!guildid || typeof guildid !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Guild ID is required and must be a string'
        });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Panel name is required'
        });
    }

    if (name.length > 50) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Panel name must be 50 characters or less'
        });
    }

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

    // Validar que sea HTTPS en producción
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
        // Verificar que el usuario tiene permisos para el guild
        // TODO: Implementar verificación de permisos cuando esté disponible
        
        // Verificar que el guild existe
        const guild = await prisma.guilds.findUnique({
            where: { id: guildid }
        });

        if (!guild) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Guild not found'
            });
        }

        // Verificar límite de paneles por guild (máximo 10)
        const existingPanelsCount = await prisma.virtualization_panels.count({
            where: { guildId: guildid }
        });

        if (existingPanelsCount >= 10) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Maximum number of panels (10) reached for this guild'
            });
        }

        // Verificar que el nombre no esté duplicado
        const existingPanel = await prisma.virtualization_panels.findFirst({
            where: {
                guildId: guildid,
                name: name.trim()
            }
        });

        if (existingPanel) {
            throw createError({
                statusCode: 409,
                statusMessage: 'A panel with this name already exists'
            });
        }

        const manager = useVirtualizationManager();
        
        // Crear panel (incluye validación de credenciales)
        const result = await manager.addPanel(
            guildid,
            name.trim(),
            type.toLowerCase(),
            apiUrl,
            credentials as PanelCredentials,
            isDefault || false
        );

        if (!result.success) {
            throw createError({
                statusCode: 400,
                statusMessage: result.error || 'Failed to create panel'
            });
        }

        // No enviar credenciales en la respuesta
        return {
            success: true,
            data: {
                id: result.data?.id,
                name: result.data?.name,
                type: result.data?.type,
                apiUrl: result.data?.apiUrl,
                active: result.data?.active,
                isDefault: result.data?.isDefault
            },
            message: 'Panel created successfully'
        };
    } catch (error: any) {
        console.error('Error creating panel:', error);
        
        // Si ya es un error de createError, relanzarlo
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: `Failed to create panel: ${error.message || error}`
        });
    }
});
