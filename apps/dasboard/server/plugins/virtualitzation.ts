import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

export default defineNitroPlugin((nitroApp) => {
    const virtualizationManager = new VirtualizationManager(prisma);
    nitroApp.hooks.hook('request', (event) => {
        event.context.virtualizationManager = virtualizationManager;
    });


    console.log("VirtualizationManager plugin initialized.");
});