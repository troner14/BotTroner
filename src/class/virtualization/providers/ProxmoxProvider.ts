import { BaseVirtualizationProvider } from "./BaseProvider";
import type { 
    VMStatus, 
    VMAction, 
    VMActionResult, 
    VMSpecs,
    PanelCredentials
} from "@class/virtualization/interfaces/IVirtualizationProvider";

interface ProxmoxVM {
    vmid: number;
    name: string;
    status: string;
    node: string;
    uptime?: number;
    cpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    netin?: number;
    netout?: number;
}

interface ProxmoxNode {
    node: string;
    status: string;
    cpu: number;
    maxcpu: number;
    mem: number;
    maxmem: number;
    uptime: number;
}

interface ProxmoxSystemInfo {
    version: string;
    repoid: string;
    release: string;
}

/**
 * Proveedor de virtualización para Proxmox VE
 */
export class ProxmoxProvider extends BaseVirtualizationProvider {
    private ticket: string = "";
    private csrfToken: string = "";
    private ticketExpiry: number = 0;

    constructor() {
        super("Proxmox Virtual Environment", "proxmox", "8.x");
    }

    protected async performConnect(): Promise<boolean> {
        try {
            if (!this.credentials) {
                throw new Error("No credentials provided");
            }

            // Proxmox utiliza autenticación por token API o usuario/contraseña
            if (this.credentials.type === 'token') {
                // Para tokens API de Proxmox, no necesitamos hacer login
                return await this.testTokenAuth();
            } else if (this.credentials.type === 'userpass') {
                return await this.performLogin();
            }

            throw new Error("Unsupported credentials type for Proxmox");
        } catch (error) {
            this.logger.error({ error }, "Failed to connect to Proxmox");
            return false;
        }
    }

    private async testTokenAuth(): Promise<boolean> {
        try {
            const response = await this.makeRequest<{ data: ProxmoxSystemInfo }>('GET', '/api2/json/version');
            this.logger.info(`Connected to Proxmox ${response.data.version}`);
            return true;
        } catch (error) {
            this.logger.error({ error }, "Token authentication failed");
            return false;
        }
    }

