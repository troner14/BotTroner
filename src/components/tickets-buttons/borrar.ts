import { TicketsErrors } from "@src/class/tickets/tickets";
import type { Buttons } from "@dTypes/components";
import { _U, getGuildLang } from "@utils/translate";

export const data: Buttons["data"] = {
    name: 'ticket-borrar'
}

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client }) => {
    try {
        await client.ticket.closeWaitOpinion(interaction, client);
    } catch (error) {
        if (error instanceof TicketsErrors) {
            const discLang = await getGuildLang(interaction.guild!.id, client);
            interaction.reply({
                content: await _U(discLang, error.msg),
                ephemeral: true
            });
        }
    }
}
