import type { ExtendedClient } from "@class/extendClient"
import { CommandsLoader } from "@src/class/loaders/Commands";
import { Events } from "discord.js"


export const name = Events.ClientReady;
export const once = false;
export const active = true;

export const run = async (client: ExtendedClient) => {
    client.logger.info(`${client.user?.username} is Ready! ${Date.now() - (client.readyTimestamp ?? 0)} ms`)

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

        const exisitingCommandsGuilds = await client.prisma.guilds_commandos.findMany({
            select: {
                guildId: true,
                CommId: true
            }
        });
        const commandsGuilds: { [key: string]: Set<string> } = {};

        for (const entry of exisitingCommandsGuilds) {
            if (!commandsGuilds[entry.guildId]) {
                commandsGuilds[entry.guildId] = new Set();
            }
            commandsGuilds[entry.guildId]!.add(entry.CommId);
        }

        const CommandsToAddDB: { guildId: string; CommId: string; enabled: boolean }[] = [];

        // Obtener las guilds que actualmente están en el bot
        const currentGuilds = client.guilds.cache.map(guild => guild.id);
        
        // Procesar guilds existentes con comandos en DB
        for (const guildId in commandsGuilds) {
            if (commandsGuilds.hasOwnProperty(guildId)) {
                // Solo procesar guilds que actualmente están en el bot
                if (!currentGuilds.includes(guildId)) {
                    client.logger.debug(`Saltando guild ${guildId}: no está en el bot actualmente`);
                    continue;
                }
                
                const commandSet = commandsGuilds[guildId];
                if (commandSet && commandSet.size > 0) {
                    availableCommandNames.forEach(cmdName => {
                        if (!commandSet.has(cmdName)) {
                            CommandsToAddDB.push({
                                guildId,
                                CommId: cmdName,
                                enabled: true
                            });
                        }
                    });
                }
            }
        }
        
        const GuildsToCreate = currentGuilds.filter(guildId => !commandsGuilds[guildId]);

        // Procesar guilds nuevas que no tienen comandos en DB
        for (const guildId of currentGuilds) {
            if (!commandsGuilds[guildId]) {
                client.logger.debug(`Guild nueva encontrada: ${guildId}, agregando todos los comandos`);
                availableCommandNames.forEach(cmdName => {
                    CommandsToAddDB.push({
                        guildId,
                        CommId: cmdName,
                        enabled: true
                    });
                });
            }
        }

        client.logger.debug(`Guilds nuevas a crear en DB: ${GuildsToCreate.length}`);
        if (GuildsToCreate.length > 0) {
            for (const guildId of GuildsToCreate) {
                await client.prisma.guilds.upsert({
                    where: { id: guildId },
                    update: { lang: "es-es" },
                    create: { id: guildId, lang: "es-es"}
                })
            }
        }

        client.logger.debug(`Comandos a agregar a DB: ${CommandsToAddDB.length}`);
        
        if (CommandsToAddDB.length === 0) {
            client.logger.info("No se encontraron comandos nuevos para sincronizar");
            return;
        }

        // Insertar comandos nuevos usando createMany con skipDuplicates
        try {
            const result = await client.prisma.guilds_commandos.createMany({
                data: CommandsToAddDB,
                skipDuplicates: true
            });

            const CommandLoader = CommandsLoader.getInstance();

            const uniqueGuilds = new Set(CommandsToAddDB.map(cmd => cmd.guildId));
            for (const guildId of uniqueGuilds) {
                await CommandLoader.refreshGuildCommands(guildId);
                await CommandLoader.RegisterCommands(guildId);
            }

                        
            client.logger.info(`✅ Sincronización completada: ${result.count} comandos nuevos agregados de ${CommandsToAddDB.length} intentados`);
        } catch (error) {
            client.logger.error({ error, totalAttempted: CommandsToAddDB.length }, "Error durante la inserción masiva de comandos");
            
            // Fallback: intentar inserción individual para identificar problemas específicos
            let individualSuccesses = 0;
            for (const cmd of CommandsToAddDB) {
                try {
                    await client.prisma.guilds_commandos.create({
                        data: cmd
                    });
                    individualSuccesses++;
                } catch (individualError: any) {
                    if (individualError.code !== 'P2002') {
                        client.logger.error({ error: individualError, command: cmd }, "Error insertando comando individual");
                    }
                    // P2002 (duplicate) se ignora silenciosamente
                }
            }
            
            if (individualSuccesses > 0) {
                client.logger.info(`✅ Fallback completado: ${individualSuccesses} comandos insertados individualmente`);
            }
        }

    } catch (error) {
        client.logger.error({ error }, "Error durante la sincronización de comandos");
    }
}