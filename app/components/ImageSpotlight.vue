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

// Keyboard equivalent of hovering: reveal the spotlight centred on the avatar.
function handleFocus() {
  isHovering.value = true
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    mouseX.value = rect.width / 2
    mouseY.value = rect.height / 2
  }
}

const currentPath = computed(() => `circle(${spotlightSize / 2}px at ${mouseX.value}px ${mouseY.value}px)`)
const currentOpacity = computed(() => isHovering.value ? 1 : 0)
</script>

<template>
  <!-- Decorative reveal-on-hover; focusable so keyboard users can trigger the same effect. -->
  <div ref="containerRef" role="button" tabindex="0"
       class="relative overflow-hidden cursor-none select-none focus:outline-none"
       :aria-label="alt"
       @mousemove="handleMouseMove" @mouseleave="handleMouseLeave"
       @focusin="handleFocus" @focusout="handleMouseLeave">
    <!-- @nuxt/image runs with `provider: "none"` on Cloudflare, so `format`/`densities` are
         ignored; the assets are pre-optimized WebP/JPEG instead. -->
    <NuxtImg :src="baseImage" :alt="alt" class="w-full h-full object-cover" draggable="false"
             width="160" height="160"
             loading="eager" fetchpriority="high" preload />
    <NuxtImg :src="spotlightImage" alt="" aria-hidden="true"
             class="absolute spotlight inset-0 w-full h-full object-cover transition-opacity duration-300 ease-out pointer-events-none"
             draggable="false"
             width="160" height="160" loading="lazy" />
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
