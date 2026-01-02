<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'

definePageMeta({
    middleware: 'auth-check',
    layout: 'dashboard'
});

const route = useRoute();
const theme = useColorMode();
const discord = useDiscordStore();
const { selectedGuild } = storeToRefs(discord);
const vmId = route.params.id as string;

// Interfaces
interface VMStatus {
    name: string;
    status: string;
    uptime: number;
    cpu_usage: number;
    memory_usage: number;
    maxMemory: number;
    disk_usage: number;
    maxDisk: number;
    network_traffic: {
        rx_bytes: number;
        tx_bytes: number;
    }
    guestDisk: {
        total: number;
        used: number;
    }

}

interface RRDDataPoint {
    time: number;
    cpu?: number;
    mem?: number;
    maxmem?: number;
    disk?: number;
    maxdisk?: number;
    netin?: number;
    netout?: number;
}

// Estado de la VM
const vmData = ref({
    name: `VM-${vmId}`,
    status: 'loading',
});

// Tipo de consola activa
const consoleType = ref<'novnc' | 'terminal'>('novnc');

// Estado actual de la VM
const currentStatus = ref<VMStatus | null>(null);
const loading = ref(true);

// Datos de métricas para gráficos (últimos 10 puntos)
const cpuUsage = ref<number[]>([]);
const ramUsage = ref<number[]>([]);
const diskUsage = ref<number[]>([]);
const networkIn = ref<number[]>([]);
const networkOut = ref<number[]>([]);

// Sanitizar valores numéricos
const sanitizeNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
        return 0;
    }
    return value;
};

// Cargar datos históricos
const loadHistoricalData = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: RRDDataPoint[] }>(`/api/vm/rrddata`, {
            method: 'GET',
            params: {
                id: vmId,
                panel: 1,
                guildid: selectedGuild.value,
                timeframe: 'hour'
            }
        });

        if (response.success && response.data.length > 0) {
            const lastPoints = response.data.slice(-20);

            cpuUsage.value = lastPoints.map(p => sanitizeNumber(p.cpu));
            ramUsage.value = lastPoints.map(p => sanitizeNumber(((p.mem || 0) / (p.maxmem || 1)) * 100));
            diskUsage.value = lastPoints.map(p => sanitizeNumber(((p.disk || 0) / (p.maxdisk || 1)) * 100));
            networkIn.value = lastPoints.map(p => sanitizeNumber((p.netin || 0) / 1024)); // KB/s
            networkOut.value = lastPoints.map(p => sanitizeNumber((p.netout || 0) / 1024)); // KB/s
        }
    } catch (error) {
        console.error('Error cargando datos históricos:', error);
    }
};

// Cargar estado actual
const loadCurrentStatus = async () => {
    try {
        const response = await $fetch<{ success: boolean; data: VMStatus }>(`/api/vm/status`,
            {
                method: 'GET',
                params: {
                    id: vmId,
                    panel: 1,
                    guildid: selectedGuild.value
                }
            }
        );

        if (response.success) {
            currentStatus.value = response.data;
            vmData.value.status = response.data.status;
            vmData.value.name = response.data.name;

            // Actualizar también los gráficos con el último valor
            if (cpuUsage.value.length >= 20) {
                cpuUsage.value.shift();
                ramUsage.value.shift();
                diskUsage.value.shift();
                networkIn.value.shift();
                networkOut.value.shift();
            }

            cpuUsage.value.push(sanitizeNumber(response.data.cpu_usage));
            ramUsage.value.push(sanitizeNumber((response.data.memory_usage / response.data.maxMemory) * 100));
            if (response.data.guestDisk && response.data.guestDisk.used) {
                const guestDiskInfo = response.data.guestDisk as any;
                if (guestDiskInfo.total && guestDiskInfo.used) {
                    const diskPercent = (guestDiskInfo.used / guestDiskInfo.total) * 100;
                    diskUsage.value.push(sanitizeNumber(diskPercent));
                } else {
                    diskUsage.value.push(0);
                }
            } else {
                diskUsage.value.push(sanitizeNumber((response.data.disk_usage / response.data.maxDisk) * 100));
            }
            networkIn.value.push(sanitizeNumber(response.data.network_traffic.rx_bytes / 1024));
            networkOut.value.push(sanitizeNumber(response.data.network_traffic.tx_bytes / 1024));
        }
    } catch (error) {
        console.error('Error cargando estado actual:', error);
    }
};

