# Arquitectura del Bot - BotTroner

## Resumen Ejecutivo

BotTroner implementa una **arquitectura en capas** con separación clara de responsabilidades, utilizando patrones de diseño modernos para mantener el código mantenible, testeable y escalable.

## Patrones Arquitectónicos

### 1. Arquitectura en Capas

```
┌─────────────────────────────────────────────┐
│         Capa de Presentación                │
│   (Events, Interactions, Components)        │
├─────────────────────────────────────────────┤
│        Capa de Aplicación                   │
│   (Handlers, Middlewares, Routers)         │
├─────────────────────────────────────────────┤
│      Capa de Lógica de Negocio             │
│  (Managers, Services, Builders)             │
├─────────────────────────────────────────────┤
│         Capa de Datos                       │
│        (Prisma ORM, Database)               │
├─────────────────────────────────────────────┤
│         Capa de Utilidades                  │
│  (Logger, Translator, Crypto, Perms)        │
└─────────────────────────────────────────────┘
```

#### Capa de Presentación
- **Ubicación**: `src/events/`, `src/components/`
- **Responsabilidad**: Recibir eventos de Discord y componentes de UI
- **Ejemplos**: `ready.ts`, `intractionCreate.ts`, botones, modales

#### Capa de Aplicación
- **Ubicación**: `src/handlers/`
- **Responsabilidad**: Enrutar y procesar solicitudes, aplicar middlewares
- **Componentes clave**:
  - `BaseHandler`: Clase base con patrón Template Method
  - `CommandHandler`, `ComponentHandler`, `AutocompleteHandler`
  - Sistema de middlewares con prioridades

#### Capa de Lógica de Negocio
- **Ubicación**: `src/class/`, `src/commands/`
- **Responsabilidad**: Implementar la lógica del dominio
- **Componentes clave**:
  - `VirtualizationManager`: Gestión de VMs y paneles
  - `Tickets`: Sistema de tickets
  - `CommandsLoader`, `EventsLoader`, `ComponentsLoader`

#### Capa de Datos
- **Ubicación**: `src/class/prismaClient.ts`, `prisma/`
- **Responsabilidad**: Abstracción de acceso a datos
- **ORM**: Prisma con MariaDB/MySQL

#### Capa de Utilidades
- **Ubicación**: `src/utils/`
- **Responsabilidad**: Funciones auxiliares reutilizables
- **Ejemplos**: Logger (Pino), crypto, traducciones, permisos

## Patrones de Diseño Implementados

### 1. Singleton Pattern
**Ubicación**: `src/class/loaders/base.ts`

Los loaders (CommandsLoader, EventsLoader, ComponentsLoader) implementan Singleton para garantizar una única instancia que gestiona el cache de recursos.

```typescript
export abstract class BaseLoader {
    protected static singleTone: BaseLoader | undefined;
    
    public static getInstance<T extends BaseLoader>(this: new (...args: any[]) => T): T {
        if (!this.singleTone) {
            throw new Error("getInstance() must be implemented in the derived class.");
        }
        return this.singleTone as T;
    }
}
```

### 2. Template Method Pattern
**Ubicación**: `src/handlers/core/BaseHandler.ts`

Define el esqueleto del algoritmo de manejo de interacciones:
1. Ejecutar middlewares
2. Ejecutar handler específico (método abstracto)
3. Manejar errores de forma centralizada

```typescript
async execute(context: HandlerContext<T>): Promise<void> {
    try {
        const middlewaresPassed = await this.executeMiddlewares(context);
        if (!middlewaresPassed) return;
        
        await this.handle(context); // Método abstracto
    } catch (error) {
        await this.handleError(error as Error, context);
    }
}
```

### 3. Middleware/Chain of Responsibility
**Ubicación**: `src/handlers/core/BaseHandler.ts`, `src/handlers/middlewares/`

Cadena de middlewares con prioridades que procesan contextos antes de llegar al handler principal.

```typescript
protected async executeMiddlewares(context: HandlerContext<T>): Promise<boolean> {
    for (const middleware of this.middlewares) {
        const result = await middleware.execute(context);
        if (result && !result.success) return false;
    }
    return true;
}
```

**Middlewares actuales**:
- `activityLogMiddleware`: Registra actividad (prioridad: 999)
- `ignoreComponentsMiddleware`: Filtra componentes ignorables

### 4. Strategy Pattern
**Ubicación**: `src/class/virtualization/`

Diferentes proveedores de virtualización implementan la interfaz `IVirtualizationProvider`:

```typescript
interface IVirtualizationProvider {
    connect(apiUrl: string, credentials: PanelCredentials): Promise<boolean>;
    disconnect(): Promise<void>;
    listVMs(): Promise<VMStatus[]>;
    executeAction(action: VMAction): Promise<VMActionResult>;
    // ...
}
```

