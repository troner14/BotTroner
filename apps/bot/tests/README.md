# Tests Documentation

Este directorio contiene todos los tests para el bot BotTroner usando el sistema de testing integrado de Bun.

## Estructura de Tests

```
tests/
├── setup.ts                     # Configuración global de tests
├── mocks/                       # Mocks y objetos de prueba
│   ├── discord.mock.ts         # Mocks para Discord.js
│   └── prisma.mock.ts          # Mocks para Prisma Client
├── unit/                       # Tests unitarios
│   ├── CommandBuilder.test.ts  # Tests para CommandBuilder
│   ├── CommandsLoader.test.ts  # Tests para CommandsLoader 
│   ├── CommandHandler.test.ts  # Tests para CommandHandler
│   └── file.utils.test.ts      # Tests para utilidades de archivos
└── integration/                # Tests de integración
    └── command-flow.test.ts    # Tests de flujo completo de comandos
```

## Scripts de Testing

### Ejecutar todos los tests
```bash
bun test
```

### Ejecutar tests en modo watch
```bash
bun run test:watch
```

### Ejecutar tests con cobertura
```bash
bun run test:coverage
```

### Ejecutar solo tests unitarios
```bash
bun run test:unit
```

### Ejecutar solo tests de integración
```bash
bun run test:integration
```

## Características de los Tests

### ✅ Tests Implementados

1. **CommandBuilder Tests**
   - Constructor y propiedades básicas
   - Validación de enabled/disabled
   - Gestión de runner y autocomplete
   - Integración con SlashCommandBuilder
   - Ejemplo de comando completo

2. **CommandsLoader Tests**
   - Creación de instancia y singleton
   - Validación de comandos
   - Registro de comandos en guilds
   - Manejo de errores
   - Recarga de comandos

3. **CommandHandler Tests**
   - Ejecución de comandos existentes
   - Manejo de comandos inexistentes
   - Gestión de errores en ejecución
   - Paso de argumentos correctos

4. **Integration Tests**
   - Flujo completo de ejecución de comandos
   - Manejo de errores end-to-end
   - Validación de comandos complejos

### 🧪 Mocks Disponibles

- **MockClient**: Cliente de Discord simulado con guilds y métodos básicos
- **MockInteraction**: Interacción de Discord con reply, options, etc.
- **MockPrismaClient**: Cliente de Prisma con métodos de base de datos simulados

### 🛠️ Configuración

- **Environment**: Configurado para testing con variables de entorno apropiadas
- **Database**: Base de datos en memoria para tests
- **Logging**: Nivel de log silencioso durante tests

## Mejores Prácticas

1. **Aislamiento**: Cada test es independiente con mocks limpiados
2. **Descriptivos**: Nombres de tests claros y descriptivos
3. **Cobertura**: Tests cubren casos happy path y edge cases
4. **Performance**: Tests rápidos usando mocks en lugar de servicios reales

## Agregar Nuevos Tests

Para agregar nuevos tests:

1. Crear archivo `.test.ts` en la carpeta apropiada (unit/integration)
2. Importar las utilidades necesarias de `bun:test`
3. Usar los mocks existentes o crear nuevos según necesidad
4. Seguir la estructura de describe/test existente
5. Ejecutar `bun test` para verificar

## Coverage

Los tests actuales cubren:
- ✅ Clases principales (CommandBuilder, Loaders)
- ✅ Handlers de interacciones
- ✅ Flujos de comandos
- ✅ Validaciones y errores
- ⚠️ Utilidades (parcial)
- ❌ Database migrations (pendiente)
- ❌ Event handlers (pendiente)

## CI/CD

Los tests están configurados para ejecutarse automáticamente en:
- Pull requests
- Push a main branch
- Releases

Para configuración de CI, ver `.github/workflows/` (cuando se implemente).