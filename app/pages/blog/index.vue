<script setup lang="ts">
const { data: posts } = await useAsyncData(
  'blog-posts',
  () => queryCollection('blog')
    //.where('draft', '!=', true)
    .order('date', 'DESC')
    .all(),
  { server: true },
)

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const title = 'Blog'
useHead({
  title,
  titleTemplate: t => t ? `${t} · Portfolio` : `${title} · Portfolio`,
})
</script>

<template>
  <BlurReveal class="min-h-screen max-w-4xl mx-auto not-print:pt-12 selection:bg-primary selection:text-neutral-900">
    <div class="p-4 space-y-6">
      <div class="space-y-2">
        <h1 class="text-3xl md:text-4xl font-bold text-highlighted">
          Blog
        </h1>
        <p class="text-toned text-sm md:text-base">
          Thoughts, tutorials, and things I've learned along the way.
        </p>
      </div>

      <div v-if="posts && posts.length > 0" class="grid gap-4 md:grid-cols-2">
        <UCard
          v-for="post in posts"
          :key="post.stem"
          variant="subtle"
          as="article"
          class="hover:ring-1 hover:ring-primary/30 transition-all duration-200"
        >
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <time class="text-xs text-muted">{{ formatDate(post.date) }}</time>
              <div v-if="post.tags && post.tags.length" class="flex flex-wrap gap-1">
                <UBadge
                  v-for="tag in post.tags"
                  :key="tag"
                  :label="tag"
                  variant="soft"
                  size="xs"
                  color="neutral"
                />
              </div>
            </div>
          </template>

          <NuxtLink :to="post.path" class="group block space-y-2">
            <h2 class="text-lg font-semibold text-highlighted group-hover:text-primary transition-colors">
              {{ post.title }}
            </h2>
            <p class="text-sm text-toned leading-snug">
              {{ post.description }}
            </p>
          </NuxtLink>

          <template #footer>
            <NuxtLink
              :to="post.path"
              class="text-sm text-primary font-medium hover:underline"
            >
              Read more →
            </NuxtLink>
          </template>
        </UCard>
      </div>

      <div v-else class="text-center py-12">
        <UIcon name="i-hugeicons-news" class="size-12 mx-auto text-muted mb-4" />
        <p class="text-lg text-muted">No posts yet. Stay tuned!</p>
      </div>
    </div>
  </BlurReveal>
</template>
