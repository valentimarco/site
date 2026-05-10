<script setup lang="ts">
const {
  profileContent, name, location, email, username,
  jobTitle, socials, age,
  skillsContent, experiencesContent, educationContent, certificationsContent,
  projectSlugs,
} = await useContent()

const { profile, repos, contributions } = await useGitHub({ username, name, email, location, projectSlugs })

const showAllProjects = ref(false)
const isPrinting = ref(false)
let currentIframe: HTMLIFrameElement | null = null

const visibleProjects = computed(() => {
  if (showAllProjects.value) return repos.value.list
  return repos.value.list.slice(0, 6)
})

function printCV() {
  isPrinting.value = true

  // Create iframe
  currentIframe = document.createElement('iframe')
  currentIframe.style.position = 'fixed'
  currentIframe.style.top = '-9999px'
  currentIframe.style.left = '-9999px'
  currentIframe.style.width = '0'
  currentIframe.style.height = '0'
  currentIframe.src = '/cv'
  document.body.appendChild(currentIframe)

  // Listen for message from iframe when CV is ready
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'cv-ready' && currentIframe) {
      currentIframe.contentWindow?.print()
      isPrinting.value = false

      // Cleanup
      window.removeEventListener('message', handleMessage)
      setTimeout(() => {
        if (currentIframe) {
          document.body.removeChild(currentIframe)
          currentIframe = null
        }
      }, 1000)
    }
  }

  window.addEventListener('message', handleMessage)

  // Fallback timeout in case message never comes
  setTimeout(() => {
    if (isPrinting.value && currentIframe) {
      currentIframe.contentWindow?.print()
      isPrinting.value = false
      window.removeEventListener('message', handleMessage)
      setTimeout(() => {
        if (currentIframe) {
          document.body.removeChild(currentIframe)
          currentIframe = null
        }
      }, 1000)
    }
  }, 5000)
}
</script>

<template>
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
             :ui="{ body: 'space-y-4' }">
        <template #header>
          <h3 class="text-xl md:text-2xl font-bold text-highlighted leading-loose">
            Personal Projects
          </h3>
        </template>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ProjectSection v-for="repo in visibleProjects" :key="repo.name" :repo />
        </div>
        <div v-if="repos.list.length > 6" class="flex justify-center gap-4">
          <UButton v-if="!showAllProjects" variant="subtle" color="neutral" icon="i-hugeicons-arrow-down-01"
                   label="Show more" @click="showAllProjects = true" />
          <UButton v-else variant="subtle" color="neutral" icon="i-hugeicons-arrow-up-01" label="Show less"
                   @click="showAllProjects = false" />
          <UButton v-if="repos.list.length >= 12" variant="subtle" color="neutral" icon="i-hugeicons-github"
                   label="View all on GitHub" :to="`https://github.com/${username}?tab=repositories`" target="_blank"
                   external />
        </div>
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
        Copyright © {{ new Date(profile.created_at).getFullYear() }} - {{ new Date().getFullYear() }} by {{ username
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
  <UButton class="fixed bottom-4 left-4 no-print z-50" size="lg" icon="i-hugeicons-printer" label="Print CV"
           @click="printCV" />
  <ThemeButton />
  <UModal v-model:open="isPrinting" prevent-close>
    <template #content>
      <div class="p-6 text-center">
        <UIcon name="i-hugeicons-printer" class="size-8 mx-auto mb-2 animate-pulse" />
        <p class="text-lg font-medium">
          Preparing your CV...
        </p>
        <p class="text-sm text-muted">
          The print dialog will open shortly
        </p>
      </div>
    </template>
  </UModal>
</template>
