<script setup lang="ts">
// Imported here (not via `nuxt.config.css`) so Nuxt inlines the compiled Tailwind styles into the
// SSR HTML; combined with `vitalizer.disableStylesheets: 'entry'` this removes the render-blocking
// `entry.<hash>.css` request from the critical path.
import '~/assets/css/main.css'

const {
  name,
  description, ogImage,
} = await useContent()

const route = useRoute()
const title = useTitle(name)

useHead({
  link: [
    {
      rel: 'icon',
      type: 'image/jpeg',
      href: '/me_jojo.jpeg',
    },
  ],
})

useSeoMeta({
  title,
  titleTemplate: t => t ? `${t} · Portfolio` : `${name} · Portfolio`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage,
  ogType: 'website',
  ogUrl: route.fullPath,
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: ogImage,
  twitterCard: 'summary',
})
</script>

<template>
  <UApp :tooltip="{ delayDuration: 300 }">
    <NavBar />
    <div class="not-print:pt-16">
      <NuxtPage />
    </div>
  </UApp>
</template>
