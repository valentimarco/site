import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    profile: defineCollection({
      type: 'page',
      source: 'profile.md',
      schema: z.object({
        name: z.string(),
        username: z.string(),
        description: z.string(),
        jobTitle: z.string(),
        birthDate: z.string(),
        ogImage: z.string(),
        email: z.string(),
        location: z.string(),
        socials: z.array(z.object({
          label: z.string(),
          icon: z.string(),
          url: z.string(),
        })),
      }),
    }),
    skills: defineCollection({
      type: 'data',
      source: 'skills.yml',
      schema: z.object({
        categories: z.array(z.object({
          name: z.string(),
          items: z.array(z.string()),
        })),
      }),
    }),
    experiences: defineCollection({
      type: 'page',
      source: 'experiences/*.md',
      schema: z.object({
        company: z.string(),
        companyUrl: z.string(),
        location: z.string(),
        position: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        technologies: z.array(z.string()),
        isMaintainer: z.boolean().optional(),
        titleMaintainer: z.string().optional(),
        isContributor: z.boolean().optional(),
        titleContributor: z.string().optional(),
      }),
    }),
    education: defineCollection({
      type: 'page',
      source: 'education/*.md',
      schema: z.object({
        institution: z.string(),
        degree: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        skills: z.array(z.string()),
      }),
    }),
    certifications: defineCollection({
      type: 'data',
      source: 'certifications/*.md',
      schema: z.object({
        title: z.string(),
        issuer: z.string(),
        issueDate: z.string(),
        image: z.string(),
        url: z.string().optional(),
      }),
    }),
    projects: defineCollection({
      type: 'data',
      source: 'projects.yml',
      schema: z.object({
        repos: z.array(z.string()).max(12),
      }),
    }),
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        image: z.string().optional(),
        tags: z.array(z.string()).optional(),
        draft: z.boolean().optional().default(false),
      }),
    }),
    cv: defineCollection({
      type: 'data',
      source: 'cv.yml',
      schema: z.object({
        body: z.array(z.enum([
          'summary',
          'experience',
          'skills',
          'projects',
          'education',
          'certifications',
          'contributions',
        ])),
      }),
    }),
  },
})
