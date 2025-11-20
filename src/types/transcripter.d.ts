import type { ActionRow, Embed, GuildTextBasedChannel, Message, ButtonComponent, StringSelectMenuComponent } from "discord.js";

interface AllMessagesTypes {
    guildId: string;
    id: string;
    content: string
    timestamp: number
    user: {
        id: string
        username: string
        avatar: string
    }
    attachments?: {
        name: string
        url: string
    }[]
    embeds?: Embed[]
    components?: ActionRow<ButtonComponent | StringSelectMenuComponent>[]
    reference?: {
        messageId: string
        content: string
        msgUser: string
        HaveEmbed: boolean
        HaveAttachment: boolean
    }
}