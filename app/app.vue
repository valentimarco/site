<script setup lang="ts">
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
    <NuxtPage />
  </UApp>
</template>
