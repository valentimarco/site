// Re-export types derived from Zod schemas for backward compatibility
// New code should use the auto-imported schemas from shared/types/ directly.

export type { ContributionPr, ContributionSummaryType as ContributionSummary, GitHubApiResponse, GitHubProfileType, GitHubRepositoryType as GitHubRepository } from '#shared/types/schemas'
