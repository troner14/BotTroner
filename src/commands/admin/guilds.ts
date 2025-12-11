import { ButtonInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { CommandBuilder } from "@class/builders/CommandBuilder";
import { _U } from "@src/utils/translate";
import { Paginator } from "@src/class/utils/Paginator";

const command = new CommandBuilder();

command.setName("guilds")
    .setDescription("comando que te dice los guilds en los que esta el bot")

command.runner = async ({ client, interaction }) => {
    const guilds = client.guilds.cache.map(g => ({
        id: g.id,
        name: g.name,
        userCount: g.memberCount,
        owner: g.ownerId
    }));

    const paginator = new Paginator(guilds, 1);

    const createEmbed = () => {
        const pageData = paginator.getPageData();
        const embed = new EmbedBuilder()
            .setTitle("📋 Guilds del Bot")
            .setColor(0x0099ff)
            .setFooter({
                text: `Página ${pageData.page + 1} de ${pageData.totalPages} • Total: ${guilds.length} VMs`
            });

        pageData.items.forEach(info => {
            embed.addFields({
                name: `${info.name}`,
                value: `**id:** ${info.id}\n**UserCount:** ${info.userCount}\n**Owner:** ${info.owner}`,
                inline: true,
            });
        });

        return embed;
    };

    const msg = await interaction.reply({
        embeds: [createEmbed()],
        components: [paginator.createButtons()],
        flags: MessageFlags.Ephemeral
    });

    const collector = msg.createMessageComponentCollector({
        time: 300_000,
        filter: (i) => i.user.id === interaction.user.id
    });

    collector.on('collect', async (i) => {
        if (await paginator.handleInteraction(i as ButtonInteraction)) {
            await i.update({
                embeds: [createEmbed()],
                components: [paginator.createButtons()]
            });
        }
    });

    collector.on('end', async () => {
        try {
            await msg.edit({
                components: []
            });
        } catch (error) {
            client.logger.info("No se pudo editar el mensaje para eliminar los botones tras expirar el colector.");
        }
    });
}

export default command
