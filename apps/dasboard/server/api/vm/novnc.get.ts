import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const { panel, id: vmid, guildid } = getQuery(event);

    if (!vmid) {
        throw createError({
            statusCode: 400,
            statusMessage: 'VM ID is required'
        });
    }

    if (!panel) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Panel ID is required'
        });
    }

    try {
        const check = await prisma.virtualization_panels.findFirst({
            where: {
                id: parseInt(panel as string),
                guildId: guildid as string
            }
        })

        if (!check) {
            throw createError({
                statusCode: 403,
                statusMessage: 'Access to the specified panel is forbidden'
            });
        }

        const manager = event.context.virtualizationManager as VirtualizationManager;

        const novncData = await manager.getNoVNCUrl(parseInt(panel as string), vmid as string);
        
        if (!novncData.success || !novncData.data) {
            throw createError({
                statusCode: 500,
                statusMessage: novncData.error || 'Failed to generate noVNC URL'
            });
        }

        return {
            success: true,
            data: novncData.data
        };
    } catch (error) {
        console.error('Error getting noVNC URL:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get noVNC URL'
        });
    }
});
