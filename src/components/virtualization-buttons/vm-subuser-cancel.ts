import type { Buttons } from "@src/types/components";
import type { ButtonInteraction } from "discord.js";

export const data: Buttons["data"] = {
    name: "vm-subuser-cancel"
};

export const optionalParams: Buttons["optionalParams"] = {
    managerId: "string"
};

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, optionalParams }) => {
    const button = interaction as ButtonInteraction;
    const managerId = optionalParams?.["managerId"] as string;

    if (button.user.id !== managerId) {
        await button.reply({
            content: "❌ Solo quien inició la gestión puede cancelar esta acción.",
            flags: 64
        });
        return;
    }

    await button.update({
        content: "🛑 Acción cancelada.",
        components: []
    });
};
