import type { PrismaClient } from "@prismaClient";
import type { Logger } from "pino";
import logger from "@utils/logger";
import type { 
    IVirtualizationProvider, 
    PanelDBConfig, 
    VMStatus, 
    VMAction, 
    VMActionResult,
    ManagerResult,
    PanelCredentials
} from "@class/virtualization/interfaces/IVirtualizationProvider";
import { ProxmoxProvider } from "./providers/ProxmoxProvider";

/**
 * Manager principal para gestión de virtualización
 * Maneja múltiples proveedores y paneles por guild
 */
export class VirtualizationManager {
    private logger: Logger;
    private providers: Map<string, IVirtualizationProvider> = new Map();
    private panelProviders: Map<number, IVirtualizationProvider> = new Map(); // panelId -> provider instance

    constructor(private prisma: PrismaClient) {
        this.logger = logger.child({ module: "VirtualizationManager" });
        this.initializeProviders();
    }

    /**
     * Registra todos los proveedores disponibles
     */
    private initializeProviders(): void {
        // Registrar Proxmox
        this.providers.set('proxmox', new ProxmoxProvider());
        // Futuro: registrar otros proveedores como VMware, Hyper-V, OpenStack, etc.
        
        this.logger.info(`Initialized ${this.providers.size} virtualization providers`);
    }

