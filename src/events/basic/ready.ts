import type {ExtendedClient} from "@class/extendClient"
import { Events } from "discord.js"


export const name = Events.ClientReady;
export const once = true;
export const active = true;

export const run = async (client: ExtendedClient) => {
    client.logger.info(`${client.user?.username} is Ready! ${Date.now()- (client.readyTimestamp ?? 0)} ms`)
    
    // Sincronizar comandos nuevos con todas las guilds
    await syncNewCommandsToAllGuilds(client);
}

/**
 * Sincroniza comandos nuevos con todas las guilds existentes
 */
async function syncNewCommandsToAllGuilds(client: ExtendedClient) {
    try {
        client.logger.debug("Iniciando sincronización de comandos...");
        
        // 1. Obtener todos los comandos disponibles actualmente
        const availableCommands = client.commands;
        if (!availableCommands || availableCommands.size === 0) {
            client.logger.warn("No hay comandos disponibles para sincronizar");
            return;
        }
        
        const availableCommandNames = Array.from(availableCommands.keys());
        client.logger.debug(`Comandos disponibles: ${availableCommandNames.join(", ")}`);
        
        // 2. Obtener todos los comandos únicos que ya están en la BD
        const existingCommands = await client.prisma.guilds_commandos.findMany({
            select: { CommId: true },
            distinct: ['CommId']
        });
        
        const existingCommandNames = existingCommands.map(cmd => cmd.CommId);
        client.logger.debug(`Comandos existentes en BD: ${existingCommandNames.join(", ")}`);
        
        // 3. Identificar comandos nuevos
        const newCommands = availableCommandNames.filter(cmdName => 
            !existingCommandNames.includes(cmdName)
        );
        
        if (newCommands.length === 0) {
            client.logger.debug("No hay comandos nuevos para sincronizar");
            return;
        }
        
        client.logger.info(`Encontrados ${newCommands.length} comandos nuevos: ${newCommands.join(", ")}`);
        
        // 4. Obtener todas las guilds existentes
        const allGuilds = await client.prisma.guilds.findMany({
            select: { id: true }
        });
        
        if (allGuilds.length === 0) {
            client.logger.debug("No hay guilds en la BD para sincronizar");
            return;
        }
        
        client.logger.debug(`Sincronizando con ${allGuilds.length} guilds`);
        
        // 5. Crear entradas para todos los comandos nuevos en todas las guilds
        const commandsToCreate: { guildId: string; CommId: string; enabled: boolean }[] = [];
        
        for (const guild of allGuilds) {
            for (const commandName of newCommands) {
                commandsToCreate.push({
                    guildId: guild.id,
                    CommId: commandName,
                    enabled: true // Habilitar por defecto
                });
            }
        }
        
        // 6. Insertar todos los comandos nuevos usando transacciones por lotes
        const batchSize = 100; // Procesar en lotes para evitar timeouts
        const batches = [];
        
        for (let i = 0; i < commandsToCreate.length; i += batchSize) {
            batches.push(commandsToCreate.slice(i, i + batchSize));
        }
        
        let totalCreated = 0;
        for (const batch of batches) {
            await client.prisma.$transaction(
                batch.map(cmd =>
                    client.prisma.guilds_commandos.create({
                        data: cmd
                    })
                )
            );
            totalCreated += batch.length;
            client.logger.debug(`Procesado lote: ${totalCreated}/${commandsToCreate.length} entradas`);
        }
        
        client.logger.info(`✅ Sincronización completada: ${totalCreated} entradas de comandos creadas para ${newCommands.length} comandos nuevos en ${allGuilds.length} guilds`);
        
    } catch (error) {
        client.logger.error({ error }, "Error durante la sincronización de comandos");
    }
}