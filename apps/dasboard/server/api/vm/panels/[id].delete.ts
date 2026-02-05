import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

/**
 * DELETE /api/vm/panels/:id
 * Elimina un panel de virtualización
 * Prioridad: Seguridad > Velocidad
 */
export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const id = getRouterParam(event, 'id');
    const { guildid } = getQuery(event);

    if (!id || isNaN(parseInt(id))) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Valid panel ID is required'
        });
    }

    if (!guildid || typeof guildid !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Guild ID is required'
        });
    }

    const panelId = parseInt(id);

    try {
        // Verificar que el panel existe y pertenece al guild
        const panel = await prisma.virtualization_panels.findFirst({
            where: {
                id: panelId,
                guildId: guildid
            }
        });

        if (!panel) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Panel not found or access denied'
            });
        }

        // Verificar que el usuario tiene permisos para el guild
        // TODO: Implementar verificación de permisos de administrador cuando esté disponible

        // Verificar si hay VMs monitoreadas usando este panel
        const monitoredVMs = await prisma.vm_monitors.count({
            where: { panelId }
        });

        if (monitoredVMs > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: `Cannot delete panel: ${monitoredVMs} VM(s) are being monitored. Please remove monitors first.`
            });
        }

        const manager = useVirtualizationManager();
        const result = await manager.removePanel(panelId);

        if (!result.success) {
            throw createError({
                statusCode: 500,
                statusMessage: result.error || 'Failed to delete panel'
            });
        }

        return {
            success: true,
            message: 'Panel deleted successfully'
        };
    } catch (error: any) {
        console.error('Error deleting panel:', error);
        
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: `Failed to delete panel: ${error.message || error}`
        });
    }
});
