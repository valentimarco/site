<script setup lang="ts">
import type { CertificationsCollectionItem } from '@nuxt/content'

defineProps<{
  certificate: CertificationsCollectionItem
}>()

const preview = ref(false)
</script>

<template>
  <div class="flex items-center gap-4">
    <UModal v-model:open="preview"
            :ui="{ content: 'max-w-3xl p-0 rounded-xl ring-0 overflow-hidden' }">
      <NuxtImg :src="certificate.image" :alt="certificate.title" loading="lazy"
               class="size-28 shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800 object-contain p-1 cursor-pointer transition hover:scale-105" />
      <template #content="{ close }">
        <div class="flex flex-col">
          <div class="flex justify-end p-2">
            <UButton icon="i-hugeicons-cancel-01" color="neutral" variant="solid" size="lg"
                     aria-label="Close preview" @click="close" />
          </div>
          <NuxtImg :src="certificate.image" :alt="certificate.title" class="h-auto w-full" />
          <div class="p-2" />
        </div>
      </template>
    </UModal>
    <div class="min-w-0 space-y-1">
      <h3 class="text-base font-semibold text-highlighted leading-tight wrap-break-word">
        {{ certificate.title }}
      </h3>
      <p class="text-sm text-toned">
        {{ certificate.issuer }}
      </p>
      <p class="text-xs text-muted">
        {{ new Date(certificate.issueDate).getFullYear() }}
      </p>
      <UButton v-if="certificate.url" variant="link" class="px-0 text-primary" size="sm"
               :to="certificate.url" target="_blank" external icon="i-hugeicons-badge-check"
               label="Show credential" />
    </div>
  </div>
</template>
