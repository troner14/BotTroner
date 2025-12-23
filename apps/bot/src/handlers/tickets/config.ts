import { GuildMember, MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { BaseHandler } from "../core/BaseHandler";
import type { ExtendedClient } from "@src/class/extendClient";


export class ConfigHandler extends BaseHandler<ChatInputCommandInteraction> {
    constructor() {
        super("TicketConfigHandler");
    }

    async handle(context: { interaction: ChatInputCommandInteraction, client: ExtendedClient}): Promise<void> {
        const { interaction, client } = context;
        const args = interaction.options;
        const command = args.getSubcommand();

        switch (command) {
            case "transcript":
                const transcriptChannel = args.getChannel("channel");
                const guildId = interaction.guild!.id;
                const transcriptId = transcriptChannel!.id;

                try {
                    await client.prisma.guilds.upsert({
                        where: { id: guildId },
                        create: { id: guildId, TicketTranscripts: transcriptId },
                        update: { TicketTranscripts: transcriptId }
                    })
                    await interaction.reply({
                        content: "canal de transcripts guardado con exito",
                        flags: MessageFlags.Ephemeral
                    });
                } catch(e) {
                    await interaction.reply({
                        content: "canal de transcripts no se ha podido guardar",
                        flags: MessageFlags.Ephemeral
                    });
                }
                break;
            case "oppinions":
                const opinionsChannel = args.getChannel("channel");
                const guildIdOp = interaction.guild!.id;
                const opinionsId = opinionsChannel!.id;

                try {
                    await client.prisma.guilds.upsert({
                        where: { id: guildIdOp },
                        create: { id: guildIdOp, TicketOpinions: opinionsId },
                        update: { TicketOpinions: opinionsId }
                    })
                    await interaction.reply({
                        content: "canal de opiniones guardado con exito",
                        flags: MessageFlags.Ephemeral
                    });
                } catch(e) {
                    await interaction.reply({
                        content: "canal de opiniones no se ha podido guardar",
                        flags: MessageFlags.Ephemeral
                    });
                }
            break;
        }
    }
}