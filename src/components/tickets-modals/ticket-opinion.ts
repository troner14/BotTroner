import { EmbedBuilder, MessageFlags, type TextChannel } from "discord.js";
import type { modalsType } from "@dTypes/components";


export const data: modalsType["data"] = {
    name: "ticket-suggest-modal",
}

export const type: modalsType["type"] = "modals";

export const optionalParams: modalsType["optionalParams"] = {
    guildId: ""
}

export const run: modalsType["run"] = async ({ interaction, client, optionalParams }) => {
    await interaction.deferReply({
        flags: MessageFlags.Ephemeral
    })
    const fields = interaction.fields;
    const opinion = fields.getTextInputValue("opinion");
    const guildId = optionalParams?.["guildId"] ?? interaction.guildId!;

    const res = await client.prisma.guilds.findFirst({
        where: {id: guildId},
        select: {TicketOpinions: true}
    });
    const TicketOpinions = res?.TicketOpinions;

    const test_channel = client.channels.cache.get(TicketOpinions!) as TextChannel;

    const embed_opinion = new EmbedBuilder()
        .setTitle(`Nueva Opinion de ${interaction.user.username}`)
        .setDescription(opinion)
        .setThumbnail(interaction.user.avatarURL({size: 64}))
        .setTimestamp()


    
    if (test_channel) {
        await test_channel.send({
            embeds: [embed_opinion]
        });
    }

    try { 
        if (!optionalParams?.["guildId"]) {
            await client.ticket.close(interaction, client);
        }
    } catch(err) {
        client.logger.error(err, "Ticket Opinion Modal - Closing Ticket");
    }

}