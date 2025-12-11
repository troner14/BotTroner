import { TicketsErrors } from "@src/class/tickets/tickets";
import type { modalsType } from "@dTypes/components";
import type { langsKey } from "@dTypes/translationTypes";
import { _U, getGuildLang } from "@utils/translate";
import { MessageFlags } from "discord.js";

export const data: modalsType["data"] = {
    name: "ticket-modal",
}

export const optionalParams: modalsType["optionalParams"] = {
    ticketType: 0
}

export const type: modalsType["type"] = "modals";

export const run: modalsType["run"] = async ({ interaction, client, optionalParams }) => {
    const guildLang = await getGuildLang(interaction.guild!.id, client);
    const fields = interaction.fields;
    const lang = fields.getTextInputValue("lang") as langsKey;
    const desc = fields.getTextInputValue("description");
    const ticketType = optionalParams?.["ticketType"] as number;

    const ticketInfo = {
        lang,
        desc
    }
    
    if (!lang.includes("-")) {
        interaction.reply({
            content: await _U(guildLang, "ticketLangError"),
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        const res = await client.ticket.newTicket(interaction, client, ticketType, ticketInfo);
    
        interaction.reply({
            content: res,
            flags: MessageFlags.Ephemeral
        });
    } catch (error) {
        if (error instanceof TicketsErrors) {
            interaction.reply({
                content: await _U(lang, error.msg),
                flags: MessageFlags.Ephemeral
            });
        }
    }
}