# @bot/virtualization

Package de gestión de virtualización para múltiples proveedores (Proxmox, VMware, Hyper-V, etc.)

## Características

- ✅ Soporte multi-proveedor (actualmente Proxmox, extensible a otros)
- ✅ Gestión de múltiples paneles por guild
- ✅ Sistema de permisos por VM
- ✅ Logging de acciones
- ✅ Caché de conexiones
- ✅ Validación de credenciales
- ✅ Sistema de errores tipado

## Instalación

Este es un package interno del workspace. Se instala automáticamente con:

```bash
bun install
```

## Uso Básico

```typescript
import { VirtualizationManager } from "@bot/virtualization";
import { prisma } from "@bot/database";

// Crear instancia del manager
const manager = new VirtualizationManager(prisma);

// Agregar un panel
const result = await manager.addPanel(
  "guild-id",
  "Mi Proxmox",
  "proxmox",
  "https://proxmox.example.com:8006",
  {
    username: "user@pam",
    password: "password",
    realm: "pam"
  }
);

// Listar VMs de un panel
const vms = await manager.listVMs(panelId);

// Ejecutar acción en una VM
await manager.executeVMAction(
  panelId,
  { vmId: "100", type: "start" },
  "user-id",
  "guild-id"
);
```

## Extendiendo el Manager

Para funcionalidades específicas de Discord (como el monitor), se puede extender la clase:

```typescript
import { VirtualizationManager } from "@bot/virtualization";

export class DiscordVirtualizationManager extends VirtualizationManager {
    public monitor: VirtualizationMonitor | null = null;

    setMonitor(monitor: VirtualizationMonitor): void {
        this.monitor = monitor;
    }
}
```

## API Principal

### `VirtualizationManager`

#### Gestión de Paneles

- `getPanelsByGuild(guildId: string)` - Obtener paneles de un guild
- `addPanel(...)` - Agregar nuevo panel
- `removePanel(panelId: number)` - Eliminar panel
- `getPanel(panelId: number)` - Obtener panel específico
- `connectToPanel(panelId: number)` - Conectar y cachear panel

#### Gestión de VMs

- `listVMs(panelId: number)` - Listar todas las VMs
- `getVM(panelId: number, vmId: string)` - Obtener VM específica
- `executeVMAction(...)` - Ejecutar acción en VM

#### Permisos y Logging

- `checkVMPermission(...)` - Verificar permisos de usuario
- `logVMAction(...)` - Registrar acción en la BD

#### Utilidades

- `getSystemInfo(panelId: number)` - Info del sistema
- `getStats(guildId: string)` - Estadísticas generales
- `getAvailableProviders()` - Proveedores disponibles
- `validatePanelCredentials(...)` - Validar credenciales
- `disconnectAll()` - Desconectar todos los paneles

## Tipos y Interfaces

```typescript
import type {
  IVirtualizationProvider,
  PanelDBConfig,
  VMStatus,
  VMAction,
  VMActionResult,
  ManagerResult,
  PanelCredentials
} from "@bot/virtualization";
```

## Errores

```typescript
import { 
  VirtualizationError, 
  VirtualizationErrorCode 
} from "@bot/virtualization";

// Códigos de error disponibles:
- AUTH_FAILED
- CONNECTION_FAILED
- RESOURCE_NOT_FOUND
- ACTION_FAILED
- VALIDATION_FAILED
- UNKNOWN_ERROR
- UNSUPPORTED_PROVIDER
- VM_NOT_FOUND
```

## Estructura

```
packages/virtualization/
├── src/
│   ├── index.ts                    # Exports principales
│   ├── VirtualizationManager.ts    # Manager principal
│   ├── errors.ts                   # Sistema de errores
│   ├── interfaces/
│   │   └── IVirtualizationProvider.ts
│   └── providers/
│       ├── BaseProvider.ts
│       └── ProxmoxProvider.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Desarrollar Nuevos Proveedores

Para añadir soporte a un nuevo proveedor:

1. Crear clase que extienda `BaseProvider`
2. Implementar la interfaz `IVirtualizationProvider`
3. Registrar en `VirtualizationManager.initializeProviders()`

```typescript
import { BaseProvider } from "./BaseProvider";
import type { IVirtualizationProvider } from "../interfaces/IVirtualizationProvider";

export class MyProvider extends BaseProvider implements IVirtualizationProvider {
    readonly type = "myprovider";
    
    async connect(...) { /* ... */ }
    async listVMs() { /* ... */ }
    // ... implementar métodos requeridos
}
```

## Dependencias

- `@bot/database` - Acceso a Prisma
- `@bot/logger` - Sistema de logging
