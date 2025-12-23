import type { ExtendedClient } from "@class/extendClient";
import { Events, type Guild } from "discord.js";

export const name = Events.GuildDelete;
export const once = false;
export const active = true;

export const run = async (guild: Guild, client: ExtendedClient) => {
    try {
        client.logger.debug(`Bot fue removido del servidor: ${guild.name} (${guild.id})`);

        await client.prisma.guilds.delete({
            where: { id: guild.id }
        });
        
        client.logger.info(`Guild ${guild.name} eliminado de la base de datos`);
    } catch (error) {
        client.logger.error(error, `Error al manejar la eliminación del guild ${guild.name}`);
    }
};