<script setup lang="ts">
import { Octokit } from '@octokit/rest'

const { data: profileContent } = await useAsyncData('profile-content', () =>
  queryCollection('profile').first(),
)
const name = profileContent.value?.name!
const location = profileContent.value?.location!
const email = profileContent.value?.email!
const username = profileContent.value?.username!
const description = profileContent.value?.description!
const ogImage = profileContent.value?.ogImage!
const jobTitle = profileContent.value?.jobTitle!
const socials = profileContent.value?.socials || []

const birthDate = new Date(profileContent.value?.birthDate!)
const age = Math.floor((Date.now() - birthDate.getTime()) / 3.15576e10)

const { data: skillsContent } = await useAsyncData('skills-content', () =>
  queryCollection('skills').first(),
)

const { data: experiencesContent } = await useAsyncData('experiences-content', () =>
  queryCollection('experiences').order('stem', 'ASC').all(),
)

const { data: educationContent } = await useAsyncData('education-content', () =>
  queryCollection('education').order('stem', 'ASC').all(),
)

const { data: certificationsContent } = await useAsyncData('certifications-content', () =>
  queryCollection('certifications').order('stem', 'ASC').all(),
)

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

const octokit = new Octokit()

const { data: profile } = await useAsyncData('profile', async () => {
  const res = await octokit.rest.users.getByUsername({ username })
  return res.data
}, {
  transform: (data) => {
    const res = {
      ...data,
      name: data.name || name,
      email: data.email || profileContent.value?.email || email,
      location: data.location || profileContent.value?.location || location,
      fetchedAt: new Date(),
    }
    window.localStorage.setItem('cache:profile', JSON.stringify(res))
    return res
  },
  getCachedData,
  default: () => ({
    name: name,
    email: email,
    location: location,
    created_at: new Date().toISOString(),
    followers: 0,
    following: 0,
    fetchedAt: new Date(),
  }),
})

const { data: repos } = await useAsyncData('repos', async () => {
  const res = await octokit.rest.repos.listForUser({ username, type: 'owner', per_page: 100 })
  return res.data.sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 6)
}, {
  transform: (data) => {
    const res = {
      list: data,
      fetchedAt: new Date(),
    }
    window.localStorage.setItem('cache:repos', JSON.stringify(res))
    return res
  },
  getCachedData,
  default: () => {
    return {
      list: [] as GitHubRepository[],
      fetchedAt: new Date(),
    }
  },
})

const { data: contributions } = await useAsyncData('contributions', async () => {
  const res = await octokit.rest.search.issuesAndPullRequests({
    q: `is:pr is:merged author:${username}`,
    per_page: 100,
    sort: 'updated',
    order: 'desc',
  })

  const summaryMap = new Map<string, ContributionSummary>()

  for (const item of res.data.items) {
    const repositoryUrl = item.repository_url
    if (!repositoryUrl) continue

    const repoFullName = repositoryUrl.replace('https://api.github.com/repos/', '')
    const [owner] = repoFullName.split('/')
    if (owner?.toLowerCase() === username.toLowerCase()) continue

    const updatedAt = item.updated_at || item.closed_at || item.created_at || new Date().toISOString()
    const existing = summaryMap.get(repoFullName)
    const summary: ContributionSummary = existing || {
      repoFullName,
      repoUrl: `https://github.com/${repoFullName}`,
      prCount: 0,
      stars: 0,
      lastPrUpdatedAt: updatedAt,
      recentPrs: [],
    }

    summary.prCount += 1
    if (new Date(updatedAt).getTime() > new Date(summary.lastPrUpdatedAt).getTime())
      summary.lastPrUpdatedAt = updatedAt

    if (summary.recentPrs.length < 2 && item.html_url) {
      summary.recentPrs.push({
        title: item.title || `PR #${item.number}`,
        url: item.html_url,
        updated_at: updatedAt,
      })
    }

    summaryMap.set(repoFullName, summary)
  }

  const candidateLimit = 12
  const candidates = Array.from(summaryMap.values())
    .sort((a, b) => b.prCount - a.prCount || new Date(b.lastPrUpdatedAt).getTime() - new Date(a.lastPrUpdatedAt).getTime())
    .slice(0, candidateLimit)

  const enriched = await Promise.all(candidates.map(async (summary) => {
    const [owner, repo] = summary.repoFullName.split('/')
    if (!owner || !repo) return summary
    try {
      const repoRes = await octokit.rest.repos.get({ owner, repo })
      return {
        ...summary,
        stars: repoRes.data.stargazers_count || 0,
      }
    }
    catch {
      return summary
    }
  }))

  const list = enriched
    .sort((a, b) => b.prCount - a.prCount
      || (b.stars || 0) - (a.stars || 0)
      || new Date(b.lastPrUpdatedAt).getTime() - new Date(a.lastPrUpdatedAt).getTime())
    .slice(0, 6)

  return {
    list,
    fetchedAt: new Date(),
  }
}, {
  transform: (data) => {
    const res = {
      ...data,
      fetchedAt: new Date(),
    }
    window.localStorage.setItem('cache:contributions', JSON.stringify(res))
    return res
  },
  getCachedData,
  default: () => ({
    list: [] as ContributionSummary[],
    fetchedAt: new Date(),
  }),
})


function handlePrint() {
  window.print()
}
</script>

