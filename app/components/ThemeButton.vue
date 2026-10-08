<script lang="ts" setup>
const props = withDefaults(defineProps<{
  position?: 'fixed' | 'inline'
}>(), {
  position: 'fixed',
})

const colorMode = useColorMode()

// The server has no access to the stored preference, so `colorMode.value` is 'light' during SSR
// while the client already knows it — which hydrated a sun icon where the vdom expected a moon.
// The icon is theme-dependent markup, so it is only rendered once the real preference is known.
const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})

const nextTheme = computed(() => colorMode.value === 'dark' ? 'light' : 'dark')

const isLight = computed(() => isMounted.value && colorMode.value === 'light')
const tooltipText = computed(() => isLight.value ? 'light attracts bugs, switch the light here' : 'Toggle Theme')

const buttonClass = computed(() => {
  return props.position === 'fixed'
    ? 'fixed bottom-4 md:top-4 md:bottom-auto left-4 rounded-full z-50'
    : 'rounded-full'
})

function switchTheme() {
  colorMode.preference = nextTheme.value
}

function startViewTransition(event: MouseEvent) {
  if (!document.startViewTransition) {
    switchTheme()
    return
  }

  const x = event.clientX, y = event.clientY
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const transition = document.startViewTransition(switchTheme)

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 600,
        easing: 'cubic-bezier(.76,.32,.29,.99)',
        pseudoElement: '::view-transition-new(root)',
      },
    )
  })
}
</script>

<template>
  <UTooltip arrow :text="tooltipText" class="no-print">
    <UButton :class="[buttonClass, { 'blink-button': isLight }]"
             size="lg" color="neutral" square aria-label="Toggle Theme" variant="subtle"
             :icon="isMounted ? (nextTheme === 'dark' ? 'i-hugeicons-sun-03' : 'i-hugeicons-moon-02') : undefined"
             @click="startViewTransition" />
  </UTooltip>
</template>

<style scoped>
.blink-button {
  animation: blink 1s linear infinite;
}

@keyframes blink {
  0% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }

  50% {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(234, 179, 8, 0.35);
  }

  100% {
    transform: translateY(0);
    box-shadow: 0 0 0 rgba(0, 0, 0, 0);
  }
}

/* Avoid blinking in print */
@media print {
  .blink-button {
    animation: none !important;
  }
}
</style>
