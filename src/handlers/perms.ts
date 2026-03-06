import type { ExtendedClient } from "@src/class/extendClient";
import type { AutocompleteInteraction, ChatInputCommandInteraction, Interaction } from "discord.js";
import { EmbedBuilder, MessageFlags } from "discord.js";
import type { AllPerms } from "@src/types/permsTypes";

export async function handlePerms(interaction: Interaction, client: ExtendedClient) {
    if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction, client);
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guildId) {
        await interaction.reply({ content: "❌ Només es pot usar dins d'un servidor.", flags: MessageFlags.Ephemeral });
        return;
    }

    // Check perms management permission
    const member = interaction.member;
    const roleIds = member && "cache" in member.roles
        ? (member.roles as any).cache.map((r: any) => r.id)
        : (member?.roles as string[] ?? []);

    const subcommand = interaction.options.getSubcommand();
    const group = interaction.options.getSubcommandGroup(false);

    // Determine required permission for this action
    let requiredPerm: AllPerms | undefined;
    if (group === "role" && subcommand === "assign") requiredPerm = "perms:role:assign";
    else if (group === "role" && subcommand === "revoke") requiredPerm = "perms:role:revoke";
    else if (group === "user" && subcommand === "grant") requiredPerm = "perms:user:grant";
    else if (group === "user" && subcommand === "revoke") requiredPerm = "perms:user:revoke";
    else if (subcommand === "list") requiredPerm = "perms:list";

    if (requiredPerm) {
        const allowed = await client.permissions.hasPermission(
            interaction.guildId, interaction.user.id, roleIds, requiredPerm
        );
        if (!allowed) {
            await interaction.reply({ content: "❌ No tens permisos per executar aquesta acció.", flags: MessageFlags.Ephemeral });
            return;
        }
    }

    if (group === "role") {
        await handleRolePerms(interaction, client);
    } else if (group === "user") {
        await handleUserPerms(interaction, client);
    } else if (subcommand === "list") {
        await handleList(interaction, client);
    }
}

async function handleRolePerms(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole("role", true);
    const permission = interaction.options.getString("permission", true) as AllPerms;

    try {
        if (subcommand === "assign") {
            await client.permissions.assignRolePermission(
                interaction.guildId!,
                role.id,
                role.name,
                permission
            );
            await interaction.reply({
                content: `✅ Permís \`${permission}\` assignat al rol **${role.name}**.`,
                flags: MessageFlags.Ephemeral
            });
        } else if (subcommand === "revoke") {
            await client.permissions.revokeRolePermission(
                interaction.guildId!,
                role.id,
                permission
            );
            await interaction.reply({
                content: `✅ Permís \`${permission}\` revocat del rol **${role.name}**.`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error: any) {
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleUserPerms(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user", true);
    const permission = interaction.options.getString("permission", true) as AllPerms;

    try {
        if (subcommand === "grant") {
            const durationMinutes = interaction.options.getInteger("duration", false);
            const expiresAt = durationMinutes
                ? new Date(Date.now() + durationMinutes * 60 * 1000)
                : undefined;

            await client.permissions.grantUserPermission(
                interaction.guildId!,
                user.id,
                permission,
                interaction.user.id,
                expiresAt
            );

            const expiryText = expiresAt
                ? ` (expira <t:${Math.floor(expiresAt.getTime() / 1000)}:R>)`
                : "";

            await interaction.reply({
                content: `✅ Permís \`${permission}\` concedit a **${user.username}**${expiryText}.`,
                flags: MessageFlags.Ephemeral
            });
        } else if (subcommand === "revoke") {
            await client.permissions.revokeUserPermission(
                interaction.guildId!,
                user.id,
                permission
            );
            await interaction.reply({
                content: `✅ Permís \`${permission}\` revocat de **${user.username}**.`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error: any) {
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            flags: MessageFlags.Ephemeral
        });
    }
}

async function handleList(interaction: ChatInputCommandInteraction, client: ExtendedClient) {
    const targetUser = interaction.options.getUser("user", false);
    const targetRole = interaction.options.getRole("role", false);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTimestamp();

    if (targetUser) {
        const member = await interaction.guild!.members.fetch(targetUser.id);
        const roleIds = member.roles.cache.map(r => r.id);
        const perms = await client.permissions.getUserPermissions(
            interaction.guildId!, targetUser.id, roleIds
        );

        embed.setTitle(`🔑 Permisos de ${targetUser.username}`);

        const userPerms = perms.filter(p => p.source === "user");
        const rolePerms = perms.filter(p => p.source === "role");

        if (userPerms.length > 0) {
            embed.addFields({
                name: "👤 Permisos directes",
                value: userPerms.map(p => `\`${p.permission}\``).join(", ")
            });
        }

        if (rolePerms.length > 0) {
            // Group by roleId
            const byRole = new Map<string, string[]>();
            for (const p of rolePerms) {
                const arr = byRole.get(p.roleId!) ?? [];
                arr.push(p.permission);
                byRole.set(p.roleId!, arr);
            }
            for (const [roleId, permissions] of byRole) {
                embed.addFields({
                    name: `🏷️ Via <@&${roleId}>`,
                    value: permissions.map(p => `\`${p}\``).join(", ")
                });
            }
        }

        if (perms.length === 0) {
            embed.setDescription("Cap permís assignat.");
        }
    } else if (targetRole) {
        const perms = await client.permissions.getRolePermissions(
            interaction.guildId!, targetRole.id
        );

        embed.setTitle(`🏷️ Permisos del rol ${targetRole.name}`);
        if (perms.length > 0) {
            embed.setDescription(perms.map(p => `\`${p}\``).join(", "));
        } else {
            embed.setDescription("Cap permís assignat.");
        }
    } else {
        // List all available permissions
        const allPerms = await client.permissions.listAllPerms();
        embed.setTitle("📋 Tots els permisos disponibles");
        if (allPerms.length > 0) {
            const grouped = new Map<string, { name: string; desc: string | null }[]>();
            for (const p of allPerms) {
                const category = p.name.split(":")[0] ?? "";
                const arr = grouped.get(category) ?? [];
                arr.push({ name: p.name, desc: p.description });
                grouped.set(category, arr);
            }
            for (const [category, perms] of grouped) {
                embed.addFields({
                    name: `📂 ${category}`,
                    value: perms.map(p => `\`${p.name}\`${p.desc ? ` — ${p.desc}` : ""}`).join("\n")
                });
            }
        } else {
            embed.setDescription("No hi ha permisos definits.");
        }
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleAutocomplete(interaction: AutocompleteInteraction, client: ExtendedClient) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "permission") {
        const allPerms = await client.permissions.listAllPerms();
        const query = focused.value.toLowerCase();

        const filtered = allPerms
            .filter(p => p.name.toLowerCase().includes(query))
            .slice(0, 25)
            .map(p => ({
                name: p.description ? `${p.name} — ${p.description}` : p.name,
                value: p.name
            }));

        // Truncate name to max 100 chars (Discord limit)
        await interaction.respond(
            filtered.map(f => ({
                name: f.name.length > 100 ? f.name.substring(0, 97) + "..." : f.name,
                value: f.value
            }))
        );
    }
}
