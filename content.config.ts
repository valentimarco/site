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
        url: z.string().optional(),
      }),
    }),
  },
})
