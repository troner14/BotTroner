import type { AllMessagesTypes } from "@src/types/transcripter";
import { _U } from "@src/utils/translate";
import { type Message, type GuildTextBasedChannel, type BaseGuildTextChannel, type ActionRow, ButtonComponent, StringSelectMenuComponent } from "discord.js";
import path from "path"
import {minify} from "html-minifier-terser"
import type { PrismaClient } from "@prismaClient";
import type { langsKey } from "@src/types/translationTypes";

export class Transcripter {
    #prisma: PrismaClient;
    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    public async downloadFile(url: string) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        const blob = await response.arrayBuffer();
        const base64 = Buffer.from(blob).toString('base64');
        return base64;
    }

    private async ExtractEmbeds(msg: Message<true>) {
        const embeds = []
        for (const embed of msg.embeds) {
            if (embed.image) {
                const base64 = await this.downloadFile(embed.image.url);
                embed.image.url = `data:${embed.image.proxyURL};base64,${base64}`;
            }
            embeds.push(embed);
        }

        return embeds;
    }

    private async ExtractAttachments(msg: Message<true>) {
        const attachments = []
        for (const attachment of msg.attachments.values()) {
            const ext = path.extname(attachment.name).toLowerCase();
            const base64 = await this.downloadFile(attachment.url);
            if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
                attachment.url = `data:image/${ext};base64,${base64}`;
            } else if (ext === '.pdf') {
                attachment.url = `data:application/pdf;base64,${base64}`;
            } else {
                attachment.url = `data:application/octet-stream;base64,${base64}`;
            }
            attachments.push({
                name: attachment.name,
                url: attachment.url
            });
        }
        return attachments;
    }

    public async getAllMessages(channel: GuildTextBasedChannel|BaseGuildTextChannel, limit?: number) {
        const AllMessages: AllMessagesTypes[] = [];
        let index = 0;
        let messages;
        if (limit) {
            messages = await channel.messages.fetch({
                limit: limit
            })
        } else {
            messages = await channel.messages.fetch();
        }
        messages.reverse();

        for (const message of messages.values()) {

            AllMessages[index] = {
                guildId: channel.guildId,
                id: message.id,
                content: message.content,
                timestamp: message.createdTimestamp,
                user: {
                    id: message.author.id,
                    username: message.author.username,
                    avatar: message.author.displayAvatarURL()
                }
            }
            if (message.attachments.size > 0) {
                AllMessages[index]!.attachments = await this.ExtractAttachments(message);
            }

            if (message.embeds.length > 0) {
                AllMessages[index]!.embeds = await this.ExtractEmbeds(message);
            }

            if (message.components.length > 0) {
                AllMessages[index]!.components = message.components as ActionRow<ButtonComponent | StringSelectMenuComponent>[];;
            }

            if (message.reference) {
                let refMsg = channel.messages.cache.get(message.reference.messageId!);
                if (refMsg) {
                    const info = {
                        messageId: refMsg.id,
                        content:  refMsg.content,
                        msgUser: refMsg.author.username,
                        HaveEmbed: refMsg.embeds.length > 0,
                        HaveAttachment: refMsg.attachments.size > 0,
                    }
                    AllMessages[index]!.reference = info;
                }
                
                
            }

            index++;
        }
        return AllMessages;
    }

    private async generateMessageHTML(msg: AllMessagesTypes) {
        let attachmentsHTML = '';
        if (msg.attachments) {
            attachmentsHTML = `<div class="attachments">`;
            for (const attachment of msg.attachments) {
                const ext = path.extname(attachment.name).toLowerCase();
                const filename = attachment.name.replace(/"/g, '');
                if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
                    // imagen inline
                    attachmentsHTML += `<div class="attachment-item"><img src="${attachment.url}" alt="${attachment.name}" class="attachment-image" /><a href="${attachment.url}" download class="attachment-download">Descargar</a></div>`;
                } else if (ext === '.pdf') {
                    // PDF embebido
                    attachmentsHTML += `<div class="attachment-item"><embed src="${attachment.url}" type="application/pdf" width="100%" height="200px" /><a href="${attachment.url}" download="${filename}" class="attachment-download">Descargar PDF</a></div>`;
                } else {
                    // otros documentos como link de descarga
                    attachmentsHTML += `<div class="attachment-item"><a href="${attachment.url}" download="${filename}" target="_blank" class="attachment-link">${attachment.name}</a></div>`;
                }
            }
            attachmentsHTML += `</div>`;
        }
        let embedsHTML = '';
        if (msg.embeds?.length) {
            embedsHTML += `<div class="embeds" style="border-left: 4px solid ${msg.embeds[0]?.hexColor ?? 'grey'}">`;
            for (const e of msg.embeds) {
                if (e.author) embedsHTML += `<p class="embed-author">${e.author.name}</p>`;
                if (e.title) embedsHTML += `<h3 href="${e.url}" target="_blank" class="embed-title">${e.title}</h3>`;
                if (e.description) embedsHTML += `<p class="embed-description">${e.description}</p>`;
                e.fields?.forEach(f => {
                embedsHTML += `<p class="embed-field"><strong>${f.name}</strong><br> ${f.value}</p>`;
                });
                if (e.image) {
                    const url = await this.downloadFile(e.image.url);
                    embedsHTML += `<img src="${url}" class="embed-image" alt="Embed image" />`;
                }
                if (e.thumbnail) {
                    const url = await this.downloadFile(e.thumbnail.url);
                    embedsHTML += `<img src="${url}" class="embed-thumbnail" alt="Embed thumbnail" />`;
                }
                if (e.footer) embedsHTML += `<p class="embed-footer">${e.footer.text}</p>`;
            }
            embedsHTML += '</div>';
        }

        let referenceHTML = '';
        if (msg.reference) {
            const ref = msg.reference;
            if (ref.messageId) {
                const invalidMsg = msg.reference.HaveEmbed || msg.reference.HaveAttachment;
                let translateMsg = "";
                const guildLang = ((await this.#prisma.guilds.findUnique({
                    where: { id: msg.guildId },
                    select: { lang: true }
                }))?.lang || "es") as unknown as langsKey;
                if (invalidMsg) translateMsg = await _U(guildLang, "ticketTranscriptRefMsg");
                
                referenceHTML += `
                <div class="reference-block" data-ref="${msg.reference.messageId}">
                    <div class="reference-bar"></div>
                    <div class="reference-content">
                        <span class="reference-username">@${msg.reference.msgUser}</span>
                        <span class="reference-fragment">${invalidMsg ? translateMsg : msg.reference.content}</span>
                    </div>
                </div>
                `;
            }
        }

        // Components (Buttons, Selects)
        let componentsHTML = '';
        if (msg.components?.length) {
            componentsHTML += '<div class="components">';
            for (const row of msg.components) {
                componentsHTML += '<div class="action-row">';
                for (const comp of row.components) {
                    if (comp instanceof ButtonComponent) {
                        const styleClass = comp.style.toString().toLowerCase();
                        const label = comp.label ?? '';
                        componentsHTML += `<button class="button ${styleClass}" disabled>${label}</button>`;
                    }
                    if (comp instanceof StringSelectMenuComponent) {
                        componentsHTML += '<select class="select" disabled multiple>'; // multiple para reflejar maxValues
                        comp.options.forEach(opt => {
                            const selected = opt.default ? ' selected' : '';
                            componentsHTML += `<option value="${opt.value}"${selected}>${opt.label}</option>`;
                        });
                        componentsHTML += '</select>';
                    }
                }
                componentsHTML += '</div>';
            }
            componentsHTML += '</div>';
        }

                
        return `
            <div class="message" id="${msg.id}">
                ${referenceHTML}
                <div class="author">
                    <img src="${msg.user.avatar}" alt="${msg.user.username}" width="32" height="32">
                    <span>${msg.user.username}<span>
                    <span class="timestamp">${new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div class="content">${msg.content}</div>
                ${attachmentsHTML}
                ${embedsHTML}
                ${componentsHTML}
            </div>
        `;
    }

    private generateHeaderHtml(name: string) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transcript ${name}</title>
        <style>
            body {
                background: #36393f;
                color: #dcddde;
                font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
                margin: 0;
                padding: 20px;
            }
            h1 {
                color: #fff;
                font-size: 1.5rem;
                margin-bottom: 10px;
            }
            .message {
                display: flex;
                flex-direction: column;
                margin-bottom: 15px;
            }
            .highlight-ref {
                box-shadow: 0 0 0 4px #00b0f4;
                background: #23272a;
                transition: box-shadow 0.2s, background 0.2s;
            }
            .reference-block {
                display: flex;
                align-items: center;
                background: #2f3136;
                border-radius: 4px;
                margin-bottom: 4px;
                cursor: pointer;
                transition: background 0.2s;
                position: relative;
                padding: 6px 5% 6px 0;
                width: fit-content;
                max-width: 75%;
            }
            .reference-block:hover {
                background: #36393f;
            }
            .reference-bar {
                width: 4px;
                height: 32px;
                background: #5865f2;
                border-radius: 4px 0 0 4px;
                margin-right: 8px;
            }
            .reference-content {
                display: flex;
                flex-direction: column;
            }
            .reference-username {
                color: #00b0f4;
                font-weight: 600;
                font-size: 0.95em;
            }
            .reference-fragment {
                color: #b9bbbe;
                font-size: 0.92em;
            }
            .author {
                display: flex;
                align-items: center;
            }
            .author span {
                margin-left: 15px;
            }
            .author img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
            }
            .content-wrapper {
                margin-left: 10px;
                max-width: 800px;
            }
            .header {
                display: flex;
                align-items: baseline;
            }
            .username {
                color: #fff;
                font-weight: 600;
                margin-right: 5px;
            }
            .discriminator {
                color: #72767d;
                font-size: 0.9rem;
                margin-right: 10px;
            }
            .timestamp {
                color: #72767d;
                font-size: 0.8rem;
                margin-left: 10px;
            }
            .content {
                margin-top: 2px;
                line-height: 1.4;
            }
            .attachments, .embeds {
                background: #2f3136;
                border-radius: 5px;
                padding: 8px;
                margin-top: 8px;
                width: fit-content;
                max-width: 50%;
            }
            .attachments img, .embeds img {
                max-width: 100%;
                border-radius: 3px;
                margin-top: 5px;
            }
            .embed-field {
                word-wrap: break-word;
            }
            .attachments a {
                color: #00b0f4;
                text-decoration: none;
                display: block;
                margin-top: 5px;
            }
            .attachments a:hover {
                text-decoration: underline;
            }
            .components { margin-top: 8px; }
            .action-row { display: flex; gap: 6px; }
            .button { padding: 4px 10px; border: none; border-radius: 4px; cursor: not-allowed; font-size: 0.9rem; }
            .button.primary { background: #5865f2; color: #fff; }
            .button.secondary { background: #4f545c; color: #fff; }
            .button.success { background: #57f287; color: #fff; }
            .button.danger { background: #ed4245; color: #fff; }
            .button.link { background: transparent; color: #00b0f4; text-decoration: underline; }
            .select { background: #202225; color: #dcddde; border: 1px solid #72767d; border-radius: 4px; padding: 4px; font-size: 0.9rem; }
        </style>
        </head>
        `;
    }

    public async generateTranscript(channel: GuildTextBasedChannel|BaseGuildTextChannel, limit?: number) {
        const AllMessages = await this.getAllMessages(channel, limit);
        let htmlMessages = '';
        for (const msg of AllMessages) {
            const str = await this.generateMessageHTML(msg);
            htmlMessages += str;
        }
        const header = this.generateHeaderHtml(channel.name);
        const html = `${header}
        <body>
            <div class="header">
                <section class="left">
                    <h1>Transcript del canal #${channel.name}</h1>
                    <p>Fecha: ${new Date().toLocaleString()}</p>
                </section>
            </div>
            <hr>
            <div class="messages">
                ${htmlMessages}
            </div>
        </body>
        <script>
            document.querySelectorAll('.reference-block').forEach(ref => {
                ref.addEventListener('click', function() {
                    const id = this.getAttribute('data-ref');
                    const el = document.getElementById(id);
                    if (el) {
                        el.classList.add('highlight-ref');
                        setTimeout(() => el.classList.remove('highlight-ref'), 2000);
                        el.scrollIntoView({behavior: "smooth", block: "center"});
                    }
                });
            });
        </script>
        </html>`;
        const compresHtml = await minify(html, {
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true,
            removeAttributeQuotes: true
        });

        const worker = new Worker("./src/workers/transcript.ts", {
            type: "module",
            name: "transcript",
        });

        worker.postMessage({
            html: compresHtml,
            channelId: channel.id,
            guildId: channel.guild.id
        });
        
        
        return compresHtml;
    }
}