<script setup lang="ts">
const {
  profileContent, name, location, email, username,
  jobTitle, socials, age,
  skillsContent, experiencesContent, educationContent, certificationsContent,
} = await useContent()

const { profile, repos, contributions, status } = await useGitHub({ name, email, location })

const showAllProjects = ref(false)

// Only show the loading placeholder after mount: `status` is not "pending" during SSR hydration, so
// rendering it earlier would differ from the server HTML and trip a hydration mismatch.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

// `profile` is client-fetched; the cached value can resolve synchronously, so keep the pre-mount
// render identical to SSR (current year) to avoid a hydration mismatch.
const startYear = computed(() => mounted.value
  ? new Date(profile.value.created_at).getFullYear()
  : new Date().getFullYear())

function showMore() {
  showAllProjects.value = true
}
function showLess() {
  showAllProjects.value = false
}

const visibleProjects = computed(() => {
  if (showAllProjects.value) return repos.value.list
  return repos.value.list.slice(0, 6)
})

useHead({
  title: name,
  titleTemplate: t => t ? `${t} · Portfolio` : `${name} · Portfolio`,
})
</script>

<template>
  <BlurReveal
    class="min-h-screen max-w-4xl mx-auto print:max-w-none selection:bg-primary selection:text-neutral-900">
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
              <div v-if="mounted && (profile.followers > 0 || profile.following > 0)"
                   class="flex flex-wrap items-center print:hidden gap-2 text-sm">
                <UIcon name="i-hugeicons-user-group" class="size-5" />
                <p><strong>{{ profile.followers }}</strong> followers</p>
                <DotSeparator />
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
                  <DotSeparator v-if="index > 0" />
                  <ULink external :to="social.url" target="_blank"
                         class="group inline-flex text-highlighted items-center gap-2">
                    <UIcon :name="social.icon" class="size-5" />
                    <span class="group-hover:text-primary transition-colors">{{ social.label }}</span>
                  </ULink>
                </template>
              </div>
            </div>
            <div class="shrink-0">
              <ImageSpotlight baseImage="/me_jojo.webp" spotlightImage="/me.webp" :alt="name"
                              class="size-30 md:size-40 rounded-full object-cover" />
              <p aria-hidden="true" class="text-sm text-center select-none print:hidden text-muted italic">
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
      <UCard v-if="mounted && status === 'pending'" variant="subtle" class="print:hidden">
        <div class="flex items-center justify-center gap-3 py-6 text-sm text-muted">
          <span class="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span>Loading GitHub stats…</span>
        </div>
      </UCard>
      <UCard v-if="mounted && repos.list.length > 0" as="section" variant="subtle" class="print:hidden"
             :ui="{ body: 'space-y-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Personal Projects
          </h3>
        </template>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <LazyProjectSection v-for="repo in visibleProjects" :key="repo.name" :repo />
        </div>
        <div v-if="repos.list.length > 6" class="flex justify-center gap-4">
          <UButton v-if="!showAllProjects" variant="subtle" color="neutral" icon="i-hugeicons-arrow-down-01"
                   label="Show more" @click="showMore" />
          <UButton v-else variant="subtle" color="neutral" icon="i-hugeicons-arrow-up-01" label="Show less"
                   @click="showLess" />
          <UButton v-if="repos.list.length >= 12" variant="subtle" color="neutral" icon="i-hugeicons-github"
                   label="View all on GitHub" :to="`https://github.com/${username}?tab=repositories`" target="_blank"
                   external />
        </div>
      </UCard>
      <UCard v-if="mounted && contributions.list.length > 0" as="section" variant="subtle" class="print:hidden"
             :ui="{ body: 'grid grid-cols-1 md:grid-cols-2 gap-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Open Source Contributions
          </h3>
        </template>
        <SpecialCard v-for="(contribution, index) in contributions.list" :key="index">
          <LazyContributionSection :contribution />
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
             class="print:bg-transparent" :ui="{ body: 'space-y-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Certifications
          </h3>
        </template>
        <CertificationSection v-for="certificate in certificationsContent" :key="certificate.stem"
                              :certificate />
      </UCard>
      <p class="text-muted print:hidden text-sm text-center">
        Copyright © {{ startYear }} - {{ new Date().getFullYear() }} by {{ username
        }}
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
</template>