**Implementaciones**:
- `ProxmoxProvider`: Soporte para Proxmox VE
- Futuro: VMware, Hyper-V, OpenStack

### 5. Facade Pattern
**Ubicación**: `src/class/extendClient.ts`

`ExtendedClient` actúa como fachada unificada para acceder a subsistemas complejos:

```typescript
export class ExtendedClient extends Client {
    get commands() { return this.commandsLoader.info; }
    get components() { return this.componentsLoader.info; }
    get virtualization() { return this.virtualizationManager; }
    get ticket() { return this.ticketSystem; }
    get prisma() { return this.#prisma; }
}
```

### 6. Factory Pattern
**Ubicación**: `VirtualizationManager.initializeProviders()`

Registra y crea instancias de proveedores de virtualización:

```typescript
private initializeProviders(): void {
    this.providers.set('proxmox', new ProxmoxProvider());
    // Futuro: más proveedores
}
```

### 7. Builder Pattern
**Ubicación**: `src/class/builders/CommandBuilder.ts`

Extiende `SlashCommandBuilder` de Discord.js para construir comandos de forma fluida:

```typescript
new CommandBuilder()
    .setName("ping")
    .setDescription("Responde con pong")
    .setRunner(async ({ interaction }) => {
        await interaction.reply("Pong!");
    });
```

## Flujo de Ejecución

### Flujo de Interacción (Comandos/Botones/Modales)

```
1. Discord Event (interactionCreate)
   ↓
2. Event Handler (src/events/basic/intractionCreate.ts)
   ↓
3. handleInteraction() Router (src/handlers/interactions.ts)
   ├─ isCommand() → CommandHandler
   ├─ isButton() → ButtonHandler (ComponentHandler)
   ├─ isSelectMenu() → SelectMenuHandler (ComponentHandler)
   ├─ isModalSubmit() → ModalHandler (ComponentHandler)
   └─ isAutocomplete() → AutocompleteHandler
   ↓
4. Middleware Chain (con prioridades)
   ├─ activityLogMiddleware (999)
   ├─ ignoreComponentsMiddleware
   └─ [otros middlewares custom]
   ↓
5. Handler.handle() - Ejecuta lógica específica
   ↓
6. Loaders obtienen recurso del cache
   ├─ CommandsLoader.info.get(commandName)
   ├─ ComponentsLoader.buttons.get(customId)
   └─ etc.
   ↓
7. Ejecuta runner/función de ejecución
   ↓
8. Servicios de Dominio (si aplica)
   ├─ Tickets.newTicket(), Tickets.close()
   ├─ VirtualizationManager.executeVMAction()
   └─ etc.
   ↓
9. Prisma ORM → Base de Datos
   ↓
10. Respuesta al usuario (interaction.reply)
```

### Flujo de Carga (Startup)

```
1. index.ts
   ↓
2. new ExtendedClient()
   ├─ Inicializa loaders
   ├─ Inicializa VirtualizationManager
   ├─ Inicializa TicketSystem
   └─ Configura intents y opciones
   ↓
3. client.start()
   ├─ client.login(token)
   ├─ virtualizationManager.monitor.start()
   └─ client.prepare()
   ↓
4. client.prepare()
   ├─ loadTranslations()
   ├─ commandsLoader.load()
   ├─ RegisterCommands() para cada guild
   ├─ eventsLoader.load()
   └─ componentsLoader.load()
   ↓
5. Loaders cargan módulos dinámicamente
   ├─ getFiles("commands") → import cada archivo
   ├─ Valida estructura (name, description, runner)
   └─ Almacena en Map/cache
   ↓
6. Bot listo (evento 'ready')
```

## Organización de Archivos

