<script setup lang="ts">
const route = useRoute()

const links = [
  { label: 'Home', to: '/', icon: 'i-hugeicons-home-01' },
  { label: 'Blog', to: '/blog', icon: 'i-hugeicons-blogger' },
  { label: 'CV', to: '/cv', icon: 'i-hugeicons-file-01' },
]

function isActive(link: typeof links[number]) {
  if (link.to === '/') return route.path === '/'
  return route.path.startsWith(link.to)
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
        </div>
        <div class="justify-self-end">
          <ThemeButton position="inline" />
        </div>
      </div>
    </div>
  </nav>
</template>
