<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const downloading = ref(false)

const links = [
  { label: 'Home', to: '/', icon: 'i-hugeicons-home-01' },
  { label: 'Blog', to: '/blog', icon: 'i-hugeicons-blogger' },
]

function isActive(link: typeof links[number]) {
  if (link.to === '/') return route.path === '/'
  return route.path.startsWith(link.to)
}

async function downloadPdf() {
  if (downloading.value) return
  downloading.value = true

  toast.add({
    title: 'Preparing your CV…',
    icon: 'i-hugeicons-file-01',
    duration: 5000,
  })

  try {
    const response = await fetch('/api/cv-pdf')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cv.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      title: 'CV downloaded!',
      icon: 'i-hugeicons-download-01',
      color: 'success',
      duration: 3000,
    })
  }
  catch (error) {
    toast.add({
      title: 'Failed to download CV',
      description: 'Please try again later',
      icon: 'i-hugeicons-alert-02',
      color: 'error',
      duration: 5000,
    })
  }
  finally {
    downloading.value = false
  }
}
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 z-50 print:hidden">
    <div class="px-4 pt-4">
      <div class="grid grid-cols-3 items-center rounded-lg border border-default bg-background/70 backdrop-blur-md px-4 py-2 shadow-sm">
        <NuxtLink
          to="/"
          class="justify-self-start text-sm font-semibold text-highlighted hover:text-primary transition-colors"
        >
          Marco Valenti
        </NuxtLink>
        <div class="flex items-center justify-center gap-1">
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            :class="isActive(link)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted hover:text-highlighted hover:bg-muted/50'"
          >
            <UIcon :name="link.icon" class="size-4" />
            <span class="hidden sm:inline">{{ link.label }}</span>
          </NuxtLink>
          <button
            :disabled="downloading"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors text-muted hover:text-highlighted hover:bg-muted/50 disabled:opacity-50 disabled:cursor-wait"
            @click="downloadPdf"
          >
            <UIcon name="i-hugeicons-download-01" class="size-4" />
            <span class="hidden sm:inline">CV 📥</span>
          </button>
        </div>
        <div class="justify-self-end">
          <ThemeButton position="inline" />
        </div>
      </div>
    </div>
  </nav>
</template>
