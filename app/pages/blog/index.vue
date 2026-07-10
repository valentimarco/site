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

const search = ref('')

const filteredPosts = computed(() => {
  if (!posts.value) return []
  if (!search.value.trim()) return posts.value

  const q = search.value.toLowerCase()
  return posts.value.filter(post =>
    post.title.toLowerCase().includes(q) ||
    post.description?.toLowerCase().includes(q) ||
    post.tags?.some(tag => tag.toLowerCase().includes(q))
  )
})

const title = 'Blog'
useHead({
  title,
  titleTemplate: t => t ? `${t} · Portfolio` : `${title} · Portfolio`,
})
</script>

<template>
  <BlurReveal class="min-h-screen max-w-4xl mx-auto selection:bg-primary selection:text-neutral-900">
    <div class="p-4 space-y-4">
      <UCard variant="subtle">
        <div class="space-y-4">
          <div class="space-y-2">
            <h1 class="text-3xl md:text-4xl font-bold text-highlighted">
              Blog
            </h1>
            <p class="text-toned text-sm md:text-base">
              Thoughts, tutorials, and things I've learned along the way.
            </p>
          </div>
          <UInput
            v-model="search"
            placeholder="Search posts..."
            variant="outline"
            size="lg"
            icon="i-hugeicons-search-01"
            class="w-full"
          />
        </div>
      </UCard>

      <div v-if="filteredPosts.length > 0" class="grid gap-4 md:grid-cols-2">
        <UCard
          v-for="post in filteredPosts"
          :key="post.stem"
          variant="subtle"
          as="article"
          class="h-full hover:ring-1 hover:ring-primary/30 transition-all duration-200"
        >
          <template #header>
            <div class="flex items-center justify-between gap-2">
              <time class="text-sm text-muted">{{ formatDate(post.date) }}</time>
              <div v-if="post.tags && post.tags.length"
                   class="hidden md:flex flex-wrap gap-1.5"
              >
                <template v-for="(tag, i) in post.tags" :key="tag">
                  <UBadge
                    v-if="i < 3"
                    :label="tag"
                    variant="soft"
                    size="md"
                    color="neutral"
                  />
                  <UTooltip
                    v-if="i === 3 && post.tags.length > 3"
                    :text="post.tags.slice(3).join(', ')"
                    :content="{ side: 'top' }"
                  >
                    <UBadge
                      :label="`+${post.tags.length - 3}`"
                      variant="solid"
                      size="md"
                      color="neutral"
                      class="cursor-help"
                    />
                  </UTooltip>
                </template>
              </div>
            </div>
            <div v-if="post.tags && post.tags.length"
                 class="tag-carousel flex md:hidden overflow-hidden mt-2"
            >
              <div class="flex flex-nowrap gap-1.5 tag-track"
                   :style="{ animationDuration: `${Math.max(post.tags.length, 1) * 1.5}s` }"
              >
                <UBadge
                  v-for="tag in post.tags"
                  :key="tag"
                  :label="tag"
                  variant="soft"
                  size="md"
                  color="neutral"
                  class="shrink-0"
                />
                <UBadge
                  v-for="tag in post.tags"
                  :key="'dup-' + tag"
                  :label="tag"
                  variant="soft"
                  size="md"
                  color="neutral"
                  class="shrink-0"
                />
              </div>
            </div>
          </template>

          <NuxtLink :to="post.path" class="group block space-y-2">
            <h2 class="text-xl font-semibold text-highlighted group-hover:text-primary transition-colors">
              {{ post.title }}
            </h2>
            <div class="h-20 overflow-hidden">
              <p class="text-base text-toned leading-snug line-clamp-3">
                {{ post.description }}
              </p>
            </div>
          </NuxtLink>

          <template #footer>
            <NuxtLink
              :to="post.path"
              class="text-base text-primary font-medium hover:underline"
            >
              Read more →
            </NuxtLink>
          </template>
        </UCard>
      </div>

      <div v-else-if="!posts?.length" class="text-center py-12">
        <UIcon name="i-hugeicons-news" class="size-12 mx-auto text-muted mb-4" />
        <p class="text-lg text-muted">No posts yet. Stay tuned!</p>
      </div>

      <div v-else class="text-center py-12">
        <UIcon name="i-hugeicons-search-01" class="size-12 mx-auto text-muted mb-4" />
        <p class="text-lg text-muted">No posts match your search.</p>
      </div>
    </div>
  </BlurReveal>
</template>

<style scoped>
.tag-track {
  animation-name: marquee;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.tag-carousel:hover .tag-track {
  animation-play-state: paused;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
</style>
