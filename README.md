# BotTroner 🤖

Un bot de Discord modular construido con TypeScript, Bun, Prisma y Turborepo. Arquitectura monorepo con bot, API REST y dashboard web.

## 🏗️ Arquitectura Monorepo

```
newBot/
├── apps/
│   ├── bot/          # Discord Bot (Discord.js + Bun)
│   ├── api/          # REST API (Hono + Bun)
│   └── dashboard/    # Web Dashboard (Vue 3 + Vite)
├── packages/
│   ├── database/     # Prisma Client compartido
│   ├── shared-types/ # TypeScript types compartidos
│   └── logger/       # Sistema de logging compartido
└── turbo.json        # Configuración de Turborepo
```

## 🚀 Características

### Bot de Discord
- ✅ Arquitectura modular con loaders automáticos
- ✅ Comandos slash con builders type-safe
- ✅ Sistema de eventos y componentes
- ✅ Sistema de tickets con transcripciones
- ✅ Gestión de virtualización (Proxmox)
- ✅ Sistema de permisos granular
- ✅ Soporte multi-idioma

### API REST
- ✅ Endpoints para dashboard
- ✅ Autenticación OAuth Discord
- ✅ Rate limiting y seguridad
- ✅ Built con Hono (ultra-rápido)

### Dashboard
- ✅ Interfaz web moderna (Vue 3)
- ✅ Gestión de servidores
- ✅ Panel de tickets
- ✅ Estadísticas y métricas

### Shared Packages
- ✅ Base de datos compartida (Prisma)
- ✅ Tipos TypeScript centralizados
- ✅ Sistema de logging unificado
- ✅ Hot module reloading en desarrollo

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/troner14/BotTroner.git
cd newBot

# Instalar dependencias (instala todos los workspaces)
bun install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tu configuración

# Generar Prisma Client
bun run generate:DB

# Push schema a la base de datos
cd packages/database
bun run db:push
```

## 🚀 Desarrollo

```bash
# Ejecutar todo (bot + api + dashboard)
bun dev

# Ejecutar solo el bot
bun dev --filter=@bot/bot

# Ejecutar solo la API
bun dev --filter=@bot/api

# Ejecutar solo el dashboard
bun dev --filter=@bot/dashboard
```

## 🏭 Producción

```bash
# Build de todos los proyectos
bun build

# Build de un proyecto específico
bun build --filter=@bot/bot

# Ejecutar en producción
bun start
```

## 📦 Scripts Disponibles

### Root (monorepo)
```bash
bun dev              # Desarrollo de todas las apps
bun build            # Build de todas las apps
bun test             # Tests de todos los workspaces
bun generate:DB      # Generar Prisma Client
```

### Bot
```bash
cd apps/bot
bun dev              # Ejecutar bot en desarrollo
bun test             # Tests unitarios e integración
bun script:folder    # Generar tipos de carpetas
bun script:translation # Generar tipos de traducciones
```

### API
```bash
cd apps/api
bun dev              # Servidor API en puerto 3001
bun build            # Build para producción
```

### Dashboard
```bash
cd apps/dashboard
bun dev              # Dev server en puerto 3000
bun build            # Build estático
```

## 🗃️ Base de Datos

```bash
# Generar Prisma Client
bun run generate:DB

# Push cambios al schema
cd packages/database
bun run db:push

# Abrir Prisma Studio
bun run db:studio

# Crear nueva migración
bun run db:migrate
```

## 📝 Variables de Entorno

```env
# Discord Bot
botToken=tu_token_discord
DISCORD_CLIENT_ID=tu_client_id
DISCORD_CLIENT_SECRET=tu_client_secret

# Database
DATABASE_URL=mysql://user:pass@localhost:3306/botdb

# API
API_PORT=3001
JWT_SECRET=tu_secret_jwt

# Environment
NODE_ENV=development
LOG_LEVEL=debug
```

## 🏗️ Estructura del Proyecto

### Apps
- **bot**: Bot de Discord con comandos, eventos y handlers
- **api**: API REST para el dashboard
- **dashboard**: Aplicación web Vue 3

### Packages
- **database**: Cliente Prisma compartido entre bot y API
- **shared-types**: Tipos TypeScript compartidos
- **logger**: Sistema de logging con Pino para todas las apps

## 🧪 Testing

```bash
# Tests de todo el monorepo
bun test

# Tests solo del bot
bun test --filter=@bot/bot

# Tests con coverage
bun test:coverage

# Tests en modo watch
bun test:watch
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios usando [Conventional Commits](https://www.conventionalcommits.org/)
   ```
   feat: add new command
   fix: resolve ticket creation bug
   docs: update README
   ```
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

### Guidelines
- Mantén la arquitectura modular del monorepo
- Escribe tests para nuevas funcionalidades
- Actualiza la documentación cuando sea necesario
- Sigue las convenciones de código (TypeScript strict mode)

## 🔧 Tecnologías

- **Runtime**: [Bun](https://bun.sh) - JavaScript runtime ultra-rápido
- **Bot**: [Discord.js](https://discord.js.org) v14
- **API**: [Hono](https://hono.dev) - Framework web ligero
- **Frontend**: [Vue 3](https://vuejs.org) + [Vite](https://vitejs.dev)
- **Database**: [Prisma](https://prisma.io) + MariaDB/MySQL
- **Monorepo**: [Turborepo](https://turbo.build) - Build system
- **Logging**: [Pino](https://getpino.io) - Logger de alto rendimiento
- **Types**: TypeScript 5.x con strict mode

## 📞 Soporte

Si tienes preguntas o necesitas ayuda:
- Abre un [Issue](https://github.com/troner14/BotTroner/issues)
- Lee la [documentación en el código](./apps/bot/src)
- Revisa los [tests](./apps/bot/tests) para ejemplos de uso

## 📝 Licencia

Este proyecto está bajo la licencia **AGPL-3.0** - ver el archivo [LICENSE](LICENSE) para más detalles.

### Términos de Uso

- ✅ **Uso público**: Libre para usar el bot
- ✅ **Contribuciones**: PRs y mejoras bienvenidas
- ✅ **Fork**: Puedes hacer fork y modificar
- ❌ **Distribución comercial**: Prohibida sin autorización
- ❌ **Monetización**: No permitida sin permiso explícito
- ⚠️ **Atribución**: Debes mantener los créditos originales

---

Construido con ❤️ por [Troner14](https://github.com/troner14)

Powered by [Bun](https://bun.sh), [Discord.js](https://discord.js.org), [Turborepo](https://turbo.build), [Vue](https://vuejs.org) y [Prisma](https://prisma.io)
