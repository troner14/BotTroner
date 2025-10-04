import type { ExtendedClient } from "@class/extendClient";
import { Events, type Guild } from "discord.js";

export const name = Events.GuildCreate;
export const once = false;
export const active = true;

export const run = async (guild: Guild, client: ExtendedClient) => {
    try {
        client.logger.debug(`Bot se unió al servidor: ${guild.name} (${guild.id})`);

        await client.prisma.guilds.upsert({
            where: { id: guild.id },
            update: {
                lang: "es-es"
            },
            create: {
                id: guild.id,
                lang: "es-es"
            }
        });

        client.logger.info(`Guild ${guild.name} guardado en la base de datos`);


        const allCommands = client.commands;
        if (!allCommands) {
            client.logger.error("Commands no están disponibles");
            return;
        }
        const commandsToEnable: { guildId: string; CommId: string; enabled: boolean }[] = [];


        for (const [commandName, _] of allCommands) {
            commandsToEnable.push({
                guildId: guild.id,
                CommId: commandName,
                enabled: true
            });
        }

        if (commandsToEnable.length > 0) {
            await client.prisma.$transaction(
                commandsToEnable.map(cmd =>
                    client.prisma.guilds_commandos.upsert({
                        where: {
                            guildId_CommId: {
                                guildId: cmd.guildId,
                                CommId: cmd.CommId
                            }
                        },
                        update: {
                            enabled: cmd.enabled
                        },
                        create: cmd
                    })
                )
            );

            client.logger.debug(`Habilitados ${commandsToEnable.length} comandos para el servidor ${guild.name}`);
        }

        client.logger.info(`Configuración inicial completada para el servidor: ${guild.name}`);

    } catch (error) {
        client.logger.error({ ...(error as object), guildName: guild.name, guildId: guild.id }, "Error al configurar el servidor");
    }
};