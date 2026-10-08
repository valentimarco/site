<script setup lang="ts">
const { repo } = defineProps<{
  repo: GitHubRepository
}>()
</script>

<template>
  <ULink external :to="repo.html_url" target="_blank" class="block">
    <UCard variant="soft" class="size-full print:bg-neutral-200">
      <div class="space-y-4">
        <div class="flex flex-wrap items-start gap-2 justify-between">
          <h3 class="text-base font-semibold text-highlighted">
            {{ repo.name }}
          </h3>
          <UBadge :label="repo.stargazers_count" icon="i-hugeicons-star" color="neutral" class="print:bg-transparent"
                  variant="soft" :ui="{ leadingIcon: 'text-warning' }" />
        </div>
        <p v-if="repo.description" class="text-sm text-toned">
          {{ repo.description }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="lang in repo.languages" :key="lang" :label="lang" variant="soft" />
        </div>
      </div>
    </UCard>
  </ULink>
</template>