// Formatear bytes
const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Formatear velocidad de red (KB/s o MB/s)
const formatNetworkSpeed = (kbps: number) => {
    if (kbps >= 1024) {
        return `${Math.round((kbps / 1024) * 100) / 100} MB/s`;
    }
    return `${Math.round(kbps)} KB/s`;
};

// Formatear uptime
const formatUptime = (seconds: number) => {
    if (seconds === 0) return 'Detenido';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

// Acciones de la VM
const actions = [
    { label: 'Iniciar', icon: 'i-heroicons-play', color: 'green', action: 'start' },
    { label: 'Reiniciar', icon: 'i-heroicons-arrow-path', color: 'orange', action: 'restart' },
    { label: 'Detener', icon: 'i-heroicons-stop', color: 'red', action: 'stop' },
    { label: 'Eliminar', icon: 'i-heroicons-trash', color: 'red', action: 'delete' }
];

const performAction = (action: string) => {
    console.log(`Ejecutando acción: ${action} en VM ${vmId}`);
    // Aquí se implementará la lógica de las acciones
};

const getStatusColor = (status: string) => {
    return status === 'running' ? 'green' : status === 'stopped' ? 'red' : 'gray';
};

// Polling interval
let pollingInterval: NodeJS.Timeout | null = null;

// Opciones de gráficos ApexCharts
const chartOptions: ApexOptions = {
    chart: {
        type: 'line',
        toolbar: { show: false },
        animations: {
            enabled: true,
            dynamicAnimation: {
                speed: 500
            }
        },
        background: 'transparent'
    },
    stroke: {
        curve: 'smooth',
        width: 2
    },
    xaxis: {
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
    },
    yaxis: {
        show: true,
        min: 0,
        // max: 100,
        decimalsInFloat: 2
    },
    grid: { show: false },
    tooltip: {
        enabled: true,
        x: {
            formatter: (val: number, opts: any) => {
                const dataPointIndex = opts?.dataPointIndex ?? 0;
                const totalPoints = opts?.w?.config?.series?.[0]?.data?.length ?? 20;
                const secondsAgo = (totalPoints - 1 - dataPointIndex) * 3;
                return `hace ${secondsAgo}s`;
            }
        },
        y: {
            formatter: (val: number) => `${val.toFixed(2)}%`
        }
    },
    theme: {
        mode: theme.value === 'dark' ? 'dark' : 'light'
    }
}

// Inicializar datos
onMounted(async () => {
    loading.value = true;
    await loadHistoricalData();
    await loadCurrentStatus();
    loading.value = false;

    // Actualizar cada 3 segundos
    pollingInterval = setInterval(() => {
        loadCurrentStatus();
    }, 3000);
});

// Limpiar interval al desmontar
onUnmounted(() => {
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
});
</script>

<template>
    <div class="h-full overflow-y-auto">
        <div class="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
            <!-- Botón de volver atrás -->
            <div>
                <UButton icon="i-heroicons-arrow-left" color="neutral" variant="ghost" size="sm" class="cursor-pointer"
                    @click="navigateTo('/')">
                    Volver
                </UButton>
            </div>

            <!-- Header con información de la VM -->
            <div class="space-y-3">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ vmData.name }}</h1>
                <div class="flex flex-wrap gap-2 items-center">
                    <UBadge variant="subtle" size="md" :class="`text-${getStatusColor(vmData.status)}-600`">
                        {{ vmData.status }}
                    </UBadge>
                </div>
            </div>

            <!-- Área principal: Terminal/noVNC + Botones de acciones -->
            <div class="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                <!-- Console Container -->
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="text-lg font-semibold">Console</h3>
                            <div class="flex gap-2">
                                <UButton :color="consoleType === 'novnc' ? 'primary' : 'neutral'"
                                    :variant="consoleType === 'novnc' ? 'solid' : 'ghost'" size="sm"
                                    @click="consoleType = 'novnc'">
                                    noVNC
                                </UButton>
                                <UButton :color="consoleType === 'terminal' ? 'primary' : 'neutral'"
                                    :variant="consoleType === 'terminal' ? 'solid' : 'ghost'" size="sm"
                                    @click="consoleType = 'terminal'">
                                    Terminal
                                </UButton>
                            </div>
                        </div>
                    </template>

                    <div class="h-125 bg-gray-900 rounded-lg overflow-hidden">
                        <!-- noVNC Console -->
                        <ClientOnly>
                            <NoVNCConsole v-if="consoleType === 'novnc'" :vm-id="vmId" :panel-id="1"
                                :guild-id="selectedGuild!" />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <div class="text-center text-gray-400">
                                    <div class="text-6xl mb-4">💻</div>
                                    <p class="text-lg">Terminal se implementará próximamente</p>
                                </div>
                            </div>
                        </ClientOnly>
                    </div>
                </UCard>

                <!-- Actions Panel -->
                <UCard>
                    <template #header>
                        <h3 class="text-lg font-semibold">Acciones</h3>
                    </template>

                    <div class="grid grid-cols-2 gap-3">
                        <UButton v-for="item in actions" :key="item.action" variant="outline" size="lg" color="neutral"
                            :disabled="item.action === 'start' && vmData.status === 'running' ||
                                item.action === 'stop' && vmData.status === 'stopped'"
                            class="flex flex-col items-center justify-center h-24 cursor-pointer"
                            :class="`text-${item.color}-600`" @click="performAction(item.action)">
                            <UIcon :name="item.icon" class="w-6 h-6 mb-2" />
                            <span class="text-sm">{{ item.label }}</span>
                        </UButton>
                    </div>
                </UCard>
            </div>

            <!-- Paneles de métricas -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- CPU Usage -->
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="text-base font-semibold">Uso de CPU</h3>
                            <span class="text-2xl font-bold text-blue-600">{{ cpuUsage.length > 0 ?
                                Math.round(cpuUsage[cpuUsage.length - 1] ?? 0) : 0 }}%</span>
                        </div>
                    </template>

                    <template #default class="p-0">
                        <ClientOnly>
                            <VueApexCharts v-if="cpuUsage.length > 0" type="line"
                                :options="{ ...chartOptions, colors: ['#3b82f6'] }"
                                :series="[{ name: 'CPU', data: cpuUsage }]" height="100%"></VueApexCharts>
                        </ClientOnly>
                    </template>

                    <template #footer>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Promedio: {{cpuUsage.length > 0 ? Math.round(cpuUsage.reduce((a, b) => a + b) /
                                cpuUsage.length) : 0 }}%
                        </div>
                    </template>
                </UCard>

                <!-- RAM Usage -->
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="text-base font-semibold">Uso de RAM</h3>
                            <span class="text-2xl font-bold text-green-600">{{ ramUsage.length > 0 ?
                                Math.round(ramUsage[ramUsage.length - 1] ?? 0) : 0 }}%</span>
                        </div>
                    </template>

                    <template #default class="p-0">
                        <ClientOnly>
                            <VueApexCharts v-if="ramUsage.length > 0" type="line"
                                :options="{ ...chartOptions, colors: ['#3b82f6'] }"
                                :series="[{ name: 'RAM', data: ramUsage }]" height="100%"></VueApexCharts>
                        </ClientOnly>
                    </template>

                    <template #footer>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Usado: {{ currentStatus ? formatBytes(currentStatus.memory_usage) : '0 B' }} / {{
                                currentStatus ?
                                    formatBytes(currentStatus.maxMemory) : '0 B' }}
                        </div>
                    </template>
                </UCard>

                <!-- Disk Usage -->
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="text-base font-semibold">Uso de Disco</h3>
                            <span class="text-2xl font-bold text-orange-600">{{ diskUsage.length > 0 ?
                                Math.round(diskUsage[diskUsage.length - 1] ?? 0) : 0 }}%</span>
                        </div>
                    </template>

                    <template #default class="p-0">
                        <ClientOnly>
                            <VueApexCharts v-if="diskUsage.length > 0" type="line"
                                :options="{ ...chartOptions, colors: ['#3b82f6'] }"
                                :series="[{ name: 'Disco', data: diskUsage }]" height="100%"></VueApexCharts>
                        </ClientOnly>
                    </template>

                    <template #footer>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Usado: {{ currentStatus ? formatBytes(currentStatus.disk_usage !== 0 ? currentStatus.disk_usage : currentStatus.guestDisk.used) : '0 B' }} / {{
                                currentStatus ?
                                    formatBytes(currentStatus.maxDisk) : '0 B' }}
                        </div>
                    </template>
                </UCard>

                <!-- Network In -->
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="text-base font-semibold">Red (Entrada)</h3>
                            <span class="text-2xl font-bold text-purple-600">{{ networkIn.length > 0 ?
                                formatNetworkSpeed(networkIn[networkIn.length - 1] ?? 0) : '0 KB/s' }}</span>
                        </div>
                    </template>

                    <template #default class="p-0">
                        <ClientOnly>
                            <VueApexCharts v-if="networkIn.length > 0" type="line" :options="{
                                ...chartOptions, yaxis: {
                                    show: true,
                                    min: 0,
                                    decimalsInFloat: 0,
                                    labels: {
                                        formatter: (val: number) => formatNetworkSpeed(val)
                                    }
                                }, tooltip: {
                                    enabled: true,
                                    y: {
                                        formatter: (val: number) => formatNetworkSpeed(val)
                                    }
                                }, colors: ['#3b82f6']
                            }" :series="[{ name: 'Red (Entrada)', data: networkIn }]"
                                height="100%"></VueApexCharts>
                        </ClientOnly>
                    </template>

                    <template #footer>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Promedio: {{networkIn.length > 0 ? formatNetworkSpeed(networkIn.reduce((a, b) => a + b) /
                                networkIn.length) : '0 KB/s' }}
                        </div>
                    </template>
                </UCard>

                <!-- Network Out -->
                <UCard>
                    <template #header>
                        <div class="flex justify-between items-center">
                            <h3 class="text-base font-semibold">Red (Salida)</h3>
                            <span class="text-2xl font-bold text-pink-600">{{ networkOut.length > 0 ?
                                formatNetworkSpeed(networkOut[networkOut.length - 1] ?? 0) : '0 KB/s' }}</span>
                        </div>
                    </template>

                    <template #default class="p-0">
                        <ClientOnly>
                            <VueApexCharts v-if="networkOut.length > 0" type="line" :options="{
                                ...chartOptions, yaxis: {
                                    show: true,
                                    min: 0,
                                    decimalsInFloat: 2,
                                    labels: {
                                        formatter: (val: number) => formatNetworkSpeed(val)
                                    }
                                }, tooltip: {
                                    enabled: true,
                                    y: {
                                        formatter: (val: number) => formatNetworkSpeed(val)
                                    }
                                }, colors: ['#3b82f6']
                            }" :series="[{ name: 'Red (Salida)', data: networkOut }]"
                                height="100%"></VueApexCharts>
                        </ClientOnly>
                    </template>

                    <template #footer>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Promedio: {{networkOut.length > 0 ? formatNetworkSpeed(networkOut.reduce((a, b) => a + b) /
                                networkOut.length) : '0 KB/s' }}
                        </div>
                    </template>
                </UCard>

                <!-- Uptime -->
                <UCard>
                    <template #header>
                        <h3 class="text-base font-semibold">Uptime</h3>
                    </template>

                    <div class="text-center py-8">
                        <div class="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                            {{ currentStatus ? formatUptime(currentStatus.uptime) : 'Detenido' }}
                        </div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">Tiempo activo</div>
                    </div>

                    <template #footer>
                        <div class="text-sm text-gray-600 dark:text-gray-400">
                            Estado: {{ currentStatus?.status || 'Desconocido' }}
                        </div>
                    </template>
                </UCard>
            </div>
        </div>
    </div>
</template>