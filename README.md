# NewBot 🤖

Un bot de Discord modular construido con TypeScript, Bun y Prisma para uso público y contribuciones de la comunidad.

## 🚀 Características

- ✅ Arquitectura modular con loaders automáticos
- ✅ Sistema de comandos slash con builders
- ✅ Manejo de eventos y componentes
- ✅ Integración con base de datos (Prisma)
- ✅ Sistema de logging avanzado
- ✅ Soporte para múltiples guilds
- ✅ TypeScript con tipos estrictos
- ✅ Sistema de tickets con transcripciones comprimidas

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/newbot.git
cd newbot

# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tu token de Discord y configuración de BD

# Configurar base de datos
bunx prisma generate
bunx prisma db push
```

## 🚀 Uso

```bash
# Desarrollo
bun run start

# Generar tipos automáticamente
bun run script:folder
bun run script:translation
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia **AGPL-3.0** - ver el archivo [LICENSE](LICENSE) para más detalles.

### Términos de Uso

- ✅ **Uso público**: Libre para usar el bot
- ✅ **Contribuciones**: PRs y mejoras bienvenidas
- ❌ **Distribución comercial**: Prohibida sin autorización
- ❌ **Monetización**: No permitida sin permiso explícito

## 📞 Soporte

Si tienes preguntas o necesitas ayuda, puedes:
- Abrir un [Issue](https://github.com/tuusuario/newbot/issues)
- Contactar al desarrollador

---

Construido con ❤️ usando [Bun](https://bun.sh) y [Discord.js](https://discord.js.org)
