import { MessageFlags} from "discord.js";
import { CommandBuilder } from "@class/builders/CommandBuilder";
import { _U } from "@src/utils/translate";
import type { langsKey } from "@dTypes/translationTypes";

const command = new CommandBuilder();

command.setName("ping")
    .setDescription("comando que te envia el ping del bot")

command.runner = async ({client, interaction}) => {
    const langquery = await client.prisma.guilds
        .findUnique({
            select: {lang: true},
            where: {id: interaction.guildId || ""}
        });
    const discordLang: langsKey = (langquery?.lang as langsKey) ?? "es-es";
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
