import { z } from 'zod'

// ============================================================
// OUTPUT SCHEMAS
// ============================================================

export const gitHubRepositorySchema = z.object({
  name: z.string(),
  html_url: z.string(),
  languages: z.array(z.string()),
  stargazers_count: z.number().int().nonnegative(),
  description: z.string().nullable().optional(),
})

export type GitHubRepositoryType = z.infer<typeof gitHubRepositorySchema>

export const contributionPrSchema = z.object({
  title: z.string(),
  url: z.string(),
  updated_at: z.string(),
})

export type ContributionPr = z.infer<typeof contributionPrSchema>

export const contributionSummarySchema = z.object({
  repoFullName: z.string(),
  repoUrl: z.string(),
  prCount: z.number().int().nonnegative(),
  lastPrUpdatedAt: z.string(),
  stars: z.number().int().nonnegative(),
  recentPrs: z.array(contributionPrSchema),
})

export type ContributionSummaryType = z.infer<typeof contributionSummarySchema>

export const gitHubProfileSchema = z.object({
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  created_at: z.string().optional(),
  followers: z.number().int().nonnegative().optional(),
  following: z.number().int().nonnegative().optional(),
  source: z.enum(['github', 'fallback']).optional(),
})

export type GitHubProfileType = z.infer<typeof gitHubProfileSchema>

export const gitHubApiResponseSchema = z.object({
  profile: gitHubProfileSchema,
  repos: z.object({
    list: z.array(gitHubRepositorySchema),
  }),
  contributions: z.object({
    list: z.array(contributionSummarySchema),
  }),
})

export type GitHubApiResponse = z.infer<typeof gitHubApiResponseSchema>
