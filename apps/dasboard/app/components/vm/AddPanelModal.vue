<script setup lang="ts">
import { ref } from 'vue'

const isOpen = defineModel<boolean>('open', { default: false })
const props = defineProps<{
    panel?: PanelSimpleInfo
}>()

const toast = useToast();

const formData = ref({
    name: '',
    type: 'proxmox',
    apiUrl: '',
    username: '',
    password: '',
    isDefault: false
})

if (props.panel) {
    formData.value = {
        name: props.panel.name,
        type: props.panel.type,
        apiUrl: props.panel.apiUrl,
        username: '',
        password: '',
        isDefault: props.panel.isDefault
    }
}

const panelTypes = [
    { label: 'Proxmox', value: 'proxmox' },
    { label: 'VMware', value: 'vmware' },
    { label: 'Hyper-V', value: 'hyperv' }
]
const discord = useDiscordStore()
const { selectedGuild } = storeToRefs(discord)

const isLoading = ref(false)

const resetForm = () => {
    formData.value = {
        name: '',
        type: 'proxmox',
        apiUrl: '',
        username: '',
        password: '',
        isDefault: false
    }
}

const validateForm = () => {
    if (!formData.value.name.trim()) {
        toast.add({
            title: 'Error de validación',
            description: 'El nombre del panel es requerido',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
        return false
    }

    if (!formData.value.apiUrl.trim()) {
        toast.add({
            title: 'Error de validación',
            description: 'La URL de la API es requerida',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
        return false
    }

    // Validar URL
    try {
        new URL(formData.value.apiUrl)
    } catch {
        toast.add({
            title: 'Error de validación',
            description: 'La URL de la API no es válida',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
        return false
    }

    if (!formData.value.username.trim()) {
        toast.add({
            title: 'Error de validación',
            description: 'El usuario es requerido',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
        return false
    }

    if (!formData.value.password.trim()) {
        toast.add({
            title: 'Error de validación',
            description: 'La contraseña es requerida',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
        return false
    }

    return true
}

const handleSubmit = async () => {
    if (!validateForm()) {
        return
    }

    isLoading.value = true

    try {
        let response = {
            success: false,
            message: ''
        };
        if (props.panel) {
            const res = await $fetch(`/api/vm/panels/${props.panel.id}`, {
                method: 'PATCH',
                body: {
                    name: formData.value.name,
                    type: formData.value.type,
                    apiUrl: formData.value.apiUrl,
                    credentials: {
                        type: 'token',
                        data: {
                            token: `${formData.value.username}=${formData.value.password}`
                        }
                    },
                    isDefault: formData.value.isDefault
                }
            });
            response = res;
        } else {
            const res = await $fetch('/api/vm/panels', {
                method: 'POST',
                body: {
                    guildid: selectedGuild.value,
                    name: formData.value.name,
                    type: formData.value.type,
                    apiUrl: formData.value.apiUrl,
                    credentials: {
                        type: 'token',
                        data: {
                            token: `${formData.value.username}=${formData.value.password}`
                        }
                    },
                    isDefault: formData.value.isDefault
                }
            });
            response = res;
        }


        if (response.success) {
            toast.add({
                title: 'Panel creado',
                description: `El panel "${formData.value.name}" ha sido creado correctamente`,
                color: 'success',
                icon: 'i-heroicons-check-circle'
            })

            // Refrescar los datos
            await refreshNuxtData('vm-panels')

            // Cerrar modal y resetear formulario
            isOpen.value = false
            resetForm()
        } else {
            throw new Error(response.message || 'Error desconocido')
        }
    } catch (error: any) {
        toast.add({
            title: 'Error',
            description: error.data?.message || error.data?.statusMessage || 'No se pudo crear el panel de virtualización',
            color: 'error',
            icon: 'i-heroicons-exclamation-triangle'
        })
    } finally {
        isLoading.value = false
    }
}

const handleClose = () => {
    if (!isLoading.value) {
        isOpen.value = false
        resetForm()
    }
}
</script>

<template>
    <UModal v-model:open="isOpen" :prevent-close="isLoading">
        <template #content>
            <UCard>
                <template #header>
                    <div class="flex items-center justify-between">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
                            <UIcon name="i-heroicons-plus-circle" class="w-5 h-5 inline-block mr-2" />
                            Agregar Panel de Virtualización
                        </h3>
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1"
                            @click="handleClose" :disabled="isLoading" />
                    </div>
                </template>

                <div class="space-y-4">
                    <!-- Nombre del Panel -->
                    <UFormField label="Nombre del Panel" name="name" required>
                        <UInput v-model="formData.name" :default-value="formData.name" class="w-full" placeholder="Ej: Panel Principal Proxmox"
                            :disabled="isLoading" icon="i-heroicons-tag" />
                    </UFormField>

                    <!-- Tipo de Panel -->
                    <UFormField label="Tipo de Panel" name="type" required>
                        <USelect v-model="formData.type" :default-value="formData.type" class="w-full" :items="panelTypes" :disabled="isLoading"
                            icon="i-heroicons-cpu-chip" />
                    </UFormField>

                    <!-- URL de la API -->
                    <UFormField label="URL de la API" name="apiUrl" required>
                        <UInput v-model="formData.apiUrl" :default-value="formData.apiUrl" class="w-full" placeholder="https://proxmox.example.com:8006"
                            :disabled="isLoading" icon="i-heroicons-link" />
                        <template #hint>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                Incluye el protocolo (https://) y el puerto si es necesario
                            </span>
                        </template>
                    </UFormField>

                    <!-- Usuario -->
                    <UFormField label="Usuario" name="username" required>
                        <UInput v-model="formData.username" class="w-full" placeholder="root@pam" :disabled="isLoading"
                            icon="i-heroicons-user" />
                    </UFormField>

                    <!-- Contraseña -->
                    <UFormField label="Contraseña / apiToken" name="password" required>
                        <UInput v-model="formData.password" class="w-full" type="password" placeholder="••••••••"
                            :disabled="isLoading" icon="i-heroicons-lock-closed" />
                    </UFormField>

                    <!-- Panel por defecto -->
                    <UFormField name="isDefault">
                        <UCheckbox v-model="formData.isDefault" :default-value="formData.isDefault" label="Establecer como panel por defecto"
                            :disabled="isLoading" />
                        <template #hint>
                            <span class="text-xs text-gray-500 dark:text-gray-400">
                                El panel por defecto se usará para crear nuevas VMs
                            </span>
                        </template>
                    </UFormField>
                </div>

                <template #footer>
                    <div class="flex justify-end gap-3">
                        <UButton color="neutral" variant="ghost" @click="handleClose" :disabled="isLoading">
                            Cancelar
                        </UButton>
                        <UButton color="primary" @click="handleSubmit" :loading="isLoading">
                            <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                            Crear Panel
                        </UButton>
                    </div>
                </template>
            </UCard>
        </template>
    </UModal>
</template>
