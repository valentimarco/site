<script setup lang="ts">
const { spotlightSize = 100 } = defineProps<{
  baseImage: string
  spotlightImage: string
  spotlightSize?: number
  alt?: string
}>()

const containerRef = ref<HTMLElement>()
const mouseX = ref(0), mouseY = ref(0)
const isHovering = ref(false)

function handleMouseMove(e: MouseEvent) {
  if (!containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  mouseX.value = e.clientX - rect.left
  mouseY.value = e.clientY - rect.top
  isHovering.value = true
}

function handleMouseLeave() {
  isHovering.value = false
}

const currentPath = computed(() => `circle(${spotlightSize / 2}px at ${mouseX.value}px ${mouseY.value}px)`)
const currentOpacity = computed(() => isHovering.value ? 1 : 0)
</script>

<template>
  <div ref="containerRef" role="button" tabindex="0"
       class="relative overflow-hidden cursor-none select-none focus:outline-none" :aria-label="alt"
       @mousemove="handleMouseMove" @mouseleave="handleMouseLeave" @focusout="handleMouseLeave">
    <NuxtImg :src="baseImage" :alt="alt" class="w-full h-full object-cover" draggable="false"
             format="webp" width="160" height="160" densities="x1 x2"
             loading="eager" fetchpriority="high" preload />
    <NuxtImg :src="spotlightImage" :alt="`${alt} spotlight`"
             class="absolute spotlight inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out pointer-events-none"
             draggable="false"
             format="webp" width="160" height="160" densities="x1 x2" loading="lazy" />
  </div>
</template>

<style scoped>
.spotlight {
  clip-path: v-bind(currentPath);
  opacity: v-bind(currentOpacity);
}

@media print {
  .spotlight {
    clip-path: none !important;
    opacity: 1 !important;
  }
}
</style>
