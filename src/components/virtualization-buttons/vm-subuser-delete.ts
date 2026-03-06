import type { Buttons } from "@src/types/components";
import { MessageFlags, type ButtonInteraction } from "discord.js";

export const data: Buttons["data"] = {
    name: "vm-subuser-delete"
};

export const optionalParams: Buttons["optionalParams"] = {
    panelId: "number",
    vmId: "string",
    targetUserId: "string",
    managerId: "string"
};

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const button = interaction as ButtonInteraction;
    const vmId = optionalParams?.["vmId"] as string;
    const targetUserId = optionalParams?.["targetUserId"] as string;
    const managerId = optionalParams?.["managerId"] as string;

    if (button.user.id !== managerId) {
        await button.reply({
            content: "❌ Solo quien inició la gestión puede eliminar este subuser.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const canManage = await client.permissions.hasVMPermission(button.user.id, [], vmId, "subusers");
    if (!canManage) {
        await button.reply({
            content: "❌ Ya no tienes permiso para gestionar subusers en esta VM.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    await client.prisma.vm_permissions.deleteMany({
        where: {
            vmId,
            userId: targetUserId
        }
    });

    if (client.virtualization.monitor) {
        await client.virtualization.monitor.stopMonitorForVMAndUser(vmId, targetUserId);
    }

    await button.update({
        content: `✅ Subuser <@${targetUserId}> eliminado de la VM ${vmId}.`,
        components: []
    });
};
