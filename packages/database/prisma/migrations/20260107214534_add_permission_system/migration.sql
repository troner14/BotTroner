-- CreateTable
CREATE TABLE `guilds` (
    `id` VARCHAR(25) NOT NULL,
    `lang` VARCHAR(10) NULL DEFAULT 'es-es',
    `TicketChannel` VARCHAR(30) NULL,
    `TicketTranscripts` VARCHAR(30) NULL,
    `TicketMsg` VARCHAR(30) NULL,
    `TicketOpinions` VARCHAR(30) NULL,
    `proxmoxLogs` VARCHAR(30) NULL,
    `image` VARCHAR(250) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `guilds_commandos` (
    `guildId` VARCHAR(50) NOT NULL,
    `CommId` VARCHAR(50) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`guildId`, `CommId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail` (
    `guildId` VARCHAR(30) NOT NULL,
    `host` VARCHAR(30) NULL,
    `port` INTEGER NOT NULL DEFAULT 465,
    `secure` TINYINT NOT NULL DEFAULT 1,
    `loginType` VARCHAR(50) NOT NULL,
    `loginUser` VARCHAR(255) NOT NULL DEFAULT '',
    `loginPass` VARCHAR(255) NOT NULL DEFAULT '',

    PRIMARY KEY (`guildId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfil_permisos` (
    `perfilId` INTEGER NOT NULL,
    `permId` INTEGER NOT NULL,

    INDEX `FK2_perm`(`permId`),
    PRIMARY KEY (`perfilId`, `permId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `perfils` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(30) NOT NULL,
    `guildId` VARCHAR(30) NOT NULL,
    `roleId` VARCHAR(30) NOT NULL,

    INDEX `guildId`(`guildId`, `name`),
    INDEX `guildId_roleId`(`guildId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `Descripcion` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtualization_panels` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `apiUrl` VARCHAR(255) NOT NULL,
    `credentials` JSON NOT NULL,
    `config` JSON NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `virtualization_panels_guildId_type_idx`(`guildId`, `type`),
    INDEX `virtualization_panels_guildId_isDefault_idx`(`guildId`, `isDefault`),
    UNIQUE INDEX `virtualization_panels_guildId_name_key`(`guildId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vm_action_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vmId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `details` JSON NULL,
    `error` TEXT NULL,
    `executedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vm_action_logs_vmId_executedAt_idx`(`vmId`, `executedAt`),
    INDEX `vm_action_logs_userId_executedAt_idx`(`userId`, `executedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vm_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vmId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(25) NULL,
    `roleId` VARCHAR(25) NULL,
    `permissions` JSON NOT NULL,
    `grantedBy` VARCHAR(25) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    INDEX `vm_permissions_vmId_idx`(`vmId`),
    INDEX `vm_permissions_userId_idx`(`userId`),
    INDEX `vm_permissions_roleId_idx`(`roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(25) NOT NULL,
    `channelId` VARCHAR(25) NOT NULL,
    `usrId` VARCHAR(25) NOT NULL,
    `category` INTEGER NOT NULL,
    `transcript` TEXT NULL,
    `closed` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `FK1_categorias`(`category`),
    INDEX `channelId`(`channelId`),
    INDEX `guildId`(`guildId`),
    INDEX `usrId`(`usrId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tickets_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(25) NOT NULL,
    `name` VARCHAR(30) NOT NULL,
    `description` VARCHAR(100) NOT NULL,
    `CategId` VARCHAR(25) NULL,

    INDEX `guildId`(`guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `traducciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lang` VARCHAR(5) NOT NULL DEFAULT '',
    `key` VARCHAR(255) NOT NULL DEFAULT '',
    `value` LONGTEXT NOT NULL,

    INDEX `lang_index`(`lang`),
    UNIQUE INDEX `lang`(`lang`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vm_monitors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(50) NOT NULL,
    `channelId` VARCHAR(50) NOT NULL,
    `messageId` VARCHAR(50) NOT NULL,
    `panelId` INTEGER UNSIGNED NOT NULL,
    `vmId` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(50) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vm_monitors_messageId_key`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `parentId` INTEGER NULL,
    `type` VARCHAR(50) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `resources_key_key`(`key`),
    INDEX `resources_key_idx`(`key`),
    INDEX `resources_type_idx`(`type`),
    INDEX `resources_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_definitions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `resourceId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `scope` VARCHAR(20) NOT NULL DEFAULT 'guild',
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `permission_definitions_resourceId_idx`(`resourceId`),
    INDEX `permission_definitions_action_idx`(`action`),
    UNIQUE INDEX `permission_definitions_resourceId_action_key`(`resourceId`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `discordRoleId` VARCHAR(30) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `color` VARCHAR(7) NULL,
    `icon` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `roles_guildId_idx`(`guildId`),
    INDEX `roles_discordRoleId_idx`(`discordRoleId`),
    INDEX `roles_guildId_isSystem_idx`(`guildId`, `isSystem`),
    UNIQUE INDEX `roles_guildId_name_key`(`guildId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roleId` INTEGER NOT NULL,
    `permissionId` INTEGER NOT NULL,
    `grant` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_roleId_idx`(`roleId`),
    INDEX `role_permissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `role_permissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `roleId` INTEGER NOT NULL,
    `grantedBy` VARCHAR(30) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,

    INDEX `user_roles_userId_guildId_idx`(`userId`, `guildId`),
    INDEX `user_roles_roleId_idx`(`roleId`),
    INDEX `user_roles_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `user_roles_userId_roleId_guildId_key`(`userId`, `roleId`, `guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(30) NOT NULL,
    `userId` VARCHAR(30) NOT NULL,
    `permissionId` INTEGER NOT NULL,
    `grant` BOOLEAN NOT NULL DEFAULT true,
    `grantedBy` VARCHAR(30) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `conditions` JSON NULL,
    `reason` TEXT NULL,

    INDEX `user_permissions_userId_guildId_idx`(`userId`, `guildId`),
    INDEX `user_permissions_permissionId_idx`(`permissionId`),
    INDEX `user_permissions_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `user_permissions_userId_permissionId_guildId_key`(`userId`, `permissionId`, `guildId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(30) NOT NULL,
    `actorId` VARCHAR(30) NOT NULL,
    `targetType` VARCHAR(20) NOT NULL,
    `targetId` VARCHAR(30) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `resource` VARCHAR(100) NOT NULL,
    `permission` VARCHAR(100) NOT NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `permission_audit_log_guildId_createdAt_idx`(`guildId`, `createdAt`),
    INDEX `permission_audit_log_actorId_idx`(`actorId`),
    INDEX `permission_audit_log_targetId_targetType_idx`(`targetId`, `targetType`),
    INDEX `permission_audit_log_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_policies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `guildId` VARCHAR(30) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `conditions` JSON NOT NULL,
    `effects` JSON NOT NULL,
    `schedule` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `permission_policies_guildId_active_idx`(`guildId`, `active`),
    INDEX `permission_policies_guildId_priority_idx`(`guildId`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `guilds_commandos` ADD CONSTRAINT `FK_guilds_commandos_guilds` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `mail` ADD CONSTRAINT `FK1_guild` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `perfil_permisos` ADD CONSTRAINT `FK1_perfil` FOREIGN KEY (`perfilId`) REFERENCES `perfils`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perfil_permisos` ADD CONSTRAINT `FK2_perms` FOREIGN KEY (`permId`) REFERENCES `permisos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `perfils` ADD CONSTRAINT `FK1_guilds` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtualization_panels` ADD CONSTRAINT `virtualization_panels_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `FK1_categorias` FOREIGN KEY (`category`) REFERENCES `tickets_categories`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `vm_monitors` ADD CONSTRAINT `vm_monitors_panelId_fkey` FOREIGN KEY (`panelId`) REFERENCES `virtualization_panels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resources` ADD CONSTRAINT `resources_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `resources`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_definitions` ADD CONSTRAINT `permission_definitions_resourceId_fkey` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permission_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permission_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_policies` ADD CONSTRAINT `permission_policies_guildId_fkey` FOREIGN KEY (`guildId`) REFERENCES `guilds`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
