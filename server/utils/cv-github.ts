import type { Octokit } from '@octokit/rest'

export interface Contribution {
  repoFullName: string
  repoUrl: string
  prCount: number
  stars: number
  lastPrUpdatedAt: string
}

/** Fetch merged PRs to repos the user doesn't own, grouped by repo */
export async function fetchContributions(username: string, octokit: Octokit): Promise<Contribution[]> {
  if (!username) return []
  try {
    const res = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:merged author:${username}`,
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    })
    const summaryMap = new Map<string, Contribution>()
    for (const item of res.data.items) {
      const repoFullName = item.repository_url?.replace('https://api.github.com/repos/', '')
      if (!repoFullName) continue
      const [owner] = repoFullName.split('/')
      if (owner?.toLowerCase() === username.toLowerCase()) continue
      const updatedAt = item.updated_at || item.closed_at || item.created_at || new Date().toISOString()
      const existing = summaryMap.get(repoFullName)
      const summary = existing || { repoFullName, repoUrl: `https://github.com/${repoFullName}`, prCount: 0, stars: 0, lastPrUpdatedAt: updatedAt }
      summary.prCount += 1
      if (new Date(updatedAt).getTime() > new Date(summary.lastPrUpdatedAt).getTime())
        summary.lastPrUpdatedAt = updatedAt
      summaryMap.set(repoFullName, summary)
    }
    const candidates = Array.from(summaryMap.values())
      .sort((a, b) => b.prCount - a.prCount || new Date(b.lastPrUpdatedAt).getTime() - new Date(a.lastPrUpdatedAt).getTime())
      .slice(0, 12)
    const enriched = await Promise.all(
      candidates.map(async (summary) => {
        const [owner, repo] = summary.repoFullName.split('/')
        if (!owner || !repo) return summary
        try {
          const repoRes = await octokit.rest.repos.get({ owner, repo })
          return { ...summary, stars: repoRes.data.stargazers_count || 0 }
        }
        catch { return summary }
      }),
    )
    return enriched.sort((a, b) => b.prCount - a.prCount || (b.stars || 0) - (a.stars || 0)).slice(0, 6)
  }
  catch { return [] }
}
