<script setup lang="ts">
import type { CertificationsCollectionItem } from '@nuxt/content'

defineProps<{
  certificate: CertificationsCollectionItem
}>()

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="space-y-4">
    <h3 class="text-base font-semibold text-highlighted">
      {{ certificate.title }}
    </h3>
    <p class="text-toned justify-start flex flex-wrap gap-2 text-sm">
      <span class="group inline-flex text-highlighted items-center gap-2">
        <UIcon name="i-hugeicons-pin-location-03" class="size-5" />
        {{ certificate.issuer }}
      </span>
      <DotSeparator />
      <span class="group inline-flex text-highlighted items-center gap-2">
        <UIcon name="i-hugeicons-calendar-04" class="size-5" />
        {{ formatDate(certificate.issueDate) }}
      </span>
    </p>
    <UButton v-if="certificate.url" variant="subtle" color="neutral" class="text-primary print:bg-transparent"
             :to="certificate.url" target="_blank" external icon="i-hugeicons-link-04" label="View Certificate" />
  </div>
</template>
