import { CommandBuilder } from "@class/builders/CommandBuilder";
import { handlePerms } from "@src/handlers/perms";

const command = new CommandBuilder();

command.setName("perms")
    .setDescription("Gestionar permisos de roles i usuaris")
    .addSubcommandGroup(group => group
        .setName("role")
        .setDescription("Gestionar permisos de roles")
        .addSubcommand(sub => sub
            .setName("assign")
            .setDescription("Assignar un permís a un rol")
            .addRoleOption(opt => opt
                .setName("role")
                .setDescription("Rol al qual assignar el permís")
                .setRequired(true)
            )
            .addStringOption(opt => opt
                .setName("permission")
                .setDescription("Permís a assignar")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName("revoke")
            .setDescription("Revocar un permís d'un rol")
            .addRoleOption(opt => opt
                .setName("role")
                .setDescription("Rol del qual revocar el permís")
                .setRequired(true)
            )
            .addStringOption(opt => opt
                .setName("permission")
                .setDescription("Permís a revocar")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    )
    .addSubcommandGroup(group => group
        .setName("user")
        .setDescription("Gestionar permisos directes d'usuaris")
        .addSubcommand(sub => sub
            .setName("grant")
            .setDescription("Concedir un permís directe a un usuari")
            .addUserOption(opt => opt
                .setName("user")
                .setDescription("Usuari al qual concedir el permís")
                .setRequired(true)
            )
            .addStringOption(opt => opt
                .setName("permission")
                .setDescription("Permís a concedir")
                .setRequired(true)
                .setAutocomplete(true)
            )
            .addIntegerOption(opt => opt
                .setName("duration")
                .setDescription("Duració en minuts (opcional, per permisos temporals)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(525600) // 1 any
            )
        )
        .addSubcommand(sub => sub
            .setName("revoke")
            .setDescription("Revocar un permís directe d'un usuari")
            .addUserOption(opt => opt
                .setName("user")
                .setDescription("Usuari del qual revocar el permís")
                .setRequired(true)
            )
            .addStringOption(opt => opt
                .setName("permission")
                .setDescription("Permís a revocar")
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    )
    .addSubcommand(sub => sub
        .setName("list")
        .setDescription("Llistar permisos d'un usuari o rol")
        .addUserOption(opt => opt
            .setName("user")
            .setDescription("Usuari del qual llistar permisos")
            .setRequired(false)
        )
        .addRoleOption(opt => opt
            .setName("role")
            .setDescription("Rol del qual llistar permisos")
            .setRequired(false)
        )
    );

command.runner = async ({ client, interaction }) => {
    await handlePerms(interaction, client);
};

command.autocomplete = async ({ client, interaction }) => {
    await handlePerms(interaction, client);
};

export default command;