<template>
<UApp :tooltip="{ delayDuration: 300 }">
  <BlurReveal
    class="min-h-screen max-w-4xl mx-auto not-print:pt-12 print:max-w-none selection:bg-primary selection:text-neutral-900">
    <div class="p-4 space-y-4 print:p-0">
      <UCard variant="subtle" class="print:bg-transparent">
        <div class="flex flex-col gap-4">
          <div class="flex justify-between gap-4">
            <div class="space-y-4">
              <div class="flex flex-wrap items-center gap-4">
                <h1 class="text-3xl md:text-4xl font-bold text-highlighted">
                  {{ name }}
                </h1>
                <div class="group inline-flex text-highlighted items-center gap-2 print:hidden">
                  <p class="ms-2 flex flex-col italic">
                    <span class="transition-colors">{{ location }}</span>
                  </p>
                </div>
              </div>
              <h2 class="text-base md:text-lg font-medium print:text-base">
                {{ jobTitle }}
              </h2>
              <div v-if="profile.followers > 0 || profile.following > 0"
                class="flex flex-wrap items-center print:hidden gap-2 text-sm">
                <UIcon name="i-hugeicons-user-group" class="size-5" />
                <p><strong>{{ profile.followers }}</strong> followers</p>
                <UChip standalone inset size="2xs" />
                <p><strong>{{ profile.following }}</strong> following</p>
              </div>
              <div class="items-center flex flex-wrap gap-2 text-sm">
                <ULink external :to="`mailto:${email}`" target="_blank"
                  class="group inline-flex text-highlighted items-center gap-2">
                  <UIcon name="i-hugeicons-mail-01" class="size-5" />
                  <span class="group-hover:text-primary transition-colors">{{ email }}</span>
                </ULink>

              </div>
              <div class="items-center flex flex-wrap gap-2 text-sm">
                <template v-for="(social, index) in socials" :key="social.label">
                  <UChip v-if="index > 0" standalone inset size="2xs" />
                  <ULink external :to="social.url" target="_blank"
                    class="group inline-flex text-highlighted items-center gap-2">
                    <UIcon :name="social.icon" class="size-5" />
                    <span class="group-hover:text-primary transition-colors">{{ social.label }}</span>
                  </ULink>
                </template>
              </div>
            </div>
            <div class="shrink-0">
              <ImageSpotlight baseImage="/me_jojo.jpeg" spotlightImage="/me.png" :alt="name"
                class="size-30 md:size-40 rounded-full object-cover" />
              <p class="text-sm text-center select-none print:hidden text-muted italic">
                Hover me!
              </p>
            </div>
          </div>
        </div>
        <template #footer>
          <h3 class="font-semibold text-lg md:text-xl text-highlighted leading-loose">
            About Me
          </h3>
          <div
            class="text-sm md:text-base text-toned print:text-sm prose prose-neutral dark:prose-invert max-w-none prose-p:m-0">
            <ContentRenderer v-if="profileContent" :value="profileContent" :data="{ age }" />
          </div>
        </template>
      </UCard>
      <UCard v-if="experiencesContent && experiencesContent.length > 0" as="section" variant="subtle"
        class="print:bg-transparent" :ui="{ body: 'space-y-8' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Professional Experience
          </h3>
        </template>
        <ExperienceSection v-for="experience in experiencesContent" :key="experience.stem" :experience />
      </UCard>
      <UCard v-if="repos.list.length > 0" as="section" variant="subtle" class="print:hidden"
        :ui="{ body: 'grid grid-cols-2 md:grid-cols-3 gap-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Personal Projects
          </h3>
        </template>
        <SpecialCard v-for="(repo, index) in repos.list" :key="index">
          <ProjectSection :repo />
        </SpecialCard>
      </UCard>
      <UCard v-if="contributions.list.length > 0" as="section" variant="subtle" class="print:hidden"
        :ui="{ body: 'grid grid-cols-1 md:grid-cols-2 gap-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Open Source Contributions
          </h3>
        </template>
        <SpecialCard v-for="(contribution, index) in contributions.list" :key="index">
          <ContributionSection :contribution />
        </SpecialCard>
      </UCard>
      <UCard v-if="skillsContent?.categories" as="section" variant="subtle" class="print:bg-transparent"
        :ui="{ body: 'space-y-2' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Skills
          </h3>
        </template>
        <div v-for="category in skillsContent.categories" :key="category.name" class="flex gap-2 items-center">
          <strong>{{ category.name }}:</strong>
          <div class="flex flex-wrap gap-2">
            <UBadge v-for="(item, index) in category.items" :key="index" :label="item" variant="soft" />
          </div>
        </div>
      </UCard>
      <UCard v-if="educationContent && educationContent.length > 0" as="section" variant="subtle"
        class="print:bg-transparent" :ui="{ body: 'space-y-8' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Education
          </h3>
        </template>
        <EducationSection v-for="experience in educationContent" :key="experience.stem" :experience />
      </UCard>
      <UCard v-if="certificationsContent && certificationsContent.length > 0" as="section" variant="subtle"
        class="print:bg-transparent" :ui="{ body: 'grid grid-cols-2 gap-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Certifications
          </h3>
        </template>
        <SpecialCard v-for="certificate in certificationsContent" :key="certificate.stem">
          <CertificationSection :certificate />
        </SpecialCard>
      </UCard>
      <p class="text-muted print:hidden text-sm text-center">
        Copyright © {{ new Date(profile.created_at).getFullYear() }} - {{ new Date().getFullYear() }} by {{ username }}
      </p>
      <p class="text-muted print:hidden text-xs text-center">
        v{{ $config.public.version }}
      </p>
      <p class="text-muted hidden print:block text-center">
        I authorise the processing of the personal data in my CV in accordance with Regulation (EU) 2016/679 of the
        European
        Parliament and of the Council (GDPR).
      </p>
    </div>
  </BlurReveal>
  <ThemeButton />
  <UTooltip arrow text="Print" class="no-print">
    <UButton class="fixed bottom-4 right-4 rounded-full no-print z-50" size="lg" square icon="i-hugeicons-printer"
      aria-label="Print" @click="handlePrint" />
  </UTooltip>
</UApp>
</template>
