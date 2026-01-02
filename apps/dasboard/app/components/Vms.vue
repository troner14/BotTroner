<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui';

const props = defineProps<{
    vm: {
        id: string
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
}>();

const emit = defineEmits<{
    (e: 'refresh', panelid: number,  vmId: string): void;
}>();

const getStatusColor = (status: string): "neutral" | "primary" | "secondary" | "success" | "info" | "warning" | "error" | undefined => {
    const colors: Record<string, "primary" | 'error' | "warning"> = {
        'running': 'primary',
        'stopped': 'error',
        'paused': 'warning'
    };
    return colors[status] || 'neutral';
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatUptime = (seconds: number) => {
    if (seconds === 0) return 'Detenido';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const options = ref<ContextMenuItem[]>([
    {
        label: 'Actualizar',
        class: 'cursor-pointer',
        value: 'refresh',
        onSelect: () => {
            const id = props.vm.id;
            const panel = props.vm.panelId;
            emit('refresh', panel, id);
        }
    },
    {
        type: 'separator'
    },
    {
        label: 'Iniciar',
        value: 'start',
        color: 'success',
        class: 'cursor-pointer',
        disabled: props.vm.status === 'running'
    },
    {
        label: 'Reiniciar',
        value: 'restart',
        color: 'warning',
        class: 'cursor-pointer',
        disabled: props.vm.status === 'stopped'
    },
    {
        label: 'Detener',
        value: 'stop',
        color: 'error',
        class: 'cursor-pointer',
        disabled: props.vm.status === 'stopped'
    }
]);

</script>

<template>
    <UContextMenu :items="options">
        <UCard>
            <template #header>
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-lg">{{ vm.name }}</h3>
                    <UBadge :color="getStatusColor(vm.status)" variant="subtle">
                        {{ vm.status }}
                    </UBadge>
                </div>
            </template>

            <div class="space-y-2">
                <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-hash" class="text-gray-500" />
                    <span class="text-gray-600">ID:</span>
                    <span class="font-mono">{{ vm.id }}</span>
                </div>

                <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-server" class="text-gray-500" />
                    <span class="text-gray-600">Nodo:</span>
                    <span>{{ vm.node }}</span>
                </div>

                <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-box" class="text-gray-500" />
                    <span class="text-gray-600">Tipo:</span>
                    <span class="uppercase">{{ vm.type }}</span>
                </div>

                <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-clock" class="text-gray-500" />
                    <span class="text-gray-600">Uptime:</span>
                    <span>{{ formatUptime(vm.uptime) }}</span>
                </div>

                <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-memory-stick" class="text-gray-500" />
                    <span class="text-gray-600">Memoria:</span>
                    <span>{{ formatBytes(vm.memory_usage) }}</span>
                </div>

                <div class="flex items-center gap-2 text-sm">
                    <UIcon name="i-lucide-network" class="text-gray-500" />
                    <span class="text-gray-600">Red:</span>
                    <span>↓ {{ formatBytes(vm.network_traffic?.rx_bytes || 0) }} ↑ {{
                        formatBytes(vm.network_traffic?.tx_bytes || 0)
                        }}</span>
                </div>
            </div>

            <template #footer>
                <div class="flex gap-2">
                    <UButton icon="i-lucide-info" color="neutral" size="sm" block class="cursor-pointer"
                        @click="navigateTo(`/vms/${vm.id}`)">
                        Mas Info
                    </UButton>
                </div>
            </template>
        </UCard>
    </UContextMenu>
</template>