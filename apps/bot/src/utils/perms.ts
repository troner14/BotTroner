import type { ExtendedClient } from "@src/class/extendClient";
import type { AllPerms } from "@bot/shared-types/bot/permsTypes";
import type { User } from "discord.js";

export const HavePerms = async (client: ExtendedClient, guildid: string, user: User, permid: AllPerms) => {
    const perfils_id = await client.prisma.perfils.findMany({
        select: {
            roleId: true
        },
        where: {
            perfil_permisos: {
                some: {
                    permisos: {
                        name: permid
                    }
                }
            }
        }
    })
    const member = await (await client.guilds.fetch(guildid)).members.fetch(user.id);
    let havePerms = false;

    for (const role of member.roles.cache.values()) {
        if (havePerms) break;
        for (const r of perfils_id) {
            if (role.id === r.roleId) {
                havePerms = true;
                break;
            }
        }
    }

    return havePerms

}