import { VirtualizationManager as BaseVirtualizationManager } from "@bot/virtualization";
import type { PrismaClient } from "@bot/database";
import type { VirtualizationMonitor } from "./VirtualizationMonitor";

/**
 * Extensión del VirtualizationManager con funcionalidades específicas de Discord
 * Añade soporte para el monitor de VMs en Discord
 */
export class DiscordVirtualizationManager extends BaseVirtualizationManager {
    public monitor: VirtualizationMonitor | null = null;

    constructor(prisma: PrismaClient) {
        super(prisma);
    }

    /**
     * Establece el monitor de virtualización de Discord
     */
    setMonitor(monitor: VirtualizationMonitor): void {
        this.monitor = monitor;
    }

    /**
     * Obtiene el monitor de virtualización de Discord
     */
    getMonitor(): VirtualizationMonitor | null {
        return this.monitor;
    }
}
