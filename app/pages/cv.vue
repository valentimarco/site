<script setup lang="ts">
const {
  name, location, email, username,
  ogImage, jobTitle,
  skillsContent, experiencesContent, educationContent, certificationsContent,
  projectSlugs,
} = await useContent()

const { contributions } = await useGitHub({ username, name, email, location, projectSlugs })

const cvConfig = await useAsyncData('cv-config', () => queryCollection('cv').first(), { server: true })

const route = useRoute()
const title = useTitle(`${name} - CV`)

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
  titleTemplate: t => t ? `${t} · CV` : `${name} · CV`,
  description: `Curriculum Vitae of ${name}, ${jobTitle}`,
  ogTitle: title,
  ogDescription: `Curriculum Vitae of ${name}, ${jobTitle}`,
  ogImage,
  ogType: 'website',
  ogUrl: route.fullPath,
})

function handlePrint() {
  window.print()
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  return `${month} ${year}`
}

function getDateRange(startDate: string, endDate?: string) {
  const start = formatDate(startDate)
  const end = endDate ? formatDate(endDate) : 'Present'
  return `${start} – ${end}`
}

// Flatten all skills into a single semicolon-separated list
const allSkills = computed(() => {
  if (!skillsContent?.value?.categories) return ''
  return skillsContent.value.categories
    .flatMap((cat: { items: string[] }) => cat.items)
    .join('; ')
})

// Track when all content is loaded
const isContentReady = computed(() => {
  return name
    && experiencesContent.value
    && skillsContent.value
    && educationContent.value
    && contributions.value
})

// Notify parent window when content is ready (browser-only)
if (typeof window !== 'undefined') {
  watch(isContentReady, (ready) => {
    if (ready && window.parent !== window)
      window.parent.postMessage({ type: 'cv-ready' }, '*')
  }, { immediate: true })
}
</script>

<template>
<BlurReveal
  class="min-h-screen max-w-4xl mx-auto not-print:pt-12 print:max-w-none selection:bg-primary selection:text-neutral-900">
  <div class="p-4 space-y-4 print:p-0">
    <UCard variant="subtle" class="print:bg-transparent">
      <div class="space-y-4">
        <!-- Header -->
        <header class="text-center space-y-1">
          <h1 class="text-2xl font-bold text-highlighted">{{ name }}</h1>
          <div class="text-sm text-muted">{{ email }} ❖ {{ location }}</div>
        </header>

        <!-- Work Experience -->
        <template v-if="cvConfig.data.value?.body.includes('experience')">
          <section>
            <h2 class="text-base font-bold text-highlighted border-b border-default pb-1 mb-2 uppercase tracking-wide">
              Work Experience</h2>
            <div class="space-y-3">
              <div v-for="exp in experiencesContent" :key="exp.stem" class="print:break-inside-auto">
                <div class="flex justify-between items-baseline">
                  <h3 class="font-semibold text-highlighted text-sm">{{ exp.company }}</h3>
                  <div class="text-xs text-muted whitespace-nowrap">{{ getDateRange(exp.startDate, exp.endDate) }}</div>
                </div>
                <div class="flex justify-between items-baseline text-sm">
                  <span class="text-toned italic">{{ exp.position }}</span>
                  <span class="text-muted text-xs">{{ exp.location }}</span>
                </div>
                <article class="mt-1 text-sm text-toned leading-snug">
                  <ContentRenderer :value="exp" />
                </article>
              </div>
            </div>
          </section>
        </template>

        <!-- Open Source Contributions -->
        <template v-if="cvConfig.data.value?.body.includes('contributions') && contributions.list?.length">
          <section>
            <h2 class="text-base font-bold text-highlighted border-b border-default pb-1 mb-2 uppercase tracking-wide">
              Open Source Contributions</h2>
            <ul class="space-y-1 text-sm text-toned">
              <li v-for="(contrib, index) in contributions.list" :key="index" class="flex gap-2">
                <span>•</span>
                <span>{{ contrib.repoFullName }} ★ {{ contrib.stars }} stars, {{ contrib.prCount }} PRs</span>
              </li>
            </ul>
          </section>
        </template>

        <!-- Education -->
        <template v-if="cvConfig.data.value?.body.includes('education')">
          <section>
            <h2 class="text-base font-bold text-highlighted border-b border-default pb-1 mb-2 uppercase tracking-wide">
              Education</h2>
            <div class="space-y-3">
              <div v-for="edu in educationContent" :key="edu.stem" class="print:break-inside-auto">
                <div class="flex justify-between items-baseline">
                  <h3 class="font-semibold text-highlighted text-sm">{{ edu.institution }}</h3>
                  <div class="text-xs text-muted whitespace-nowrap">{{ getDateRange(edu.startDate, edu.endDate) }}</div>
                </div>
                <div class="text-sm text-toned italic">{{ edu.degree }}</div>
              </div>
            </div>
          </section>
        </template>

        <!-- Skills -->
        <template v-if="cvConfig.data.value?.body.includes('skills') && skillsContent?.categories">
          <section>
            <h2 class="text-base font-bold text-highlighted border-b border-default pb-1 mb-2 uppercase tracking-wide">
              Skills</h2>
            <p class="text-sm text-toned leading-snug">{{ allSkills }}</p>
          </section>
        </template>

        <!-- Certifications -->
        <template v-if="cvConfig.data.value?.body.includes('certifications') && certificationsContent?.length">
          <section>
            <h2 class="text-base font-bold text-highlighted border-b border-default pb-1 mb-2 uppercase tracking-wide">
              Certifications</h2>
            <ul class="space-y-1 text-sm text-toned">
              <li v-for="cert in certificationsContent" :key="cert.stem" class="flex gap-2">
                <span>•</span>
                <span>{{ cert.title }} – {{ cert.issuer }} – {{ formatDate(cert.issueDate) }}</span>
              </li>
            </ul>
          </section>
        </template>

        <footer class="pt-4 border-t border-default text-xs text-muted print:mt-8">
          <p>I authorise the processing of the personal data in this CV in accordance with Regulation (EU) 2016/679 of
            the
            European Parliament and of the Council (GDPR).</p>
          <p class="mt-1">© {{ new Date().getFullYear() }} {{ name }}</p>
        </footer>
      </div>
    </UCard>
  </div>
</BlurReveal>

<div class="fixed bottom-8 left-1/2 -translate-x-1/2 no-print animate-bounce print:hidden">
  <UButton size="lg" icon="i-hugeicons-printer" label="Download PDF" color="primary" @click="handlePrint" />
</div>

</template>

<style scoped>
@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    font-size: 11pt;
  }

  .no-print {
    display: none !important;
  }

  @page {
    margin: 0.5in;
  }

  a {
    color: inherit !important;
    text-decoration: none !important;
  }
}

@keyframes bounce {

  0%,
  100% {
    transform: translateX(-50%) translateY(0);
  }

  50% {
    transform: translateX(-50%) translateY(-10px);
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}
</style>
