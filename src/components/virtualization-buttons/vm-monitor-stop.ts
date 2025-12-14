import type { Buttons } from "@src/types/components";
import { MessageFlags, type ButtonInteraction } from "discord.js";

export const data: Buttons["data"] = {
    name: "vm-monitor-stop"
}

export const optionalParams: Buttons["optionalParams"] = {
    id: "string"
}

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const id = optionalParams?.["id"] as string;
    const vmManager = client.virtualization;

    await (interaction as ButtonInteraction).deferUpdate();

    try {
        if (vmManager.monitor) {
            await vmManager.monitor.stopMonitorForVM(id);
            // Try to delete the message since the session is over
            await (interaction as ButtonInteraction).deleteReply().catch(() => { });
        }
    } catch (error) {
        client.logger.error({ error }, "Error in VM monitor stop handler");
    }
}
