import type { Buttons } from "@src/types/components";

export const data: Buttons["data"] = {
    name: 'announce-cancel'
}

export const optionalParams: Buttons["optionalParams"] = {
    hash: ""
}

export const type: Buttons["type"] = "button";

export const run: Buttons["run"] = async ({ interaction, client, optionalParams }) => {
    const hash = optionalParams?.["hash"] as string;

    // Limpiar el anuncio del Map si existe
    if (hash && client.announcements.has(hash)) {
        const announcementData = client.announcements.get(hash);
        
        // Verificar que el usuario que cancela es el mismo que creó el anuncio
        if (announcementData?.userId === interaction.user.id) {
            client.announcements.delete(hash);
        }
    }

    await interaction.update({
        content: "❌ Anuncio cancelado. No se envió ningún mensaje.",
        embeds: [],
        components: []
    });
}
