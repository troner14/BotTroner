import { MessageFlags} from "discord.js";
import { CommandBuilder } from "@class/builders/CommandBuilder";
import { CommandsLoader } from "@src/class/loaders/Commands";

const command = new CommandBuilder();

command.setName("sync")
    .setDescription("commando que syncronitza els commands del bot con tus commandos disponibles");

command.runner = async ({client, interaction}) => {
    const loader = CommandsLoader.getInstance();
    await loader.refreshGuildCommands(interaction.guildId!);
    await loader.RegisterCommands(interaction.guildId!);

    await interaction.reply({
        content: "commands Synced!",
        flags: MessageFlags.Ephemeral
    });
}

export default command
