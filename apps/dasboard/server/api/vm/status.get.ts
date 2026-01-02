import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

interface VMStatusResponse {
    status: string;
    uptime: number;
    cpu: number;
    mem: number;
    maxmem: number;
    disk: number;
    maxdisk: number;
    netin: number;
    netout: number;
}

export default defineEventHandler(async (event) => {
    const session = await requireUserSession(event);
    const { panel, id: vmid, guildid } = getQuery(event);

    if (!vmid) {
        throw createError({
            statusCode: 400,
            statusMessage: 'VM ID is required'
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

        const vmStatus = await manager.getVM(parseInt(panel as string), vmid as string);

        return {
            success: true,
            data: vmStatus.data
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch VM status: ${error}`
        });
    }
});
