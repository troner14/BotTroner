import type { Buttons } from "@src/types/components";
import { MessageFlags, type ButtonInteraction } from "discord.js";


export const data: Buttons["data"] = {
    name: "vm-start"
}

export const optionalParams: Buttons["optionalParams"] = {
    id: "string"
}

export const type: Buttons["type"] = "button";

import { findPanel } from "@src/class/virtualization/utils/vmUtils";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const id = optionalParams?.["id"] as string;
    const vmManager = client.virtualization;

    await (interaction as ButtonInteraction).deferUpdate();

    try {
        const panelId = await findPanel(vmManager, interaction as ButtonInteraction, id);

        if (!panelId) {
            await interaction.followUp({
                content: `❌ No se pudo determinar el panel para la VM ${id}.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const res = await vmManager.executeVMAction(panelId, { type: "start", vmId: id }, interaction.user.id);

        if (!res.success) {
            await interaction.followUp({
                content: `❌ Falló iniciar la VM: ${res.error}`,
                flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        client.logger.error({ error }, "Error in VM start handler");
        await interaction.followUp({
            content: "❌ Error interno.",
            flags: MessageFlags.Ephemeral
        });
    }
}
