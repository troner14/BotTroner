<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const toast = useToast();
const discord = useDiscordStore();
const { selectedGuild, loadingGuilds, formedGuilds } = storeToRefs(discord);

await discord.fetchGuilds();

const items: NavigationMenuItem[] = [{
    label: 'Maquinas Virtuales',
    icon: 'i-lucide-house',
    defaultOpen: true,
    children: [
        {
            label: 'Listado',
            icon: 'i-lucide-server',
            href: '/',
        },
        {
            label: 'accessos',
            icon: 'i-lucide-key',
            href: '/vm/accessos'
        },
        {
            label: 'Configuracion',
            icon: 'i-lucide-sliders',
            href: '/vm/settings'
        }
    ]
}, {
    label: 'Admin',
    icon: 'i-lucide-settings',
    defaultOpen: false,
    children: [{
        label: 'General'
    }, {
        label: 'Members'
    }, {
        label: 'Notifications'
    }]
}]

const logout = async () => {
    const { clear } = useUserSession();
    await clear();
    navigateTo('/login');
}

const addBotToServer = async () => {
    try {
        const inviteUrl = await $fetch<string>('/api/discord/invite');

        window.open(inviteUrl, '_blank');
    } catch (e) {
        toast.add({
            title: 'Error',
            description: 'No se pudo obtener el enlace de invitación. Inténtalo de nuevo más tarde.',
            color: 'warning'
        })
        return;
    }
    
}

</script>

<template>
    <UDashboardGroup>
        <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
        <template #header="{ collapsed }">
            <USelectMenu  v-if="!collapsed" v-model="selectedGuild" value-key="value" :loading="loadingGuilds"  :items="formedGuilds" placeholder="Select a guild"
                class="w-full">
                <template #content-bottom>
                    <div class="p-1 border-t border-default">
                        <UButton 
                            label="Agregar bot a un servidor" 
                            icon="i-lucide-plus-circle"
                            color="primary"
                            variant="soft"
                            block
                            @click="addBotToServer"
                        />
                    </div>
                </template>
            </USelectMenu>
        </template>

        <template #default="{ collapsed }">
            <UNavigationMenu :collapsed="collapsed" :items="items" orientation="vertical" />
        </template>

        <template #footer="{ collapsed }">
            <UButton :label="collapsed ? undefined : 'Logout'" icon="i-lucide-log-out" color="info"
                variant="outline" block :square="collapsed" @click="logout"/>
            <UColorModeSelect />
        </template>
    </UDashboardSidebar>

    <div class="Main-Content w-full">
        <slot />
    </div>

    </UDashboardGroup>
    

    


</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: all 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>