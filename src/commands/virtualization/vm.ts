import { CommandBuilder } from "@class/builders/CommandBuilder";
import type { VMStatus } from "@class/virtualization/interfaces/IVirtualizationProvider";
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
            )
            .addStringOption(option =>
                option
                    .setName("vm-id")
                    .setDescription("ID de la máquina virtual")
                    .setRequired(true)
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
            )
            .addStringOption(option =>
                option
                    .setName("vm-id")
                    .setDescription("ID de la máquina virtual")
                    .setRequired(true)
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
                .addChoices(
                    { name: "Proxmox", value: "proxmox" },
                    { name: "Otro (próximamente)", value: "other" }
                )
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("delete")
            .setDescription("Eliminar un panel de virtualización")
            .addIntegerOption(option => option
                .setName("panel-id")
                .setDescription("ID del panel a eliminar")
                .setRequired(true)
            )
        )
    );

command.runner = async ({ client, interaction, args }) => {
    await virtualizationHandler(client, interaction);
};


function getStatusEmoji(status: VMStatus['status']): string {
    switch (status) {
        case 'running': return '🟢';
        case 'stopped': return '🔴';
        case 'paused': return '🟡';
        case 'suspended': return '🟠';
        default: return '⚪';
    }
}

export default command;