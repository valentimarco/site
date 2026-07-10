---
title: Vue Tips & Tricks
description: A collection of practical Vue patterns I've discovered while building real-world applications.
date: 2026-01-20
tags:
  - Vue
  - TypeScript
  - Frontend
image: /og-image.png
draft: false
---

Over the years, I've collected a few Vue patterns that make my code cleaner and more maintainable.

## Use `defineProps` with TypeScript

Always type your props. It makes components self-documenting and catches bugs early.

```vue
<script setup lang="ts">
interface Props {
  title: string
  items?: string[]
  variant?: 'primary' | 'secondary'
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  variant: 'primary',
})
</script>
```

## Composables Over Mixins

Mixins are dead. Composables are the way to share logic between components.

```typescript
// useCounter.ts
export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const increment = () => count.value++
  const decrement = () => count.value--

  return { count, increment, decrement }
}
```

## Teleport for Modals

Use Vue's `<Teleport>` to render modals and overlays at the document body level, avoiding z-index and overflow issues.

## Conclusion

These patterns have served me well across many projects. The key is consistency — pick conventions and stick with them.
