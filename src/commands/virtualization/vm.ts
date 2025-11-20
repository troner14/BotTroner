import { CommandBuilder } from "@class/builders/CommandBuilder";
import { virtualizationHandler } from "@handlers/virtualization";

const command = new CommandBuilder();

command.setName("vm")
    .setDescription("Gestionar máquinas virtuales")
    .addSubcommand(subcommand =>
        subcommand
            .setName("list")
            .setDescription("Listar todas las VMs disponibles")
            .addIntegerOption(option =>
                option
                    .setName("panel")
                    .setDescription("ID del panel de virtualización")
                    .setRequired(false)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("status")
            .setDescription("Ver el estado de una VM específica")
            .addIntegerOption(option =>
                option
                    .setName("panel")
                    .setDescription("ID del panel de virtualización")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName("vm-id")
                    .setDescription("ID de la máquina virtual")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName("action")
            .setDescription("Ejecutar una acción en una VM")
            .addIntegerOption(option =>
                option
                    .setName("panel")
                    .setDescription("ID del panel de virtualización")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName("vm-id")
                    .setDescription("ID de la máquina virtual")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption(option =>
                option
                    .setName("action")
                    .setDescription("Acción a ejecutar")
                    .setRequired(true)
                    .addChoices(
                        { name: "Iniciar", value: "start" },
                        { name: "Detener", value: "stop" },
                        { name: "Reiniciar", value: "restart" },
                        { name: "Pausar", value: "pause" },
                        { name: "Reanudar", value: "resume" },
                        { name: "Resetear", value: "reset" }
                    )
            )
    )
    .addSubcommandGroup(group => group
        .setName("panel")
        .setDescription("Gestionar paneles de virtualización")
        .addSubcommand(subcommand => subcommand
            .setName("list")
            .setDescription("Listar todos los paneles de virtualización")
        )
        .addSubcommand(subcommand => subcommand
            .setName("info")
            .setDescription("Ver información de un panel de virtualización")
            .addIntegerOption(option => option
                .setName("panel")
                .setDescription("ID del panel a consultar")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("new")
            .setDescription("Crear un nuevo panel de virtualización")
            .addStringOption(option => option
                .setName("name")
                .setDescription("Nombre del panel")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("url")
                .setDescription("URL del panel (sin https://)")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("api-key")
                .setDescription("Clave API para autenticación")
                .setRequired(true)
            )
            .addStringOption(option => option
                .setName("provider")
                .setDescription("Proveedor de virtualización")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("delete")
            .setDescription("Eliminar un panel de virtualización")
            .addIntegerOption(option => option
                .setName("panel")
                .setDescription("ID del panel a eliminar")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    );

command.runner = async ({ client, interaction }) => {
    await virtualizationHandler(client, interaction);
};


command.autocomplete = async ({ client, interaction }) => {
    await virtualizationHandler(client, interaction);
};


export default command;