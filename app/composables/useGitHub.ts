import { Octokit } from '@octokit/rest'

interface UseGitHubOptions {
  username: string
  name: string
  email: string
  location: string
  projectSlugs: string[]
}

export async function useGitHub(options: UseGitHubOptions) {
  const { username, name, email, location, projectSlugs } = options

  const auth: string | undefined = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN : undefined
  const octokit = new Octokit({
    auth,
  })

  const { data: profile } = await useAsyncData('profile', async () => {
    const res = await octokit.rest.users.getByUsername({ username })
    return res.data
  }, {
    transform: (data) => {
      return setCachedData('profile', {
        ...data,
        name: data.name || name,
        email: data.email || email,
        location: data.location || location,
      })
    },
    getCachedData,
    default: () => ({
      name,
      email,
      location,
      created_at: new Date().toISOString(),
      followers: 0,
      following: 0,
      fetchedAt: new Date(),
    }),
  })

  const { data: repos } = await useAsyncData('repos', async () => {
    const results = await Promise.all(projectSlugs.map(async (slug) => {
      try {
        const res = await octokit.rest.repos.get({ owner: username, repo: slug })
        return res.data
      }
      catch {
        return null
      }
    }))
    return results.filter((r): r is GitHubRepository => r !== null)
  }, {
    transform: (data) => {
      return setCachedData('repos', { list: data })
    },
    getCachedData,
    default: () => ({
      list: [] as GitHubRepository[],
      fetchedAt: new Date(),
    }),
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
      return setCachedData('contributions', data)
    },
    getCachedData,
    default: () => ({
      list: [] as ContributionSummary[],
      fetchedAt: new Date(),
    }),
  })

  return {
    profile,
    repos,
    contributions,
  }
}
