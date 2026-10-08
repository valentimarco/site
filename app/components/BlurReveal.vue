<script setup lang="ts">
import type { VNode } from 'vue'

const props = withDefaults(defineProps<{
  duration?: number
  delay?: number
  blur?: number
  yOffset?: number
}>(), {
  duration: 0.5,
  delay: 0.25,
  blur: 20,
  yOffset: 20,
})

const slots = useSlots()

// Must render during SSR as well: collecting the slot vnodes in `onMounted` left the
// server HTML empty, so the whole page mounted client-side and every child component
// reported a hydration mismatch. A computed keeps the per-child stagger while letting
// the server emit real markup.
const children = computed<VNode[]>(() => slots.default?.() ?? [])

// `opacity` is deliberately absent from both states: it was serialised into the SSR HTML as
// `opacity:0`, and LCP ignores fully transparent elements, so the whole page stayed invisible
// (and unmeasurable) until motion-v hydrated and fired `while-in-view`. A CSS filter still
// counts as painted, so the blur reveal survives without gating LCP.
function getInitial() {
  return {
    filter: `blur(${props.blur}px)`,
    y: props.yOffset,
  }
}

function getAnimate() {
  return {
    filter: `blur(0px)`,
    y: 0,
  }
}
</script>

<template>
  <div>
    <Motion v-for="(child, index) in children" :key="index" as="div" :initial="getInitial()"
            :while-in-view="getAnimate()" :transition="{
              duration: props.duration,
              ease: 'easeInOut',
              delay: props.delay * index,
            }">
      <component :is="child" />
    </Motion>
  </div>
</template>