```
src/
├── class/                          # Clases core del dominio
│   ├── builders/                   # Builders para comandos, embeds, etc.
│   ├── loaders/                    # Loaders dinámicos (Singleton)
│   ├── tickets/                    # Sistema de tickets
│   ├── virtualization/             # Sistema de virtualización
│   ├── utils/                      # Utilidades de clase
│   ├── extendClient.ts             # Cliente extendido (Facade)
│   ├── gracefulShutdown.ts         # Manejo de shutdown
│   └── prismaClient.ts             # Cliente Prisma singleton
│
├── handlers/                       # Manejadores de lógica
│   ├── core/                       # Núcleo de handlers
│   │   └── BaseHandler.ts          # Template Method base
│   ├── interactions/               # Handlers de interacciones
│   ├── middlewares/                # Middlewares reutilizables
│   └── interactions.ts             # Router principal
│
├── commands/                       # Implementaciones de comandos
│   ├── admin/                      # Comandos de administración
│   ├── basic/                      # Comandos básicos
│   ├── tickets/                    # Comandos de tickets
│   └── virtualization/             # Comandos de VMs
│
├── components/                     # Componentes de UI interactivos
│   ├── tickets-buttons/            # Botones de tickets
│   ├── tickets-modals/             # Modales de tickets
│   └── virtualization-buttons/     # Botones de VMs
│
├── events/                         # Event listeners de Discord
│   ├── basic/                      # Eventos básicos
│   └── guilds/                     # Eventos de guilds
│
├── types/                          # Definiciones TypeScript
│
├── utils/                          # Utilidades globales
│   ├── logger.ts                   # Logger estructurado (Pino)
│   ├── translate.ts                # Sistema de traducciones
│   ├── crypto.ts                   # Encriptación/desencriptación
│   └── perms.ts                    # Sistema de permisos
│
└── index.ts                        # Punto de entrada
```

## Mejoras Implementadas

### 1. ✅ Singleton con Tipos Genéricos
**Antes**:
```typescript
protected static singleTone: any;
public static getInstance(): BaseLoader { ... }
```

**Después**:
```typescript
protected static singleTone: BaseLoader | undefined;
public static getInstance<T extends BaseLoader>(this: new (...args: any[]) => T): T { ... }
```

### 2. ✅ Eliminado @ts-ignore en ComponentHandler
**Antes**:
```typescript
// @ts-ignore
let customId = interaction.customId;
```

**Después**:
```typescript
if (!('customId' in interaction)) {
    throw new Error(`Interaction does not have customId property`);
}
let customId = interaction.customId;
```

### 3. ✅ Tipado Mejorado en ComponentHandlerOptions
**Antes**:
```typescript
interface ComponentHandlerOptions {
    clientKey: keyof any;
}
```

**Después**:
```typescript
interface ComponentHandlerOptions {
    clientKey: keyof ExtendedClient;
}
```

## Áreas de Mejora Identificadas

### 1. Consolidación de Handlers
**Problema**: Existen handlers duplicados/legacy (`handlers/ticket.ts`, `handlers/virtualization.ts`) que no siguen el patrón estándar.

**Solución Propuesta**: Migrar toda la lógica de routing a `handlers/interactions.ts` usando el patrón estándar con `BaseHandler`.

### 2. Repository Pattern
**Problema**: Acceso directo a Prisma desde múltiples lugares.

**Solución Propuesta**: Implementar capa Repository para abstracción de datos.

### 3. Service Layer
**Problema**: Lógica de negocio mezclada con handlers.

**Solución Propuesta**: Extraer lógica a servicios dedicados.

### 4. Error Handling Estandarizado
**Problema**: Manejo inconsistente de errores.

**Solución Propuesta**: Crear jerarquía de errores custom.

## Principios de Diseño Aplicados

### SOLID

#### Single Responsibility ✅
- Cada handler maneja un tipo específico de interacción
- Loaders solo cargan y cachean recursos
- Managers gestionan su dominio específico

#### Open/Closed ✅
- `BaseHandler` permite extensión sin modificación
- `IVirtualizationProvider` permite nuevos proveedores
- Sistema de middlewares extensible

#### Liskov Substitution ✅
- Cualquier `IVirtualizationProvider` es intercambiable
- Handlers derivados de `BaseHandler` son intercambiables

#### Interface Segregation ✅
- Interfaces específicas por funcionalidad

#### Dependency Inversion ⚠️
- **Mejorable**: Algunos componentes dependen de implementaciones concretas
- ✅ `VirtualizationManager` depende de abstracción

### DRY (Don't Repeat Yourself) ✅
- `BaseHandler` elimina código duplicado
- `BaseLoader` proporciona funcionalidad común
- Utilidades centralizadas

### KISS (Keep It Simple, Stupid) ✅
- Estructura de carpetas clara
- Flujo de ejecución lineal

## Conclusiones

### Fortalezas
1. **Arquitectura clara** con separación de responsabilidades
2. **Patrones de diseño bien aplicados**
3. **Extensibilidad** fácil para nuevos comandos/eventos
4. **Type Safety** con TypeScript modo estricto
5. **Logging estructurado** con Pino
6. **Modularidad** alta

### Oportunidades de Mejora
1. Consolidar handlers legacy
2. Implementar Repository Pattern
3. Extraer Service Layer
4. Estandarizar manejo de errores
5. Mejorar inyección de dependencias

### Recomendación Final
La arquitectura actual es **sólida y bien diseñada** para un bot de Discord. Las mejoras propuestas son incrementales y no requieren reescritura.
