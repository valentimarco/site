<script setup lang="ts">
defineProps<{
  colors: string
  angle?: string
}>()
</script>

<template>
  <strong
    class="bg-clip-text text-transparent font-bold"
    :style="{ backgroundImage: `linear-gradient(${angle || '90deg'}, ${colors})` }"
  >
    <slot mdc-unwrap="p" />
  </strong>
</template>
