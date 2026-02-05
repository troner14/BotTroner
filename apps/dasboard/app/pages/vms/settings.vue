<script setup lang="ts">
import PanelCard from '~/components/vm/PanelCard.vue';
import AddPanelModal from '~/components/vm/AddPanelModal.vue';

definePageMeta({
    middleware: 'auth-check',
    layout: 'dashboard'
});

// const panels = ref<PanelSimpleInfo | undefined>(undefined);
const discord = useDiscordStore();
const { selectedGuild } = storeToRefs(discord);

const isModalOpen = ref(false);

const { data: panels, pending} = await useAsyncData('vm-panels', async () => {
    const fetch = await $fetch('/api/vm/panels', {
        method: 'GET',
        params: {
            guildid: selectedGuild.value
        }
    });

    if (fetch.success) {
        return fetch.data as PanelSimpleInfo[];
    }

    return [];
});

</script>

<template>

    <div class="p-4 flex justify-between items-center">
        <div>
            <h1 class="text-2xl font-bold mb-2">VM Settings</h1>
            <p class="text-gray-600 dark:text-gray-400">Configura els panels de virtualització</p>
        </div>
        <UButton color="primary" size="lg" @click="isModalOpen = true" 
            icon="i-heroicons-plus-circle"
            :ui="{ base: 'rounded-lg' }">
            Agregar Panel
        </UButton>
    </div>

    <section class="m-5 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <USkeleton v-if="pending" class="h-32 w-full rounded-lg" v-for="n in 3" :key="n" />
        <PanelCard v-for="panel in panels" :key="panel.id" :panel="panel" />
        
        <!-- Card para agregar nuevo panel cuando no hay paneles -->
        <UCard v-if="!pending && panels?.length === 0" 
            class="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2 border-dashed"
            @click="isModalOpen = true">
            <div class="flex flex-col items-center justify-center py-8 text-center">
                <UIcon name="i-heroicons-plus-circle" class="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    No hay paneles configurados
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                    Haz clic aquí para agregar tu primer panel de virtualización
                </p>
            </div>
        </UCard>
    </section>

    <!-- Modal para agregar panel -->
    <AddPanelModal v-model:open="isModalOpen" />
</template> 