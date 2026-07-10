---
title: Building with Nuxt 4
description: A deep dive into my experience migrating to Nuxt 4 and the new features that make development faster and more enjoyable.
date: 2025-12-15
tags:
  - Nuxt
  - Vue
  - Web Development
image: /og-image.png
draft: false
---

Nuxt 4 brings a lot of improvements to the table. After spending a few months working with it, here are my thoughts.

## Improved Performance

The new server engine is noticeably faster. Cold starts are quicker, and the dev server feels snappier overall. The build output is also leaner.

### Faster Hot Module Replacement

One of the biggest quality-of-life improvements is the HMR speed. Changes reflect almost instantly, even in larger projects.

## Type Safety Everywhere

With `typedPages` enabled, you get full type safety for your routes. This catches a whole class of bugs at compile time.

```typescript
// This is now fully typed
const route = useRoute('/blog/[slug]')
console.log(route.params.slug) // auto-completes!
```

## Simplified Directory Structure

The new `app/` directory convention feels natural. Having components, pages, composables, and utils all under `app/` reduces cognitive overhead.

## Conclusion

Nuxt 4 is a solid upgrade. The migration was smooth, and the end result is a faster, more maintainable codebase.
