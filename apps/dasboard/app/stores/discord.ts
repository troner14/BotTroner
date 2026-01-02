import type { guildsResponse } from '~~/types/discord.types';


export const useDiscordStore = defineStore('discord', {
    state: () => {
        return {
            guilds: [] as Array<guildsResponse>,
            selectedGuild: undefined as string | undefined,
            loadingGuilds: false
        }
    },

    getters: {
        formedGuilds(state) {
            return state.guilds.map(g => ({
                label: g.name,
                value: g.id
            }));
        }
    },

    actions: {
        async fetchGuilds() {
            this.loadingGuilds = true;
            try {
                const { data } = await useFetch<guildsResponse[]>('/api/discord/guilds', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                this.guilds = data.value || [];
                this.selectedGuild = this.guilds[0]?.id;
            } catch (e) {
                console.error('Error fetching guilds:', e);
            } finally {
                this.loadingGuilds = false;
            }
        }
    }
})