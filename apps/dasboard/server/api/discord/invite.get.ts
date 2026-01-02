export default defineEventHandler(async (event) => {
    const baseUrl = "https://discord.com/api/oauth2/authorize";
    const clientId = process.env.DISCORD_CLIENT_ID;
    const permissions = "8";
    const scope = "bot applications.commands";

    return `${baseUrl}?client_id=${clientId}&permissions=${permissions}&scope=${scope}`;
});