    private async performLogin(): Promise<boolean> {
        try {
            const { username, password } = this.credentials!.data;
            
            const response = await fetch(`${this.apiUrl}/api2/json/access/ticket`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: username!,
                    password: password!
                })
            });

            if (!response.ok) {
                throw new Error(`Login failed: ${response.statusText}`);
            }

            const data = await response.json() as { data: { ticket: string; CSRFPreventionToken: string } };
            this.ticket = data.data.ticket;
            this.csrfToken = data.data.CSRFPreventionToken;
            this.ticketExpiry = Date.now() + (2 * 60 * 60 * 1000); // 2 horas

            return true;
        } catch (error) {
            this.logger.error({ error }, "Login failed");
            return false;
        }
    }

    protected async performDisconnect(): Promise<void> {
        this.ticket = "";
        this.csrfToken = "";
        this.ticketExpiry = 0;
    }

    protected async performConnectionTest(): Promise<boolean> {
        try {
            await this.makeRequest<any>('GET', '/api2/json/version');
            return true;
        } catch {
            return false;
        }
    }

    protected getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};

        if (this.credentials?.type === 'token') {
            const { token } = this.credentials.data;
            headers['Authorization'] = `PVEAPIToken=${token}`;
        } else if (this.credentials?.type === 'userpass' && this.ticket) {
            // Verificar si el ticket ha expirado
            if (Date.now() > this.ticketExpiry) {
                throw new Error("Session expired, please reconnect");
            }
            headers['Cookie'] = `PVEAuthCookie=${this.ticket}`;
            headers['CSRFPreventionToken'] = this.csrfToken;
        }

        return headers;
    }

    async listVMs(): Promise<VMStatus[]> {
        this.validateConnection();

        try {
            // Obtener todos los nodos
            const nodesResponse = await this.makeRequest<{ data: ProxmoxNode[] }>('GET', '/api2/json/nodes');
            const vms: VMStatus[] = [];

            // Para cada nodo, obtener las VMs
            for (const node of nodesResponse.data) {
                try {
                    const nodeVMs = await this.makeRequest<{ data: ProxmoxVM[] }>(
                        'GET', 
                        `/api2/json/nodes/${node.node}/qemu`
                    );

                    for (const vm of nodeVMs.data) {
                        vms.push({
                            id: vm.vmid.toString(),
                            name: vm.name || `VM-${vm.vmid}`,
                            status: this.mapProxmoxStatus(vm.status),
                            uptime: vm.uptime,
                            cpu_usage: vm.cpu ? vm.cpu * 100 : undefined,
                            memory_usage: vm.mem,
                            network_traffic: {
                                rx_bytes: vm.netin || 0,
                                tx_bytes: vm.netout || 0
                            }
                        });
                    }
                } catch (error) {
                    this.logger.warn(`Failed to get VMs from node ${node.node}: ${error}`);
                }
            }

            return vms;
        } catch (error) {
            this.logger.error({ error }, "Failed to list VMs");
            throw error;
        }
    }

    async getVM(vmId: string): Promise<VMStatus | null> {
        this.validateConnection();
        this.validateVMId(vmId);

        try {
            // Primero encontrar en qué nodo está la VM
            const nodes = await this.makeRequest<{ data: ProxmoxNode[] }>('GET', '/api2/json/nodes');
            
            for (const node of nodes.data) {
                try {
                    const vmResponse = await this.makeRequest<{ data: ProxmoxVM }>(
                        'GET', 
                        `/api2/json/nodes/${node.node}/qemu/${vmId}/status/current`
                    );

                    const vm = vmResponse.data;
                    return {
                        id: vm.vmid.toString(),
                        name: vm.name || `VM-${vm.vmid}`,
                        status: this.mapProxmoxStatus(vm.status),
                        uptime: vm.uptime,
                        cpu_usage: vm.cpu ? vm.cpu * 100 : undefined,
                        memory_usage: vm.mem,
                        network_traffic: {
                            rx_bytes: vm.netin || 0,
                            tx_bytes: vm.netout || 0
                        }
                    };
                } catch {
                    // VM no está en este nodo, continuar
                    continue;
                }
            }

            return null;
        } catch (error) {
            this.logger.error({ error, vmId }, "Failed to get VM");
            throw error;
        }
    }

    async executeAction(action: VMAction): Promise<VMActionResult> {
        this.validateConnection();
        this.validateVMId(action.vmId);

        try {
            const node = await this.findVMNode(action.vmId);
            if (!node) {
                return {
                    success: false,
                    message: `VM ${action.vmId} not found`,
                    error: "VM_NOT_FOUND"
                };
            }

            const proxmoxAction = this.mapActionToProxmox(action.type);
            const endpoint = `/api2/json/nodes/${node}/qemu/${action.vmId}/status/${proxmoxAction}`;

            const response = await this.makeRequest<{ data: string }>(
                'POST', 
                endpoint, 
                action.options
            );

            return {
                success: true,
                message: `Action ${action.type} executed successfully on VM ${action.vmId}`,
                taskId: response.data,
                metadata: { node, action: proxmoxAction }
            };
        } catch (error) {
            this.logger.error({ error, action }, "Failed to execute action");
            return {
                success: false,
                message: `Failed to execute ${action.type} on VM ${action.vmId}`,
                error: (error as Error).message
            };
        }
    }

    async getSystemInfo(): Promise<any> {
        this.validateConnection();

        try {
            const [versionResponse, nodesResponse] = await Promise.all([
                this.makeRequest<{ data: ProxmoxSystemInfo }>('GET', '/api2/json/version'),
                this.makeRequest<{ data: ProxmoxNode[] }>('GET', '/api2/json/nodes')
            ]);

            return {
                version: versionResponse.data.version,
                nodes: nodesResponse.data.map(node => ({
                    name: node.node,
                    status: node.status,
                    resources: {
                        cpu: { used: node.cpu, total: node.maxcpu },
                        memory: { used: node.mem, total: node.maxmem },
                        uptime: node.uptime
                    }
                })),
                features: ['console', 'snapshots', 'clone', 'template', 'migration']
            };
        } catch (error) {
            this.logger.error({ error }, "Failed to get system info");
            throw error;
        }
    }

    async getVMSpecs(vmId: string): Promise<VMSpecs | null> {
        this.validateConnection();
        this.validateVMId(vmId);

        try {
            const node = await this.findVMNode(vmId);
            if (!node) return null;

            const configResponse = await this.makeRequest<{ data: any }>(
                'GET', 
                `/api2/json/nodes/${node}/qemu/${vmId}/config`
            );

            const config = configResponse.data;
            return {
                cpu: config.cores || 1,
                memory: config.memory || 512,
                storage: this.calculateTotalStorage(config),
                network: this.parseNetworkConfig(config)
            };
        } catch (error) {
            this.logger.error({ error, vmId }, "Failed to get VM specs");
            return null;
        }
    }

    async updateVMSpecs(vmId: string, specs: Partial<VMSpecs>): Promise<VMActionResult> {
        this.validateConnection();
        this.validateVMId(vmId);

        try {
            const node = await this.findVMNode(vmId);
            if (!node) {
                return { success: false, message: "VM not found", error: "VM_NOT_FOUND" };
            }

            const updateData: any = {};
            if (specs.cpu) updateData.cores = specs.cpu;
            if (specs.memory) updateData.memory = specs.memory;

            await this.makeRequest<any>(
                'PUT', 
                `/api2/json/nodes/${node}/qemu/${vmId}/config`,
                updateData
            );

            return {
                success: true,
                message: `VM ${vmId} specs updated successfully`
            };
        } catch (error) {
            this.logger.error({ error, vmId, specs }, "Failed to update VM specs");
            return {
                success: false,
                message: "Failed to update VM specs",
                error: (error as Error).message
            };
        }
    }

    async getVMLogs(vmId: string, lines: number = 50): Promise<string[]> {
        this.validateConnection();
        this.validateVMId(vmId);

        try {
            const node = await this.findVMNode(vmId);
            if (!node) return [];

            const response = await this.makeRequest<{ data: Array<{ n: number; t: string }> }>(
                'GET', 
                `/api2/json/nodes/${node}/qemu/${vmId}/log?lines=${lines}`
            );

            return response.data.map(log => `${log.n}: ${log.t}`);
        } catch (error) {
            this.logger.error({ error, vmId }, "Failed to get VM logs");
            return [];
        }
    }

    async getVMConsoleUrl(vmId: string): Promise<string | null> {
        this.validateConnection();
        this.validateVMId(vmId);

        try {
            const node = await this.findVMNode(vmId);
            if (!node) return null;

            // Proxmox usa VNC o SPICE para consola
            return `${this.apiUrl}/#v1:0:=qemu/${vmId}:4:5:=noVNC`;
        } catch (error) {
            this.logger.error({ error, vmId }, "Failed to get console URL");
            return null;
        }
    }

    // Métodos helper privados
    private async findVMNode(vmId: string): Promise<string | null> {
        try {
            const nodes = await this.makeRequest<{ data: ProxmoxNode[] }>('GET', '/api2/json/nodes');
            
            for (const node of nodes.data) {
                try {
                    await this.makeRequest<any>('GET', `/api2/json/nodes/${node.node}/qemu/${vmId}/status/current`);
                    return node.node;
                } catch {
                    continue;
                }
            }
            return null;
        } catch {
            return null;
        }
    }

    private mapProxmoxStatus(status: string): VMStatus['status'] {
        switch (status) {
            case 'running': return 'running';
            case 'stopped': return 'stopped';
            case 'paused': return 'paused';
            case 'suspended': return 'suspended';
            default: return 'unknown';
        }
    }

    private mapActionToProxmox(action: VMAction['type']): string {
        switch (action) {
            case 'start': return 'start';
            case 'stop': return 'stop';
            case 'restart': return 'reboot';
            case 'pause': return 'suspend';
            case 'resume': return 'resume';
            case 'reset': return 'reset';
            case 'suspend': return 'suspend';
            default: throw new Error(`Unsupported action: ${action}`);
        }
    }

    private calculateTotalStorage(config: any): number {
        let total = 0;
        Object.keys(config).forEach(key => {
            if (key.startsWith('virtio') || key.startsWith('scsi') || key.startsWith('ide')) {
                const match = config[key].match(/size=(\d+)G/);
                if (match) {
                    total += parseInt(match[1]);
                }
            }
        });
        return total;
    }

    private parseNetworkConfig(config: any): VMSpecs['network'] {
        const interfaces: Array<{ name: string; ip?: string; mac?: string }> = [];
        
        Object.keys(config).forEach(key => {
            if (key.startsWith('net')) {
                const netConfig = config[key];
                const macMatch = netConfig.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
                interfaces.push({
                    name: key,
                    mac: macMatch ? macMatch[0] : undefined
                });
            }
        });

        return { interfaces };
    }
}