import type { EmbedField } from "discord.js";

export interface Announcement {
    channelId: string
    title: string
    message: string
    userId: string
    fields?: APIEmbedField[]
    imatge?: string
}