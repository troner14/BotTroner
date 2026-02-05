import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";
import type { PanelCredentials } from "@bot/virtualization";

/**
 * PATCH /api/vm/panels/:id
 * Actualiza un panel de virtualización existente
 * Prioridad: Seguridad > Velocidad
 */
export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const id = getRouterParam(event, 'id');
    const body = await readBody(event);

    if (!id || isNaN(parseInt(id))) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Valid panel ID is required'
        });
    }

    const panelId = parseInt(id);
    const { guildid, name, apiUrl, credentials, isDefault, active } = body;

    // Validar guildId si se proporciona
    if (guildid && typeof guildid !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Guild ID must be a string'
        });
    }

    try {
        // Verificar que el panel existe y obtener su información
        const existingPanel = await prisma.virtualization_panels.findUnique({
            where: { id: panelId }
        });

        if (!existingPanel) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Panel not found'
            });
        }

        // Verificar que el usuario tiene acceso al guild del panel
        const guildIdToCheck = guildid || existingPanel.guildId;
        // TODO: Implementar verificación de permisos cuando esté disponible

        // Si se proporciona nombre, validarlo
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim().length === 0) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Panel name must be a non-empty string'
                });
            }

            if (name.length > 50) {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Panel name must be 50 characters or less'
                });
            }

            // Verificar que el nombre no esté duplicado
            const duplicateName = await prisma.virtualization_panels.findFirst({
                where: {
                    guildId: existingPanel.guildId,
                    name: name.trim(),
                    id: { not: panelId }
                }
            });

            if (duplicateName) {
                throw createError({
                    statusCode: 409,
                    statusMessage: 'A panel with this name already exists'
                });
            }
        }

        // Si se proporciona apiUrl, validarlo
        if (apiUrl !== undefined) {
            if (typeof apiUrl !== 'string') {
                throw createError({
                    statusCode: 400,
                    statusMessage: 'API URL must be a string'
                });
            }

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
        }

        // Si se proporcionan credenciales, validarlas
        if (credentials !== undefined && (typeof credentials !== 'object' || credentials === null)) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Credentials must be an object'
            });
        }

        const manager = useVirtualizationManager();

        // Preparar objeto de actualizaciones
        const updates: any = {};
        if (name !== undefined) updates.name = name.trim();
        if (apiUrl !== undefined) updates.apiUrl = apiUrl;
        if (credentials !== undefined) updates.credentials = credentials as PanelCredentials;
        if (isDefault !== undefined) updates.isDefault = Boolean(isDefault);

        // Si se actualizan credenciales o URL, el manager validará la conexión
        let result;
        if (Object.keys(updates).length > 0) {
            result = await manager.updatePanel(panelId, updates);

            if (!result.success) {
                throw createError({
                    statusCode: 400,
                    statusMessage: result.error || 'Failed to update panel'
                });
            }
        }

        // Manejar cambio de estado activo/inactivo por separado
        if (active !== undefined) {
            const toggleResult = await manager.togglePanelStatus(panelId, Boolean(active));
            
            if (!toggleResult.success) {
                throw createError({
                    statusCode: 400,
                    statusMessage: toggleResult.error || 'Failed to toggle panel status'
                });
            }

            result = toggleResult;
        }

        // No enviar credenciales en la respuesta
        return {
            success: true,
            data: {
                id: result?.data?.id,
                name: result?.data?.name,
                type: result?.data?.type,
                apiUrl: result?.data?.apiUrl,
                active: result?.data?.active,
                isDefault: result?.data?.isDefault
            },
            message: 'Panel updated successfully'
        };
    } catch (error: any) {
        console.error('Error updating panel:', error);
        
        if (error.statusCode) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: `Failed to update panel: ${error.message || error}`
        });
    }
});
