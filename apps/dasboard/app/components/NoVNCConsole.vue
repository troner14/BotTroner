<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
    vmId: string;
    panelId: number;
    guildId: string;
}>();


const canvasRef = ref<HTMLDivElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const connected = ref(false);
const rfb = ref<any | null>(null);
const isFullscreen = ref(false);
const showClipboardModal = ref(false);
const clipboardText = ref('');

const connectToVNC = async () => {
    loading.value = true;
    error.value = null;

    try {
        // Importar RFB dinámicamente solo en el cliente
        if (import.meta.server) return;
        
        const rfbModule = await import('~/assets/novnc/core/rfb.js');
        const RFB = rfbModule.default;

        // Obtener URL de noVNC desde el API
        const response = await $fetch<{
            success: boolean;
            data: {
                websocket: string;
                token: string;
                node: string;
                port: number;
            }
        }>('/api/vm/novnc', {
            method: 'GET',
            params: {
                id: props.vmId,
                panel: props.panelId,
                guildid: props.guildId
            }
        });

        if (!response.success || !response.data) {
            throw new Error('Failed to get noVNC connection data');
        }

        const { websocket, token } = response.data;
        
        // Usar el proxy local con parámetros en la URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const proxyUrl = `${protocol}//${window.location.host}/api/vm/vnc-proxy?` + new URLSearchParams({
            websocketUrl: websocket,
            token: token,
            panelId: props.panelId.toString(),
            guildId: props.guildId
        }).toString();

        // Limpiar conexión anterior si existe
        if (rfb.value) {
            rfb.value.disconnect();
            rfb.value = null;
        }

        // Crear conexión RFB al proxy
        if (canvasRef.value) {
            // Usar el ticket VNC como contraseña para la autenticación VNC
            const rfbInstance = new RFB(canvasRef.value, proxyUrl, {
                shared: true,
                credentials: { password: token }
            });

            // Event listeners
            rfbInstance.addEventListener('connect', () => {
                console.log('noVNC connected');
                connected.value = true;
                loading.value = false;
            });

            rfbInstance.addEventListener('disconnect', (e: any) => {
                console.log('noVNC disconnected', e.detail);
                connected.value = false;
                if (e.detail.clean) {
                    error.value = null;
                } else {
                    error.value = 'Connection lost';
                }
            });

            rfbInstance.addEventListener('securityfailure', (e: any) => {
                console.error('Security failure', e);
                error.value = 'Security failure: ' + e.detail.reason;
                loading.value = false;
            });

            // Listener para recibir texto del portapapeles de la VM
            rfbInstance.addEventListener('clipboard', (e: any) => {
                console.log('Clipboard received from VM:', e.detail.text);
                clipboardText.value = e.detail.text;
            });

            // Configuración óptima para cursor alineado sin redimensionar la VM
            rfbInstance.scaleViewport = true; // Escalar viewport manteniendo aspect ratio
            rfbInstance.resizeSession = true; // No intentar redimensionar la VM
            rfbInstance.clipViewport = false; // No recortar
            rfbInstance.dragViewport = false; // No permitir arrastrar
            rfbInstance.showDotCursor = false; // Ocultar cursor local para evitar desalineación
            rfbInstance.focusOnClick = true; // Enfocar al hacer clic
            rfbInstance.viewOnly = false; // Permitir interacción

            rfb.value = rfbInstance;
        }

    } catch (err) {
        console.error('Error connecting to noVNC:', err);
        error.value = (err as Error).message || 'Failed to connect to VM console';
        loading.value = false;
    }
};

const disconnect = () => {
    if (rfb.value) {
        rfb.value.disconnect();
        rfb.value = null;
    }
    connected.value = false;
};

const sendCtrlAltDel = () => {
    if (rfb.value && connected.value) {
        rfb.value.sendCtrlAltDel();
    }
};

const openClipboard = () => {
    showClipboardModal.value = true;
};

const sendClipboardToVM = () => {
    if (rfb.value && connected.value && clipboardText.value) {
        rfb.value.clipboardPasteFrom(clipboardText.value);
        console.log('Clipboard sent to VM:', clipboardText.value);
    }
};

const copyToSystemClipboard = async () => {
    try {
        await navigator.clipboard.writeText(clipboardText.value);
        console.log('Copied to system clipboard');
    } catch (err) {
        console.error('Failed to copy to system clipboard:', err);
    }
};

const toggleFullscreen = async () => {
    if (!containerRef.value) return;
    
    try {
        if (!isFullscreen.value) {
            // Entrar en pantalla completa
            if (containerRef.value.requestFullscreen) {
                await containerRef.value.requestFullscreen();
            } else if ((containerRef.value as any).webkitRequestFullscreen) {
                await (containerRef.value as any).webkitRequestFullscreen();
            } else if ((containerRef.value as any).msRequestFullscreen) {
                await (containerRef.value as any).msRequestFullscreen();
            }
        } else {
            // Salir de pantalla completa
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if ((document as any).webkitExitFullscreen) {
                await (document as any).webkitExitFullscreen();
            } else if ((document as any).msExitFullscreen) {
                await (document as any).msExitFullscreen();
            }
        }
    } catch (err) {
        console.error('Error toggling fullscreen:', err);
    }
};

