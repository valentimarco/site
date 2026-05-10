<script setup lang="ts">
import type { ExperiencesCollectionItem } from '@nuxt/content'

defineProps<{
  experience: ExperiencesCollectionItem
}>()

function getTimeSpan(startDate: string, endDate?: string) {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (months < 1) {
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  return remMonths === 0
    ? `${years} year${years !== 1 ? 's' : ''}`
    : `${years} year${years !== 1 ? 's' : ''} ${remMonths} month${remMonths !== 1 ? 's' : ''}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap gap-2 items-start justify-between">
      <div class="space-y-2">
        <h3 class="text-base font-semibold text-highlighted">
          {{ experience.position }}
        </h3>
        <p class="text-toned justify-start flex flex-wrap gap-2 text-sm">
          <ULink external :to="experience.companyUrl" target="_blank"
                 class="group inline-flex text-highlighted items-center gap-2">
            <UIcon name="i-hugeicons-briefcase-01" class="size-5" />
            <span class="group-hover:text-primary transition-colors">{{ experience.company }}</span>
          </ULink>
          <UChip standalone inset size="2xs" />
          <span class="group inline-flex text-highlighted items-center gap-2">
            <UIcon name="i-hugeicons-pin-location-03" class="size-5" />
            {{ experience.location }}
          </span>
        </p>
      </div>
      <p class="text-sm text-muted whitespace-nowrap">
        <span class="capitalize">{{ formatDate(experience.startDate) }}</span>
        -
        <span class="capitalize">{{ experience.endDate ? formatDate(experience.endDate) : 'Present' }}</span>
        ({{ getTimeSpan(experience.startDate, experience.endDate) }})
      </p>
    </div>
    <article class="leading-relaxed prose prose-neutral prose-p:m-0 prose-ul:m-0 dark:prose-invert max-w-none text-sm">
      <ContentRenderer :value="experience" />
    </article>
    <div class="flex flex-wrap gap-2">
      <UBadge v-if="experience.isMaintainer" :label="experience.titleMaintainer" variant="subtle" color="primary" />
      <UBadge v-else-if="experience.isContributor" :label="experience.titleContributor" variant="subtle" color="success" />
      <UBadge v-for="(tech, i) in experience.technologies" :key="i" :label="tech" variant="soft" />
    </div>
  </div>
</template>
