import type { RestEndpointMethodTypes } from '@octokit/rest'

export type GitHubRepository = RestEndpointMethodTypes['repos']['get']['response']['data']

export interface ContributionSummary {
  repoFullName: string
  repoUrl: string
  prCount: number
  lastPrUpdatedAt: string
  stars: number
  recentPrs: {
    title: string
    url: string
    updated_at: string
  }[]
}
