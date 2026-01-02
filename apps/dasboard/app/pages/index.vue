<script setup lang="ts">

definePageMeta({
    middleware: 'auth-check',
    layout: 'dashboard'
})
const vms = ref<VM[]>([]);
const loading = ref(false);
const store = useDiscordStore();
const { selectedGuild } = storeToRefs(store);

interface VM {
    id: string;
    name: string;
    status: string;
    node: string;
    type: string;
    uptime: number;
    memory_usage: number;
    panelId: number;
    network_traffic?: {
        rx_bytes: number;
        tx_bytes: number;
    };
}

const listVms = async (guildId: string) => {
    loading.value = true;
    try {
        const res = await $fetch<{
            data: VM[];
        }>(`/api/discord/listVM?guildid=${guildId}`);
        vms.value = res.data || [];
    } catch (error) {
        console.error('Error fetching VMs:', error);
        vms.value = [];
    } finally {
        loading.value = false;
    }
};

watch(selectedGuild, async (newGuildId) => {
    if (!newGuildId) {
        vms.value = [];
        return;
    }

    await listVms(newGuildId);
});

// Cargar VMs solo en el cliente (no bloquear SSR)
onMounted(() => {
    if (selectedGuild.value) {
        listVms(selectedGuild.value);
    }
});

function refreshVms() {
    if (selectedGuild.value) {
        listVms(selectedGuild.value);
    }
}

// Computed para ordenar VMs una sola vez
const sortedVms = computed(() => {
    return [...vms.value].sort((a, b) => {
        if (a.status === b.status) {
            return a.name.localeCompare(b.name);
        }
        return a.status === 'running' ? -1 : 1;
    });
});

const refreshVm = async (panelid: number, vmId: string) => {
    const info = await $fetch('/api/vm/status', {
        method: 'GET',
        params: {
            id: vmId,
            panel: panelid,
            guildid: selectedGuild.value
        }
    })

    if (info.success && info.data) {
        // Actualizar la VM específica en la lista
        const index = vms.value.findIndex(vm => vm.id === vmId && vm.panelId === panelid);
        if (index !== -1) {
            vms.value[index] = info.data as any;
        }
    }


    console.log(info);
};

</script>

<template>
    <div class="p-6">
        <div class="flex justify-between items-center mb-12 ">
            <h1 class="text-2xl font-bold">Máquinas Virtuales</h1>
            <UButton class="w-auto h-10 align-center" @click="refreshVms">Refrescar Todo</UButton>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="flex items-center justify-center p-12">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl" />
        </div>

        <!-- Empty state -->
        <UCard v-else-if="vms.length === 0">
            <div class="text-center py-12">
                <UIcon name="i-lucide-server-off" class="text-6xl mb-4 text-gray-400" />
                <h3 class="text-xl font-semibold mb-2">No hay máquinas virtuales</h3>
                <p class="text-gray-500">Esta guild no tiene ninguna máquina virtual configurada.</p>
            </div>
        </UCard>

        <!-- VMs Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Vms v-for="vm in sortedVms" :key="vm.id" :vm="vm" @refresh="refreshVm" />
        </div>
    </div>
</template>