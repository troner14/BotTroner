import type { autocomplete_type, RunOptions } from "@dTypes/commands";
import { CommandBuilder } from "@src/class/builders/CommandBuilder";
import { handleTickets } from "@src/handlers/ticket";


const command = new CommandBuilder();

command
    .setName("tickets")
    .setDescription("commando para gestionar todo el sistema de tickets")
    .addSubcommand(command => command
        .setName("new")
        .setDescription("genera un nuevo ticket")
        .addIntegerOption(option => option
            .setName('category')
            .setDescription('porque quiere abrir ticket')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option => option
            .setName('lang')
            .setDescription('idioma para ser atendido')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('descripcio')
            .setDescription('descripcio del problema')
            .setRequired(true)
        )
    )
    .addSubcommand(command => command
        .setName("close")
        .setDescription("cerrar ticket")
    )
    .addSubcommand(command => command
        .setName("setup")
        .setDescription("generar el mensaje en el canal especificado para poder abrir ticket comodamente")
        .addChannelOption(option => option
            .setName("channel")
            .setDescription("el canal donde se enviara el mensaje del ticket system")
        )
    )
    .addSubcommandGroup(group => group
        .setName("config")
        .setDescription("multiples configuraciones de tickets")
        .addSubcommand(command => command
            .setName("transcript")
            .setDescription("commando para configurar el canal donde se enviaran las transcripciones de los tickets")
            .addChannelOption(option => option
                .setName("channel")
                .setDescription("el canal al que enviar las transcripciones")
                .setRequired(true)
            )
        )
        .addSubcommand(command => command
            .setName("opinions")
            .setDescription("comando para setear en que canal se enviaran las opiniones de la gente al cerrar un ticket")
            .addChannelOption(option => option
                .setName("channel")
                .setDescription("el canal al que enviar las opiniones")
                .setRequired(true)
            )
        )
    )
    .addSubcommandGroup(group => group
        .setName("category")
        .setDescription("todos los comandos para gestionar las categorias")
        .addSubcommand(command => command
            .setName("new")
            .setDescription("crear una nueva categoria")
            .addStringOption(option => option
                .setName("name")
                .setDescription("nombre de la categoria")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("description")
                .setDescription("la descripcion de la categoria")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("categdiscid")
                .setDescription("la id de la categoria donde se pondran los tickets de esta categoria")
                .setAutocomplete(true)
            )
        )
        .addSubcommand(command => command
            .setName("set")
            .setDescription("modificar un valor de una categoria ya creada")
            .addIntegerOption(option => option
                .setName("categid")
                .setDescription("id de la categoria")
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addStringOption(option => option
                .setName("name")
                .setDescription("nombre de la categoria")
            )
            .addStringOption(option => option
                .setName("description")
                .setDescription("la descripcion de la categoria")
            )
            .addStringOption(option => option
                .setName("categdiscid")
                .setDescription("la id de la categoria donde se pondran los tickets de esta categoria")
                .setAutocomplete(true)
            )
        )
    )
    .addSubcommandGroup(group => group
        .setName("user")
        .setDescription("gestionar usuarios en los tickets")
        .addSubcommand(command => command
            .setName("add")
            .setDescription("agregar a un usuario al ticket")
            .addMentionableOption(option => option
                .setName("user")
                .setDescription("usuario que quieres añadir")
                .setRequired(true)
            )
        )
        .addSubcommand(command => command
            .setName("remove")
            .setDescription("elimina a un usuario al ticket")
            .addMentionableOption(option => option
                .setName("user")
                .setDescription("usuario que quieres eliminar")
                .setRequired(true)
            )
        )
    );


command.runner = async ({client, interaction, args}: RunOptions) => {
    await handleTickets(interaction, client);
}

command.autocomplete = async ({interaction, client, args}: autocomplete_type) => {
    await handleTickets(interaction, client);
}

export default command;