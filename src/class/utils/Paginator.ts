import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction } from "discord.js";

// src/utils/Paginator.ts
export class Paginator<T> {
    private items: T[];
    private itemsPerPage: number;
    private currentPage: number = 0;
    private sessionId: string;

    constructor(items: T[], itemsPerPage: number = 10) {
        this.items = items;
        this.itemsPerPage = itemsPerPage;
        this.sessionId = `paginator_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    getPageData() {
        const start = this.currentPage * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return {
            items: this.items.slice(start, end),
            page: this.currentPage,
            totalPages: Math.ceil(this.items.length / this.itemsPerPage),
            hasNext: end < this.items.length,
            hasPrev: this.currentPage > 0
        };
    }

    createButtons(): ActionRowBuilder<ButtonBuilder> {
        const pageData = this.getPageData();
        
        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`${this.sessionId}_prev`)
                .setLabel("◀ Anterior")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!pageData.hasPrev),
            new ButtonBuilder()
                .setCustomId(`${this.sessionId}_next`)
                .setLabel("Siguiente ▶")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(!pageData.hasNext)
        );
    }

    async handleInteraction(interaction: ButtonInteraction): Promise<boolean> {
        if (!interaction.customId.startsWith(this.sessionId)) {
            return false;
        }

        const action = interaction.customId.replace(`${this.sessionId}_`, '');
        
        switch (action) {
            case 'prev':
                if (this.currentPage > 0) {
                    this.currentPage--;
                    return true;
                }
                break;
            case 'next':
                const maxPage = Math.ceil(this.items.length / this.itemsPerPage) - 1;
                if (this.currentPage < maxPage) {
                    this.currentPage++;
                    return true;
                }
                break;
        }
        
        return false;
    }
}