import { MessageFlags, OverwriteType, TextChannel} from "discord.js";
import { CommandBuilder } from "@class/builders/CommandBuilder";

const command = new CommandBuilder();

command.setName("lock")
    .setDescription("commando para bloquear o desbloquear un conal ")
    .addBooleanOption(option => option
        .setName("state")
        .setDescription("true para bloquear, false para desbloquear")
        .setRequired(true)
    )
    .addNumberOption(option => option
        .setName("duration")
        .setDescription("Duración en minutos (opcional)")
        .setRequired(false)
        .setMinValue(-1)
        .setMaxValue(1440) // 24 horas
    );

command.runner = async ({client, interaction, args}) => {
    if (!interaction.inGuild() || !interaction.guild) {
        throw new Error("Interaction not in a guild");
    }
    const state = args.getBoolean("state", true);
    const duration = args.getNumber("duration", false);
    let msg = "channel blocked";

    if (!state) {
        msg = "channel unblocked";
        const channel = interaction.channel as TextChannel;
        channel.permissionOverwrites.cache.forEach(overwrite => {
            if (!overwrite.allow.has("ManageMessages")) {
                overwrite.edit({ SendMessages: null });
            }
        });
    } else {
        const channel = interaction.channel as TextChannel;
        channel.permissionOverwrites.cache.forEach(overwrite => {
            if (!overwrite.allow.has("ManageMessages")) {
                overwrite.edit({ SendMessages: false });
            }
        });
        if (duration && duration > 0) {
            setTimeout(() => {
                channel.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: true });
            }, duration * 60 * 1000); // convertir minutos a milisegundos
        }
    }

    await interaction.reply({
        content: msg,
        flags: MessageFlags.Ephemeral
    });
}

export default command;
