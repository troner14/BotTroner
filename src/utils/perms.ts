import type { ExtendedClient } from "@src/class/extendClient";
import type { AllPerms } from "@src/types/permsTypes";
import type { User } from "discord.js";

/**
 * Comprova si un usuari té un permís.
 * Delega al PermissionService centralitzat.
 * @deprecated Prefereix client.permissions.hasPermission() directament
 */
export const HavePerms = async (client: ExtendedClient, guildid: string, user: User, permid: AllPerms) => {
    const member = await (await client.guilds.fetch(guildid)).members.fetch(user.id);
    const userRoleIds = member.roles.cache.map(r => r.id);
    return client.permissions.hasPermission(guildid, user.id, userRoleIds, permid);
}
