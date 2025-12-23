import { MessageFlags} from "discord.js";
import { CommandBuilder } from "@class/builders/CommandBuilder";
import { _U, getGuildLang } from "@src/utils/translate";

const command = new CommandBuilder();

command.setName("ping")
    .setDescription("comando que te envia el ping del bot")

command.runner = async ({client, interaction}) => {
    const discordLang = await getGuildLang(interaction.guildId!, client);
    const start = interaction.createdTimestamp;
    let msg = "";

    try {
        msg = await _U(discordLang, "pingMsg", {
            clientPing: `${client.ws.ping}`,
            ping: `${Date.now() - start}`
        });
    } catch (err) {
        msg = `Pong! : ${client.ws.ping}ms. Latencia: ${Date.now() - start}ms`;
    }
    await interaction.reply({
        content: msg,
        flags: MessageFlags.Ephemeral
    });
}

export default command