    /**
     * Obtiene todos los paneles de un guild
     */
    async getPanelsByGuild(guildId: string): Promise<ManagerResult<PanelDBConfig[]>> {
        try {
            const panels = await this.prisma.proxmox.findMany({
                where: { guildId, def: true }, // Temporal: usar tabla existente
                select: {
                    id: true,
                    guildId: true,
                    name: true,
                    url: true,
                    token: true,
                    def: true
                }
            });

            // Mapear a la estructura genérica (temporal hasta migrar BD)
            const mappedPanels: PanelDBConfig[] = panels.map(panel => ({
                id: panel.id,
                guildId: panel.guildId,
                name: panel.name || `Proxmox-${panel.id}`,
                type: 'proxmox',
                apiUrl: panel.url,
                credentials: {
                    type: 'token',
                    data: { token: panel.token }
                },
                active: true,
                isDefault: panel.def
            }));

            return {
                success: true,
                data: mappedPanels
            };
        } catch (error) {
            this.logger.error({ error, guildId }, "Failed to get panels for guild");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Obtiene un panel específico por ID
     */
    async getPanel(panelId: number): Promise<ManagerResult<PanelDBConfig>> {
        try {
            const panel = await this.prisma.proxmox.findUnique({
                where: { id: panelId },
                include: { guilds: true }
            });

            if (!panel) {
                return {
                    success: false,
                    error: "Panel not found"
                };
            }

            const mappedPanel: PanelDBConfig = {
                id: panel.id,
                guildId: panel.guildId,
                name: panel.name || `Proxmox-${panel.id}`,
                type: 'proxmox',
                apiUrl: panel.url,
                credentials: {
                    type: 'token',
                    data: { token: panel.token }
                },
                active: true,
                isDefault: panel.def
            };

            return {
                success: true,
                data: mappedPanel
            };
        } catch (error) {
            this.logger.error({ error, panelId }, "Failed to get panel");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Conecta a un panel y lo cachea
     */
    async connectToPanel(panelId: number): Promise<ManagerResult<IVirtualizationProvider>> {
        try {
            // Verificar si ya está conectado
            if (this.panelProviders.has(panelId)) {
                const provider = this.panelProviders.get(panelId)!;
                const isConnected = await provider.testConnection();
                if (isConnected) {
                    return { success: true, data: provider };
                } else {
                    // Limpiar conexión inválida
                    this.panelProviders.delete(panelId);
                }
            }

            // Obtener configuración del panel
            const panelResult = await this.getPanel(panelId);
            if (!panelResult.success || !panelResult.data) {
                return { success: false, error: panelResult.error };
            }

            const panel = panelResult.data;
            
            // Obtener el proveedor apropiado
            const provider = this.providers.get(panel.type);
            if (!provider) {
                return {
                    success: false,
                    error: `Unsupported panel type: ${panel.type}`
                };
            }

            // Crear nueva instancia del proveedor para este panel
            const ProviderClass = provider.constructor as new() => IVirtualizationProvider;
            const panelProvider = new ProviderClass();

            // Conectar
            const connected = await panelProvider.connect(
                panel.apiUrl, 
                panel.credentials, 
                panel.config
            );

            if (!connected) {
                return {
                    success: false,
                    error: "Failed to connect to panel"
                };
            }

            // Cachear la conexión
            this.panelProviders.set(panelId, panelProvider);

            this.logger.info(`Connected to panel ${panel.name} (${panel.type})`);

            return {
                success: true,
                data: panelProvider,
                provider: panel.type
            };
        } catch (error) {
            this.logger.error({ error, panelId }, "Failed to connect to panel");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Lista todas las VMs de un panel
     */
    async listVMs(panelId: number): Promise<ManagerResult<VMStatus[]>> {
        try {
            const connectionResult = await this.connectToPanel(panelId);
            if (!connectionResult.success || !connectionResult.data) {
                return { success: false, error: connectionResult.error };
            }

            const provider = connectionResult.data;
            const vms = await provider.listVMs();

            return {
                success: true,
                data: vms,
                provider: connectionResult.provider
            };
        } catch (error) {
            this.logger.error({ error, panelId }, "Failed to list VMs");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Obtiene información de una VM específica
     */
    async getVM(panelId: number, vmId: string): Promise<ManagerResult<VMStatus>> {
        try {
            const connectionResult = await this.connectToPanel(panelId);
            if (!connectionResult.success || !connectionResult.data) {
                return { success: false, error: connectionResult.error };
            }

            const provider = connectionResult.data;
            const vm = await provider.getVM(vmId);

            if (!vm) {
                return {
                    success: false,
                    error: "VM not found"
                };
            }

            return {
                success: true,
                data: vm,
                provider: connectionResult.provider
            };
        } catch (error) {
            this.logger.error({ error, panelId, vmId }, "Failed to get VM");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Ejecuta una acción en una VM
     */
    async executeVMAction(
        panelId: number, 
        action: VMAction, 
        userId: string
    ): Promise<ManagerResult<VMActionResult>> {
        try {
            const connectionResult = await this.connectToPanel(panelId);
            if (!connectionResult.success || !connectionResult.data) {
                return { success: false, error: connectionResult.error };
            }

            const provider = connectionResult.data;
            
            // Log de la acción
            this.logger.info({
                panelId,
                vmId: action.vmId,
                action: action.type,
                userId
            }, "Executing VM action");

            const result = await provider.executeAction(action);

            // TODO: Guardar en vm_action_logs cuando tengamos la tabla
            try {
                // await this.logAction(panelId, action, userId, result);
            } catch (logError) {
                this.logger.warn({ logError }, "Failed to log action");
            }

            return {
                success: result.success,
                data: result,
                provider: connectionResult.provider
            };
        } catch (error) {
            this.logger.error({ error, panelId, action, userId }, "Failed to execute VM action");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Obtiene información del sistema de un panel
     */
    async getSystemInfo(panelId: number): Promise<ManagerResult<any>> {
        try {
            const connectionResult = await this.connectToPanel(panelId);
            if (!connectionResult.success || !connectionResult.data) {
                return { success: false, error: connectionResult.error };
            }

            const provider = connectionResult.data;
            const systemInfo = await provider.getSystemInfo();

            return {
                success: true,
                data: systemInfo,
                provider: connectionResult.provider
            };
        } catch (error) {
            this.logger.error({ error, panelId }, "Failed to get system info");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Desconecta de un panel específico
     */
    async disconnectPanel(panelId: number): Promise<void> {
        const provider = this.panelProviders.get(panelId);
        if (provider) {
            await provider.disconnect();
            this.panelProviders.delete(panelId);
            this.logger.info(`Disconnected from panel ${panelId}`);
        }
    }

    /**
     * Desconecta de todos los paneles
     */
    async disconnectAll(): Promise<void> {
        const disconnectPromises = Array.from(this.panelProviders.entries()).map(
            async ([panelId, provider]) => {
                try {
                    await provider.disconnect();
                    this.logger.debug(`Disconnected from panel ${panelId}`);
                } catch (error) {
                    this.logger.warn({ error, panelId }, "Error disconnecting from panel");
                }
            }
        );

        await Promise.all(disconnectPromises);
        this.panelProviders.clear();
        this.logger.info("Disconnected from all panels");
    }

    /**
     * Obtiene estadísticas generales
     */
    async getStats(guildId: string): Promise<ManagerResult<{
        totalPanels: number;
        activePanels: number;
        totalVMs: number;
        runningVMs: number;
        stoppedVMs: number;
    }>> {
        try {
            const panelsResult = await this.getPanelsByGuild(guildId);
            if (!panelsResult.success || !panelsResult.data) {
                return { success: false, error: panelsResult.error };
            }

            const panels = panelsResult.data;
            let totalVMs = 0;
            let runningVMs = 0;
            let stoppedVMs = 0;
            let activePanels = 0;

            for (const panel of panels) {
                try {
                    const vmsResult = await this.listVMs(panel.id);
                    if (vmsResult.success && vmsResult.data) {
                        activePanels++;
                        totalVMs += vmsResult.data.length;
                        runningVMs += vmsResult.data.filter(vm => vm.status === 'running').length;
                        stoppedVMs += vmsResult.data.filter(vm => vm.status === 'stopped').length;
                    }
                } catch (error) {
                    this.logger.warn({ error, panelId: panel.id }, "Failed to get stats from panel");
                }
            }

            return {
                success: true,
                data: {
                    totalPanels: panels.length,
                    activePanels,
                    totalVMs,
                    runningVMs,
                    stoppedVMs
                }
            };
        } catch (error) {
            this.logger.error({ error, guildId }, "Failed to get stats");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Obtiene los tipos de proveedores disponibles
     */
    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Valida las credenciales de un panel antes de guardarlo
     */
    async validatePanelCredentials(
        type: string, 
        apiUrl: string, 
        credentials: PanelCredentials
    ): Promise<ManagerResult<boolean>> {
        try {
            const provider = this.providers.get(type);
            if (!provider) {
                return {
                    success: false,
                    error: `Unsupported provider type: ${type}`
                };
            }

            // Crear instancia temporal para test
            const ProviderClass = provider.constructor as new() => IVirtualizationProvider;
            const testProvider = new ProviderClass();

            const connected = await testProvider.connect(apiUrl, credentials);
            await testProvider.disconnect();

            return {
                success: true,
                data: connected
            };
        } catch (error) {
            this.logger.error({ error, type, apiUrl }, "Failed to validate credentials");
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }
}