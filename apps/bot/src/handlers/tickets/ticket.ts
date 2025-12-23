import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { BaseHandler } from "../core/BaseHandler";
import type { ExtendedClient } from "@src/class/extendClient";
import { TicketsErrors } from "@src/class/tickets/tickets";
import { _U, getGuildLang } from "@src/utils/translate";


export class TicketsHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("TicketHandler");
    }

    async handle(context: { interaction: ChatInputCommandInteraction, client: ExtendedClient }): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();

        const discLang = await getGuildLang(interaction.guildId!, client);

        switch (command) {
            case "setup":
                const setupChannel = args.getChannel("setupchannel", true);
                try {
                    await client.prisma.guilds.update({
                        where: { id: interaction.guildId! },
                        data: { TicketChannel: setupChannel.id }
                    })
                    await client.ticket.setup(interaction.guildId!);
                    interaction.reply({
                        content: "Tickets have been set up successfully.",
                        flags: MessageFlags.Ephemeral
                    });
                } catch (e) {
                    interaction.reply({
                        content: "Error setting up tickets.",
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            case "new":
                const validCategs = await client.prisma.tickets_categories.findMany({
                    where: { guildId: interaction.guildId! },
                    select: { id: true }
                });
                const categ = args.getInteger("category", true);
                const lang = args.getString("lang");
                const desc = args.getString("description");

                if (!categ) {
                    await interaction.reply({
                        content: "Category not found.",
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                console.log(validCategs.map(c => c.id), categ);

                if (validCategs.map(c => c.id).some(id => id === categ)) {
                    try {
                        const message = await client.ticket.newTicket(interaction, client, categ, {
                            lang: lang ?? "es",
                            desc: desc ?? ""
                        });

                        await interaction.reply({
                            content: message,
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    } catch (e) {
                        if (e instanceof TicketsErrors) {
                            await interaction.reply({
                                content: await _U(discLang, e.msg),
                                flags: MessageFlags.Ephemeral
                            });
                            return;
                        }
                        await interaction.reply({
                            content: await _U(discLang, "TicketError"),
                            flags: MessageFlags.Ephemeral
                        });
                    }
                } else {
                    await interaction.reply({
                        content: await _U(discLang, "InvalidCateg"),
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            case "close":
                try {
                    await client.ticket.closeWaitOpinion(interaction, client);
                } catch(e) {
                    if (e instanceof TicketsErrors) {
                        interaction.reply({
                            content: await _U(discLang, e.msg),
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
                break;
        }
    }
}