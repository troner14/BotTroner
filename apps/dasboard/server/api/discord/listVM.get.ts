import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";


export default defineEventHandler(async (event) => {
    const query = getQuery(event);

    if (query.guildid === undefined) {
        return {
            success: false,
            error: "guildid es obligatorio y debe ser una cadena de texto.",
            test: !query.guildid
        };
    }


    const panels = await prisma.virtualization_panels.findMany({
        where: {
            guildId: query.guildid as string,
            active: true
        }
    });

    if (panels.length === 0) {
        return {
            success: false,
            error: "No se encontraron paneles asociados a este servidor."
        };
    }

    const manager = event.context.virtualizationManager as VirtualizationManager;

    let vms: any[] = [];
    for (const panel of panels) {
        const res = await manager.listVMs(panel.id);
        if (res.success && res.data) {
            res.data.forEach(vm => {
                vm.panelId = panel.id;
            });
            vms = vms.concat(res.data);
        }
    }

    return {
        success: true,
        data: vms
    }
});