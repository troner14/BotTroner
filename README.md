# BotTroner

![License](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![Bun](https://img.shields.io/badge/Bun-1.1-000000?logo=bun)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Discord.js](https://img.shields.io/badge/Discord.js-14.23-5865F2?logo=discord)

## Introducción

**BotTroner** es un bot de Discord sofisticado y modular, desarrollado con tecnologías web modernas. Diseñado para la escalabilidad y el alto rendimiento, aprovecha la velocidad del runtime **Bun** y la seguridad de tipos de **TypeScript**.

Este bot fue creado para solucionar el problema de poder dar una gestion de maquinas virtuales de forma comoda para pequeñas empresas de hosting desde el propio discord. tambien agrega un sistema de tickets para gestionar incidencias. 

---

## Video Demostrativo

<!-- 
    👇 PEGA TU ENLACE DE YOUTUBE/VIDEO AQUÍ 
    Ejemplo: [![Ver video](https://img.youtube.com/vi/TU_ID_DE_VIDEO/maxresdefault.jpg)](https://youtu.be/TU_ID_DE_VIDEO)
-->

En proceso

---

## Características Principales

BotTroner va más allá de los comandos simples, ofreciendo una integración completa de sistemas:

### Gestor de Virtualización (Control de VMs)
Interactúa directamente con tu infraestructura de servidores, ideal para flujos de trabajo DevSecOps.
- **Inicio/Parada/Reinicio**: Controla máquinas virtuales directamente desde botones en Discord.
- **Monitorización de Estado**: Feedback en tiempo real sobre la salud del servidor.

### Sistema de Tickets Avanzado
Un servicio de soporte profesional integrado en Discord.
- **Generación de Transcripciones**: Crea automáticamente archivos HTML con el historial de los tickets cerrados.
- **Compresión**: Archiva logs y transcripciones para almacenamiento a largo plazo.
- **Modales y Botones**: Interfaz interactiva y fácil de usar.

### Distribución de Anuncios
Sistema modular para difundir actualizaciones en múltiples canales o servidores.
- **Formularios Interactivos**: Usa modales para redactar anuncios formateados.
- **Entrega Específica**: Selecciona canales específicos para las actualizaciones.

### Ingeniería y Arquitectura
- **Tipado Seguro**: Código 100% TypeScript usando modo estricto.
- **Loaders Modulares**: Carga automatizada de comandos, eventos y componentes.
- **ORM de Base de Datos**: Integración con Prisma para consultas seguras (MariaDB/MySQL).
- **Runtime Bun**: Optimizado para alto rendimiento y tiempos de inicio rápidos.

---

## Stack Tecnológico

- **Runtime**: [Bun](https://bun.sh) - Un runtime de JavaScript "todo en uno" extremadamente rápido.
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) - Para tipado estático y mejor experiencia de desarrollo.
- **Framework**: [Discord.js](https://discord.js.org/) - Para la interacción con la API de Discord.
- **Base de Datos**: [Prisma](https://www.prisma.io/) (ORM) y MariaDB - Gestión robusta de datos.
- **Utilidades**: 
    - `html-minifier-terser`: Para optimizar el peso de las transcripciones.
    - `pino`: Para un sistema de logs estructurado listo para producción.

---

## Instalación y Configuración

Si deseas ejecutar este bot localmente para revisarlo:

1.  **Clonar el Repositorio**
    ```bash
    git clone https://github.com/troner14/BotTroner.git
    cd BotTroner
    ```

2.  **Instalar Dependencias**
    ```bash
    bun install
    ```

3.  **Configuración de Entorno**
    Copia el archivo de ejemplo y configura tus credenciales:
    ```bash
    cp .env.example .env
    ```
    *Rellena `DISCORD_TOKEN`, `DATABASE_URL`, etc.*

4.  **Configurar Base de Datos**
    ```bash
    bunx prisma generate
    bunx prisma db push
    ```

5.  **Iniciar el Bot**
    ```bash
    bun start
    ```

---

## Contacto

¿Interesado en mi trabajo? ¡No dudes en contactarme!

- **Portafolio**: En processo
- **LinkedIn**: [Enlace a tu LinkedIn](https://linkedin.com/in/gerard-bardeli-martinez-245010326)
- **Email**: [correo electronico](mailto:bardeliger@gmail.com)

---
*Desarrollado con ❤️ por Troner14*
