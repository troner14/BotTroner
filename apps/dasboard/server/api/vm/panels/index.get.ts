import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

/**
 * GET /api/vm/panels
 * Obtiene todos los paneles de virtualización del guild
 */
export default defineEventHandler(async (event) => {
    const { guildid } = getQuery(event);

    if (!guildid || typeof guildid !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Guild ID is required'
        });
    }

    try {
        // Verificar que el usuario tiene acceso al guild
        // TODO: Implementar verificación de permisos cuando esté disponible
        
        const manager = useVirtualizationManager();
        const result = await manager.getPanelsByGuild(guildid);

        if (!result.success) {
            throw createError({
                statusCode: 500,
                statusMessage: result.error || 'Failed to fetch panels'
            });
        }

        // No enviar credenciales sensibles al cliente
        const sanitizedPanels = result.data?.map(panel => ({
            id: panel.id,
            name: panel.name,
            type: panel.type,
            apiUrl: panel.apiUrl,
            active: panel.active,
            isDefault: panel.isDefault
        }));

        return {
            success: true,
            data: sanitizedPanels as PanelSimpleInfo[]
        };
    } catch (error) {
        console.error('Error fetching panels:', error);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch panels: ${error}`
        });
    }
});
