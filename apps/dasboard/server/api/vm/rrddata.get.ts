import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

export default defineEventHandler(async (event) => {
    const { panel, id: vmid, guildid, ...other } = getQuery(event);
    const timeframe = (other.timeframe as string) || 'day';

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


        const res = await manager.getVMHistory(parseInt(panel as string), vmid as string, timeframe);

        if (!res.success || !res.data) {
            throw createError({
                statusCode: 500,
                statusMessage: `Failed to retrieve VM RRD data: ${res.error || 'Unknown error'}`
            });
        }

        const dataPoints = res.data.map((point: any) => ({
            time: point.time,
            cpu: point.cpu*100,
            mem: point.mem,
            maxmem: point.maxmem,
            disk: point.disk,
            maxdisk: point.maxdisk,
            netin: point.netin*1024,
            netout: point.netout*1024,
        }));

        return {
            success: true,
            timeframe,
            data: dataPoints
        };
    } catch (error) {
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to fetch VM RRD data: ${error}`
        });
    }
});
