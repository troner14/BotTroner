// Mock específico para prevenir carga de archivos reales en CI
import { mock } from "bun:test";

// Mock de getFiles para prevenir lectura real de archivos
export const mockGetFiles = mock(() => {
    if (process.env.CI || process.env.NODE_ENV === "test") {
        // En CI, devolver archivos mock en lugar de leer el filesystem
        return [
            "/mock/commands/ping.ts",
            "/mock/commands/sync.ts"
        ];
    }
    // En desarrollo local, usar la función real
    return [];
});

// Mock de importación dinámica para CI
export const mockDynamicImport = mock(async (path: string) => {
    if (process.env.CI || process.env.NODE_ENV === "test") {
        // En CI, devolver comandos mock
        if (path.includes("ping")) {
            return {
                default: {
                    name: "ping",
                    description: "Mock ping command",
                    enabled: true,
                    runner: mock()
                }
            };
        }
        if (path.includes("sync")) {
            return {
                default: {
                    name: "sync",
                    description: "Mock sync command", 
                    enabled: true,
                    runner: mock()
                }
            };
        }
    }
    // Fallback para desarrollo local
    return null;
});

// Configuración de mocks para CI
export const setupCIMocks = () => {
    if (process.env.CI) {
        console.log("🎭 Setting up CI-specific mocks to prevent file system access");
        
        // En Bun, los mocks se configuran de manera diferente
        // Los mocks específicos se aplican en cada test según sea necesario
    }
};