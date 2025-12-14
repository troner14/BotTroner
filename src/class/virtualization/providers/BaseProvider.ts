import type { Logger } from "pino";
import logger from "@utils/logger";
import type {
    IVirtualizationProvider,
    VMStatus,
    VMAction,
    VMActionResult,
    PanelCredentials,
    PanelConfig,
    VMSpecs
} from "@class/virtualization/interfaces/IVirtualizationProvider";

/**
 * Clase base abstracta para todos los proveedores de virtualización
 */
import {
    VirtualizationError,
    ConnectionError,
    AuthenticationError,
    ValidationError,
    ResourceNotFoundError
} from "../errors";
import { VirtualizationCache } from "../utils/cache";

/**
 * Clase base abstracta para todos los proveedores de virtualización
 */
export abstract class BaseVirtualizationProvider implements IVirtualizationProvider {
    protected logger: Logger;
    protected apiUrl: string = "";
    protected credentials: PanelCredentials | null = null;
    protected config: PanelConfig = {};
    protected connected: boolean = false;
    protected cache: VirtualizationCache;

    constructor(
        public readonly name: string,
        public readonly type: string,
        public readonly version?: string
    ) {
        this.logger = logger.child({
            module: `${this.constructor.name}`,
            provider: this.type
        });
        this.cache = new VirtualizationCache();
    }

    // Métodos de conexión
    async connect(apiUrl: string, credentials: PanelCredentials, config: PanelConfig = {}): Promise<boolean> {
        try {
            this.apiUrl = apiUrl;
            this.credentials = credentials;
            this.config = { ...this.getDefaultConfig(), ...config };

            this.logger.info(`Connecting to ${this.type} at ${apiUrl}`);

            const success = await this.performConnect();
            this.connected = success;

            if (success) {
                this.logger.info(`Successfully connected to ${this.type}`);
            } else {
                this.logger.error(`Failed to connect to ${this.type}`);
            }

            return success;
        } catch (error) {
            this.logger.error({ error }, `Error connecting to ${this.type}`);
            this.connected = false;
            if (error instanceof VirtualizationError) throw error;
            throw new ConnectionError(`Failed to connect: ${(error as Error).message}`, error);
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.connected) {
                await this.performDisconnect();
                this.connected = false;
                this.logger.info(`Disconnected from ${this.type}`);
            }
        } catch (error) {
            this.logger.error({ error }, `Error disconnecting from ${this.type}`);
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            if (!this.connected) {
                return false;
            }
            return await this.performConnectionTest();
        } catch (error) {
            this.logger.error({ error }, `Connection test failed for ${this.type}`);
            return false;
        }
    }

    // Validación común
    protected validateConnection(): void {
        if (!this.connected || !this.credentials) {
            throw new ConnectionError(`Not connected to ${this.type} provider`);
        }
    }

    protected validateVMId(vmId: string): void {
        if (!vmId || vmId.trim() === '') {
            throw new ValidationError('VM ID is required');
        }
    }

    // Configuración por defecto
    protected getDefaultConfig(): PanelConfig {
        return {
            timeout: 30000,
            retries: 3,
            rateLimit: {
                requests: 10,
                window: 1000
            },
            features: {
                supportsConsole: true,
                supportsSnapshots: true,
                supportsClone: true,
                supportsTemplate: true
            },
            cache: {
                enabled: true,
                ttl: 60 // 1 minute default
            }
        };
    }

    // Métodos que deben implementar las clases hijas
    protected abstract performConnect(): Promise<boolean>;
    protected abstract performDisconnect(): Promise<void>;
    protected abstract performConnectionTest(): Promise<boolean>;

    // Métodos principales de la interfaz que deben implementar las clases hijas
    abstract listVMs(): Promise<VMStatus[]>;
    abstract getVM(vmId: string): Promise<VMStatus | null>;
    abstract executeAction(action: VMAction): Promise<VMActionResult>;
    abstract getSystemInfo(): Promise<any>;
    abstract getVMSpecs(vmId: string): Promise<VMSpecs | null>;
    abstract updateVMSpecs(vmId: string, specs: Partial<VMSpecs>): Promise<VMActionResult>;
    abstract getVMLogs(vmId: string, lines?: number): Promise<string[]>;
    abstract getVMConsoleUrl(vmId: string): Promise<string | null>;

    // Métodos utilitarios comunes
    protected async makeRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        data?: any,
        headers?: Record<string, string>
    ): Promise<T> {
        const url = `${this.apiUrl}${endpoint}`;
        const requestOptions: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...headers
            },
            signal: AbortSignal.timeout(this.config.timeout || 30000)
        };

        if (data) {
            if (headers?.["Content-Type"] === "application/x-www-form-urlencoded") {
                requestOptions.body = data; // Assuming data is URLSearchParams or string
            } else {
                requestOptions.body = JSON.stringify(data);
            }
        }

        this.logger.debug(`Making ${method} request to ${url}`);

        try {
            const response = await fetch(url, requestOptions);

            if (!response.ok) {
                const errorText = await response.text();

                if (response.status === 401 || response.status === 403) {
                    throw new AuthenticationError(`Authentication failed: ${response.statusText}`, undefined, { status: response.status, body: errorText });
                }

                if (response.status === 404) {
                    throw new ResourceNotFoundError('Resource', endpoint, undefined);
                }

                if (response.status === 400) {
                    throw new ValidationError(`Validation failed: ${errorText}`);
                }

                throw new ConnectionError(`HTTP ${response.status}: ${errorText}`, undefined, { status: response.status });
            }

            return await response.json() as T;
        } catch (error) {
            if (error instanceof VirtualizationError) throw error;
            throw new ConnectionError(`Request failed: ${(error as Error).message}`, error);
        }
    }

    protected abstract getAuthHeaders(): Record<string, string>;

    // Rate limiting simple
    private lastRequestTime = 0;
    private requestCount = 0;

    protected async checkRateLimit(): Promise<void> {
        const now = Date.now();
        const { requests, window } = this.config.rateLimit || { requests: 10, window: 1000 };

        if (now - this.lastRequestTime > window) {
            this.requestCount = 0;
            this.lastRequestTime = now;
        }

        if (this.requestCount >= requests) {
            const waitTime = window - (now - this.lastRequestTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.lastRequestTime = Date.now();
        }

        this.requestCount++;
    }

    // Retry logic
    protected async withRetry<T>(operation: () => Promise<T>, retries?: number): Promise<T> {
        const maxRetries = retries ?? this.config.retries ?? 3;
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.checkRateLimit();
                return await operation();
            } catch (error) {
                lastError = error as Error;
                this.logger.warn(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError!;
    }
}