// Detectar cambios en el estado de pantalla completa
const handleFullscreenChange = () => {
    isFullscreen.value = !!document.fullscreenElement;
};

onMounted(() => {
    connectToVNC();
    // Escuchar cambios en pantalla completa
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
    disconnect();
    // Limpiar event listeners
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('msfullscreenchange', handleFullscreenChange);
});

// Reconectar si cambian las props
watch(() => [props.vmId, props.panelId], () => {
    disconnect();
    connectToVNC();
});

defineExpose({
    reconnect: connectToVNC,
    disconnect,
    sendCtrlAltDel
});
</script>

<template>
    <div ref="containerRef" class="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden" :class="{ 'fullscreen-container': isFullscreen }">
        <!-- Loading state -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div class="text-center text-gray-400">
                <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-lg">Conectando con la VM...</p>
            </div>
        </div>

        <!-- Error state -->
        <div v-if="error && !loading" class="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div class="text-center text-red-400">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-lg mb-4">{{ error }}</p>
                <UButton color="primary" @click="connectToVNC">
                    Reintentar
                </UButton>
            </div>
        </div>

        <!-- noVNC Canvas -->
        <div ref="canvasRef" class="w-full h-full" :class="{ 'opacity-0': loading || error }"></div>

        <!-- Toolbar -->
        <div v-if="connected && !loading" class="absolute top-4 right-4 flex gap-2">
            <UButton 
                icon="i-heroicons-arrow-path" 
                color="neutral" 
                size="sm"
                title="Reconectar"
                @click="connectToVNC"
            />
            <UButton 
                icon="i-heroicons-computer-desktop" 
                color="neutral" 
                size="sm"
                title="Enviar Ctrl+Alt+Del"
                @click="sendCtrlAltDel"
            />
            <UButton 
                icon="i-heroicons-clipboard-document" 
                color="neutral" 
                size="sm"
                title="Portapapeles"
                @click="openClipboard"
            />
            <UButton 
                :icon="isFullscreen ? 'i-heroicons-arrows-pointing-in' : 'i-heroicons-arrows-pointing-out'" 
                color="neutral" 
                size="sm"
                :title="isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'"
                @click="toggleFullscreen"
            />
            <UButton 
                icon="i-heroicons-x-mark" 
                color="error" 
                size="sm"
                title="Desconectar"
                @click="disconnect"
            />
        </div>

        <!-- Modal de Portapapeles -->
        <UModal v-model:open="showClipboardModal" class="sm:max-w-2xl">
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">Portapapeles</h3>
                        <UButton
                            color="neutral"
                            variant="ghost"
                            icon="i-heroicons-x-mark"
                            @click="showClipboardModal = false"
                        />
                    </div>
                </template>

                <template #body>
                    <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Texto del portapapeles
                        </label>
                        <UTextarea
                            v-model="clipboardText"
                            :rows="10"
                            placeholder="Pega aquí el texto que quieres enviar a la VM o copia el texto recibido de la VM"
                        />
                    </div>

                    <div class="flex gap-2">
                        <UButton
                            color="primary"
                            icon="i-heroicons-arrow-up-tray"
                            @click="sendClipboardToVM"
                            :disabled="!clipboardText"
                        >
                            Enviar a VM
                        </UButton>
                        <UButton
                            color="neutral"
                            icon="i-heroicons-clipboard"
                            @click="copyToSystemClipboard"
                            :disabled="!clipboardText"
                        >
                            Copiar a portapapeles local
                        </UButton>
                    </div>

                    <div class="text-sm text-gray-500">
                        <p class="mb-2"><strong>Cómo usar:</strong></p>
                        <ul class="list-disc list-inside space-y-1">
                            <li>Pega texto aquí y haz clic en "Enviar a VM" para usarlo dentro de la VM</li>
                            <li>El texto copiado en la VM aparecerá automáticamente aquí</li>
                            <li>Usa "Copiar a portapapeles local" para usar el texto en tu PC</li>
                        </ul>
                    </div>
                </div>
                </template>
                
            </UCard>
        </UModal>
    </div>
</template>

<style scoped>
/* Asegurar que el contenedor permita el tamaño correcto del canvas */
:deep(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
    object-fit: contain;
    aspect-ratio: 16/9;
    /* Mostrar cursor por defecto del navegador para tener referencia */
    cursor: default;
}

:deep(.noVNC_canvas) {
    width: 100% !important;
    height: 100% !important;
}

/* Estilos para pantalla completa */
.fullscreen-container {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 9999 !important;
    border-radius: 0 !important;
}
</style>
