import { ActionRowBuilder, AttachmentBuilder, BaseGuildTextChannel, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, CommandInteraction, EmbedBuilder, GuildMember, ModalBuilder, ModalSubmitInteraction, PermissionsBitField, TextChannel, TextInputBuilder, TextInputStyle, type GuildTextBasedChannel, type OverwriteResolvable } from "discord.js";
import type { ExtendedClient } from "@src/class/extendClient";
import { Transcripter } from "./transcripter";
import logger from "@src/utils/logger";
import { _U } from "@src/utils/translate";
import type { langsKey, TranslationKey } from "@src/types/translationTypes";
import { HavePerms } from "@src/utils/perms";


const permission = PermissionsBitField.Flags;

class Tickets {
    readonly #logs = logger.child({ module: "ExtendedClient" });
    readonly #client: ExtendedClient;
    readonly #transcripter: Transcripter


    constructor(client: ExtendedClient) {
        this.#client = client;
        this.#transcripter = new Transcripter(client.prisma);
        this.#client.prisma.guilds.findMany({
            where: { TicketChannel: { not: null } }
        }).then(guilds => {
            for (const guild of guilds) {
                this.setup(guild.id).catch(e => this.#logs.error(e));
            }
        })
    }

    async setup(guildId: string) {
        const guildLang = ((await this.#client.prisma.guilds.findUnique({
            where: { id: guildId },
            select: { lang: true }
        }))?.lang || "en") as langsKey;
        const tDescMsg = await _U(guildLang, "ticketNew");
        const ticketMsg = new EmbedBuilder()
            .setTitle('Tickets')
            .setDescription(tDescMsg)
            .setColor(0x00AE86)
            .setFooter({
                text: `created by Troner14`,
            })
            .setTimestamp();
        const newticket = new ButtonBuilder()
            .setCustomId('ticket-new')
            .setLabel('Crear ticket')
            .setStyle(ButtonStyle.Primary);

        try {
            const { TicketChannel, TicketMsg: msgid } = await this.#client.prisma.guilds.findUnique({
                where: { id: guildId },
                select: { TicketChannel: true, TicketMsg: true }
            }) || {};
            if (TicketChannel && TicketChannel.length > 0 && msgid) {
                const channel = await this.#client.channels.fetch(TicketChannel) as GuildTextBasedChannel;
                try {
                    const msg = await channel.messages.fetch(msgid);
                    if (msg.id) {
                        await msg.edit({
                            embeds: [ticketMsg],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(newticket) as ActionRowBuilder<ButtonBuilder>,
                            ],
                        })
                    } else {
                        const msg = await channel.send({
                            embeds: [ticketMsg],
                            components: [
                                new ActionRowBuilder()
                                    .addComponents(newticket) as ActionRowBuilder<ButtonBuilder>,
                            ],
                        });
                        this.#client.prisma.guilds.update({
                            where: { id: guildId },
                            data: { TicketMsg: msg.id }
                        });
                    }
                } catch (_e) {
                    const msg = await channel.send({
                        embeds: [ticketMsg],
                        components: [
                            new ActionRowBuilder()
                                .addComponents(newticket) as ActionRowBuilder<ButtonBuilder>,
                        ],
                    })
                    this.#client.prisma.guilds.update({
                        where: { id: guildId },
                        data: { TicketMsg: msg.id }
                    });
                }
            }
        } catch (e) {
            this.#logs.warn(e)
        }
    }

    async newTicketCateg(guildId: string, name: string, description: string, categoryId?: string) {
        try {
            await this.#client.prisma.tickets_categories.create({
                data: {
                    guildId,
                    name,
                    description,
                    CategId: categoryId
                }
            })
            return true;
        } catch (e) {

            return false;
        }
    }

    async updateTicketCateg(categId: number, name?: string, description?: string, categoryId?: string) {
        try {
            const data: {
                name?: string,
                description?: string,
                CategId?: string
            } = {};
            if (name) data.name = name;
            if (description) data.description = description;
            if (categoryId) data.CategId = categoryId;
            const result = await this.#client.prisma.tickets_categories.update({
                where: { id: categId },
                data: data
            });
            return true;
        } catch (e) {
            this.#logs.error(e);
            return false;
        }
    }

    async newTicket(interaction: CommandInteraction | ModalSubmitInteraction, client: ExtendedClient, categ: number, ticketInfo: { lang: string, desc: string }): Promise<string> {
        if (!categ) {
            throw new TicketsErrors("ticketCategoryError");
        }

        const { tickets, tickets_categories, permisos, perfil_permisos, guilds } = client.prisma;
        const nTickets = await tickets.count({
            where: {
                usrId: interaction.user.id,
                category: categ,
                closed: false
            }
        });
        

        if (nTickets >= 1) {
            throw new TicketsErrors("ticketArleadyOpen");
        }

        try {
            const perms: OverwriteResolvable[] = [
                {
                    id: interaction.guild!.roles.everyone,
                    deny: [permission.ViewChannel, permission.SendMessages, permission.ReadMessageHistory, permission.AddReactions, permission.AttachFiles]
                },
                {
                    id: interaction.user.id,
                    allow: [permission.ViewChannel, permission.SendMessages, permission.ReadMessageHistory, permission.AddReactions, permission.AttachFiles]
                }
            ];
            const tcateg = await tickets_categories.findUnique({
                where: { id: categ },
                select: { name: true, CategId: true }
            })!;
            if (!tcateg) {
                throw new TicketsErrors("ticketCategoryError");
            }
            const { name: categName, CategId } = tcateg;

            const ticketsRoles = await perfil_permisos.findMany({
                where: {
                    permisos: {
                        name: "ticket:view"
                    }
                },
                select: { perfils: {
                    select: {
                        roleId: true
                    }
                } }
            });
            for (const role of ticketsRoles) {
                if (role.perfils.roleId) {
                    perms.push({
                        id: role.perfils.roleId,
                        allow: [permission.ViewChannel, permission.SendMessages, permission.ReadMessageHistory, permission.AddReactions, permission.AttachFiles]
                    })
                }
            }

            const channel = await interaction.guild?.channels.create({
                name: `${interaction.user.username}-${categName}`,
                type: ChannelType.GuildText,
                parent: CategId,
                permissionOverwrites: perms
            });

            if (!channel) {
                throw new TicketsErrors("ticketChannelError");
            }

            const res = await tickets.create({
                data: {
                    guildId: interaction.guild!.id,
                    channelId: channel.id,
                    usrId: interaction.user.id,
                    category: categ,
                }
            })

            channel.setTopic(`ticket id: ${res.id}`);

            const guildLang = ((await guilds.findUnique({
                where: { id: interaction.guild!.id },
                select: { lang: true }
            }))?.lang ?? "es-es") as langsKey;
            const tDescMsg = await _U(guildLang, "ticketNewMsg", {
                user: interaction.user.username,
                category: categName,
            });
            const tTLang = await _U(guildLang, "ticketNewLangTitle");
            const tTDesc = await _U(guildLang, "ticketNewDescTitle");
            const tBtnClose = await _U(guildLang, "ticketCloseBtn");

            const ticketMsg = new EmbedBuilder()
                .setTitle('chat de tickets')
                .setDescription(tDescMsg)
                .addFields([
                    {
                        name: tTLang,
                        value: ticketInfo.lang
                    },
                    {
                        name: tTDesc,
                        value: ticketInfo.desc
                    }
                ])
                .setColor(0x00AE86)
                .setTimestamp(Date.now())
                .setFooter({
                    text: 'created by troner14'
                });
            const b_borrar = new ButtonBuilder()
                .setCustomId('ticket-borrar')
                .setLabel(tBtnClose)
                .setStyle(ButtonStyle.Danger);
            const component = new ActionRowBuilder().addComponents(b_borrar) as ActionRowBuilder<ButtonBuilder>
            channel.send({
                embeds: [ticketMsg],
                components: [component]
            })


            const tmsgNew = await _U(guildLang, "ticketNewSuccess", {
                channel: channel.id
            });
            return tmsgNew;
        } catch (e) {
            this.#logs.error(e);
            if (e instanceof TicketsErrors) {
                throw e;
            } 
            throw new TicketsErrors("ticketSaveError");
        }
    }

    async closeWaitOpinion(interaction: CommandInteraction|ButtonInteraction, client: ExtendedClient) {
        const channel = interaction.channel as BaseGuildTextChannel;
        const id = parseInt(channel.topic?.split(":")[1] ?? "");
        const tickets = await client.prisma.tickets.findFirst({
            where: {
                OR: [
                    {
                        id: id
                    },
                    {
                        channelId: channel.id
                    }
                ]
            }
        });

        if (!tickets) {
            throw new TicketsErrors("TicketNotChannel")
        }

        if (interaction.user.id !== tickets.usrId) {
            return await this.close(interaction, client, false);
        }

        const guildLang = ((await client.prisma.guilds.findUnique({
            where: { id: interaction.guildId! },
            select: { lang: true }
        }))?.lang ?? "es-es") as langsKey;
        const tModalTitle = await _U(guildLang, "ticketModalTitle");
        const tModalInput = await _U(guildLang, "ticketModalInput");

        const modal = new ModalBuilder()
                .setCustomId(`ticket-suggest-modal`)
                .setTitle(tModalTitle);

        const opinionInput = new TextInputBuilder()
                .setCustomId('opinion')
                .setLabel(tModalInput)
                .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(opinionInput);
        
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }

    async close(interaction: CommandInteraction|ModalSubmitInteraction|ButtonInteraction, client: ExtendedClient, Opinion = true) {
        const start = Date.now();
        const channel = interaction.channel as BaseGuildTextChannel;
        const id = parseInt(channel.topic?.split(":")[1] ?? "");
        const tickets = await client.prisma.tickets.findFirst({
            where: {
                OR: [
                    {
                        id: id
                    },
                    {
                        channelId: channel.id
                    }
                ]
            }
        });

        if (!tickets) {
            throw new TicketsErrors("TicketNotChannel")
        }

        const transcript = await this.#transcripter.generateTranscript(channel);
        const transcriptBuff = Buffer.from(transcript, "utf-8");
        const transcriptAtt = new AttachmentBuilder(transcriptBuff, {
            name: `${tickets.guildId}-${tickets.usrId}-transcript.html`
        })

        const guildLang = ((await client.prisma.guilds.findUnique({
                where: { id: interaction.guild!.id },
                select: { lang: true }
            }))?.lang ?? "es-es") as langsKey;
        const tBtnOpinar = await _U(guildLang, "ticketBtnOpinar");
        const tCloseMsg = await _U(guildLang, "ticketCloseMsg");

        const OpinionBtn = new ButtonBuilder()
            .setCustomId(`ticket-show-opinion_${interaction.guildId}`)
            .setLabel(tBtnOpinar)
            .setStyle(ButtonStyle.Primary);

        const closeMsg = new EmbedBuilder()
            .setTitle(`Transcripcion del ticket. `)
            .setDescription(!Opinion ? tCloseMsg : null)
            .setColor(0x00AE86)
            .setTimestamp()
            .setFooter({
                text: `${interaction.guild!.name} ${new Date().getFullYear()}`
            })


        await client.prisma.tickets.update({
            where: { id: tickets.id },
            data: {
                closed: true
            }
        })
        channel.delete();

        // send transcript to a md of owner of ticket
        try {
            const ActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(OpinionBtn);
            const user = await client.users.fetch(tickets.usrId);
            user.send({
                embeds: [closeMsg],
                files: [transcriptAtt],
                components: !Opinion ? [ActionRow] : undefined
            });
        } catch (e) {
            this.#logs.warn(e);
        }

        const data = await client.prisma.guilds.findFirst({
            where: { id: interaction.guildId! },
            select: { TicketTranscripts: true }
        });
        // const data = await Guilds.findColumnsById(interaction.guildId!, ["TicketTranscripts"]);
        if (data && data.TicketTranscripts) {
            const transChannel = client.channels.cache.get(data.TicketTranscripts) as TextChannel;
            if (transChannel) {
                await transChannel.send({
                    embeds: [closeMsg],
                    files: [transcriptAtt]
                });
            }
        }
        const end = Date.now();
        this.#logs.debug(`Ticket closed in ${end - start}ms`);
    }

    async addUser(interaction: CommandInteraction, client: ExtendedClient, member: GuildMember) {
        const channel = interaction.channel as TextChannel;
        const id = parseInt(channel.topic?.split(":")[1] ?? "");
        const validTicket = await client.prisma.tickets.findFirst({
            where: {
                OR: [
                    {
                        id: id
                    },
                    {
                        channelId: channel.id
                    }
                ]
            }
        });
        const guildLang = ((await client.prisma.guilds.findUnique({
                where: { id: interaction.guild!.id },
                select: { lang: true }
            }))?.lang ?? "es-es") as langsKey;
        
        if (validTicket) {
            if (await HavePerms(client, interaction.guildId!, interaction.user, "ticket:adduser")) {
                try {
                    await channel.permissionOverwrites.create(member.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        AddReactions: true,
                        AttachFiles: true
                    })
                    const tAddUser = await _U(guildLang, "ticketAddUserS", {
                        username: member.user.username
                    });
                    await interaction.editReply({
                        content: tAddUser
                    })
                } catch (e) {
                    const tAddUserE = await _U(guildLang, "ticketAddUserE");
                    await interaction.editReply({
                        content: tAddUserE
                    })
                    return;
                }
            }
        } else {
            const WrongChannel = await _U(guildLang, "ticketWrongChannel");
            await interaction.editReply({
                content: WrongChannel
            })
        }
    }

    async removeUser(interaction: CommandInteraction, client: ExtendedClient, member: GuildMember) {
        const channel = interaction.channel as TextChannel;
        const id = parseInt(channel.topic?.split(":")[1] ?? "");
        let validTicket = await client.prisma.tickets.findFirst({
            where: {
                OR: [
                    {
                        id: id
                    },
                    {
                        channelId: channel.id
                    }
                ]
            }
        });
        const guildLang = ((await client.prisma.guilds.findUnique({
                where: { id: interaction.guild!.id },
                select: { lang: true }
            }))?.lang ?? "es-es") as langsKey;

        if (validTicket) {
            if (await HavePerms(client, interaction.guildId!, interaction.user, "ticket:remuser")) {
                try {
                    await channel.permissionOverwrites.delete(member.id)
                    const tRemoveUser = await _U(guildLang, "ticketRemoveUserS", {
                        username: member.user.username
                    });
                    await interaction.editReply({
                        content: tRemoveUser
                    })
                } catch (e) {
                    const tRemoveUserE = await _U(guildLang, "ticketRemoveUserE");
                    await interaction.editReply({
                        content: tRemoveUserE
                    })
                    return
                }
            }
        } else {
            const WrongChannel = await _U(guildLang, "ticketWrongChannel");
            await interaction.editReply({
                content: WrongChannel
            })
        }
    }
}

export default Tickets;

export class TicketsErrors extends Error {
    msg: TranslationKey;
    constructor(message: TranslationKey) {
        super(message);
        this.msg = message;
        this.name = "TicketsErrors";
    }
}