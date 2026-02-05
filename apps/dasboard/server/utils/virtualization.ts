import { prisma } from "@bot/database";
import { VirtualizationManager } from "@bot/virtualization";

const virtualizationManager = new VirtualizationManager(prisma);

export function useVirtualizationManager() {
    return virtualizationManager;
}
