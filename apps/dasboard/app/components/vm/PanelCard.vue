<script setup lang="ts">
import { ref } from 'vue'
import AddPanelModal from './AddPanelModal.vue';

const { panel } = defineProps<{
    panel: PanelSimpleInfo
}>();

const isActive = ref(panel.active);
const isEditing = ref(false);
const editedName = ref(panel.name);

const toast = useToast();

const edit = ref(false);

const toggleActive = async () => {
    try {
        const response = await $fetch(`/api/vm/panels/${panel.id}`, {
            method: 'PATCH',
            body: {
                active: !isActive.value
            }
        })
        if (response.success !== true) {
            throw new Error('Failed to toggle panel state')
        }
        isActive.value = !isActive.value
        toast.add({
            title: isActive.value ? 'Panel activado' : 'Panel desactivado',
            description: `El panel "${panel.name}" ha sido ${isActive.value ? 'activado' : 'desactivado'} correctamente`,
            color: isActive.value ? 'success' : 'neutral',
            icon: isActive.value ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'
        })
    } catch (error) {
        toast.add({
            title: 'Error',
            description: 'No se pudo cambiar el estado del panel',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
    }
}

const saveName = async () => {
    try {
        // TODO: Llamar API para guardar el nombre
        panel.name = editedName.value
        isEditing.value = false
        toast.add({
            title: 'Guardado',
            description: 'El nombre del panel se actualizó correctamente',
            color: 'success',
            icon: 'i-heroicons-check-circle'
        })
    } catch (error) {
        toast.add({
            title: 'Error',
            description: 'No se pudo actualizar el nombre',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
    }
}

const cancelEdit = () => {
    editedName.value = panel.name
    isEditing.value = false
}

const openEditModal = () => {
    edit.value = true
}

</script>

<template>
    <UCard class="hover:shadow-lg transition-shadow duration-200" 
        :ui="{
            body: 'min-w-100'
        }">
        <template #header>
            <div class="flex justify-between items-start gap-4">
                <div class="flex-1">
                    <div v-if="!isEditing" class="flex items-center gap-2">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ panel.name }}</h2>
                        <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost"
                            @click="isEditing = true" class="rounded-full" />
                    </div>
                    <div v-else class="flex items-center gap-2">
                        <UInput v-model="editedName" size="md" placeholder="Nombre del panel" class="flex-1" />
                        <UButton icon="i-heroicons-check" size="sm" color="success" @click="saveName"
                            class="rounded-full" />
                        <UButton icon="i-heroicons-x-mark" size="sm" color="error" variant="ghost" @click="cancelEdit"
                            class="rounded-full" />
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <UIcon name="i-heroicons-cpu-chip" class="w-4 h-4" />
                        {{ panel.type }}
                    </p>
                </div>
                <div class="flex flex-col gap-2 items-end">
                    <UBadge v-if="panel.isDefault" color="info" variant="soft" size="md">
                        <UIcon name="i-heroicons-star" class="w-3 h-3" />
                        Default
                    </UBadge>
                    <UBadge :color="isActive ? 'success' : 'neutral'" variant="soft" size="md" class="font-medium">
                        <UIcon :name="isActive ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" class="w-3 h-3" />
                        {{ isActive ? 'Activo' : 'Inactivo' }}
                    </UBadge>
                </div>
            </div>
        </template>

        <div class="space-y-4">
            <!-- Información del panel -->
            <div class="grid grid-cols-1 gap-4">
                <div class="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">ID del Panel</p>
                    <p class="text-base font-mono font-semibold text-gray-900 dark:text-white">{{ panel.id }}</p>
                </div>
                <div class="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tipo de Panel</p>
                    <p class="text-base font-semibold text-gray-900 dark:text-white capitalize">{{ panel.type }}</p>
                </div>
                <div class="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <UIcon name="i-heroicons-link" class="w-3 h-3" />
                        API URL
                    </p>
                    <p class="text-sm font-mono text-gray-900 dark:text-white break-all">{{ panel.apiUrl }}</p>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-3 justify-end">
                <UButton :color="isActive ? 'error' : 'success'"
                    :icon="isActive ? 'i-heroicons-power' : 'i-heroicons-play'" variant="solid" @click="toggleActive"
                    size="lg">
                    {{ isActive ? 'Desactivar' : 'Activar' }}
                </UButton>
                <UButton color="info" icon="i-heroicons-cog-6-tooth" variant="soft" size="lg" @click="openEditModal">
                    Configurar
                </UButton>
            </div>
        </template>
    </UCard>

    <AddPanelModal v-model:open="edit" :panel="panel" />
</template>

<style scoped>
.hover\:shadow-lg {
    transition: box-shadow 0.2s ease-in-out;
}
</style>