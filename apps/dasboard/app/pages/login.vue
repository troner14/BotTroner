<script setup lang="ts">
const { loggedIn } = useUserSession()

if (loggedIn.value) {
    navigateTo('/');
}

const providers = [{
  label: 'Discord',
  icon: 'i-simple-icons-discord',
  onClick: () => {
    navigateTo('/auth/discord', {
        external: true,
    })
  }
}]
</script>

<template>
    <div class="flex flex-col items-center justify-center gap-4 p-4">
    <UPageCard class="w-full max-w-md">
      <UAuthForm
        title="Iniciar Session"
        description="Conecta Con discord Para Continuar"
        icon="i-lucide-user"
        :providers="providers"
      />
    </UPageCard>
  </div>
</template>