/**
 * Interfaces base para el sistema de virtualización
 */

export interface VMSpecs {
    cpu: number;
    memory: number; // MB
    storage: number; // GB
    network?: {
        interfaces: Array<{
            name: string;
            ip?: string;
            mac?: string;
        }>;
    };
}

export interface VMStatus {
    id: string;
    name: string;
    status: 'running' | 'stopped' | 'paused' | 'suspended' | 'unknown';
    uptime?: number; // segundos
    cpu_usage?: number; // porcentaje
    memory_usage?: number; // MB
    network_traffic?: {
        rx_bytes: number;
        tx_bytes: number;
    };
}

export interface VMAction {
    type: 'start' | 'stop' | 'restart' | 'pause' | 'resume' | 'reset' | 'suspend';
    vmId: string;
    options?: Record<string, any>;
}

export interface VMActionResult {
    success: boolean;
    message: string;
    taskId?: string; // Para operaciones asíncronas
    error?: string;
    metadata?: Record<string, any>;
}

export interface PanelCredentials {
    type: 'token' | 'userpass' | 'certificate';
    data: {
        token?: string;
        username?: string;
        password?: string;
        certificate?: string;
        additionalParams?: Record<string, any>;
    };
}

export interface PanelConfig {
    timeout?: number;
    retries?: number;
    rateLimit?: {
        requests: number;
        window: number; // ms
    };
    features?: {
        supportsConsole: boolean;
        supportsSnapshots: boolean;
        supportsClone: boolean;
        supportsTemplate: boolean;
    };
}

/**
 * Interface principal para cualquier proveedor de virtualización
 */
export interface IVirtualizationProvider {
    readonly name: string;
    readonly type: string;
    readonly version?: string;

    // Conexión y autenticación
    connect(apiUrl: string, credentials: PanelCredentials, config?: PanelConfig): Promise<boolean>;
    disconnect(): Promise<void>;
    testConnection(): Promise<boolean>;

    // Gestión de VMs
    listVMs(): Promise<VMStatus[]>;
    getVM(vmId: string): Promise<VMStatus | null>;
    executeAction(action: VMAction): Promise<VMActionResult>;
    
    // Información del sistema
    getSystemInfo(): Promise<{
        nodes?: Array<{ name: string; status: string; resources: any }>;
        version: string;
        features: string[];
    }>;

    // Gestión de recursos
    getVMSpecs(vmId: string): Promise<VMSpecs | null>;
    updateVMSpecs(vmId: string, specs: Partial<VMSpecs>): Promise<VMActionResult>;

    // Logs y monitoring
    getVMLogs(vmId: string, lines?: number): Promise<string[]>;
    getVMConsoleUrl(vmId: string): Promise<string | null>;
}

/**
 * Resultado de operaciones del manager
 */
export interface ManagerResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    provider?: string;
}

/**
 * Configuración del panel en la BD
 */
export interface PanelDBConfig {
    id: number;
    guildId: string;
    name: string;
    type: string;
    apiUrl: string;
    credentials: PanelCredentials;
    config?: PanelConfig;
    active: boolean;
    isDefault: boolean;
}