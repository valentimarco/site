<script setup lang="ts">
const route = useRoute()

const { data: post } = await useAsyncData(
  `blog-post-${route.path}`,
  () => queryCollection('blog').path(route.path).first(),
  { server: true },
)

if (!post.value)
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const title = post.value.title
useHead({
  title,
  titleTemplate: t => t ? `${t} · Blog` : `${title} · Blog`,
})

useSeoMeta({
  title,
  titleTemplate: t => t ? `${t} · Blog` : `${title} · Blog`,
  description: post.value.description,
  ogImage: post.value.image,
  ogTitle: title,
  ogDescription: post.value.description,
  ogType: 'article',
  ogUrl: route.fullPath,
  twitterTitle: title,
  twitterDescription: post.value.description,
  twitterImage: post.value.image,
  twitterCard: 'summary',
})
</script>

<template>
  <BlurReveal v-if="post" class="min-h-screen max-w-3xl mx-auto selection:bg-primary selection:text-neutral-900">
    <div class="p-4 space-y-4">
      <UCard variant="subtle">
        <article class="space-y-6">
          <!-- Back link -->
          <NuxtLink
            to="/blog"
            class="inline-flex items-center gap-1 text-base text-muted hover:text-primary transition-colors"
          >
            <UIcon name="i-hugeicons-arrow-left-01" class="size-4" />
            Back to blog
          </NuxtLink>

          <!-- Header -->
          <header class="space-y-3">
            <h1 class="text-3xl md:text-4xl font-bold text-highlighted leading-tight">
              {{ post.title }}
            </h1>
            <span v-if="post.tags && post.tags.length" class="flex flex-wrap gap-1.5">
              <UBadge
                v-for="tag in post.tags"
                :key="tag"
                :label="tag"
                variant="soft"
                size="sm"
                color="neutral"
              />
            </span>
            <div class="flex flex-col md:flex-row md:items-center gap-3 text-base text-muted">
              <time>{{ formatDate(post.date) }}</time>
            </div>
          </header>

          <hr class="border-default block md:hidden">

          <!-- Content -->
          <div class="prose prose-neutral dark:prose-invert max-w-none prose-a:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:border prose-pre:border-default">
            <ContentRenderer :value="post" />
          </div>
        </article>
      </UCard>
    </div>
  </BlurReveal>
</template>
