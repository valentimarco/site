import { Octokit } from '@octokit/rest'

export default defineEventHandler(async (event) => {
  // 1. Validate Input (Query)
  const rawQuery = getQuery(event)
  const validation = gitHubQuerySchema.safeParse(rawQuery)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Validation failed: ${validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
    })
  }

  const { username, name, email, location, projectSlugs } = validation.data

  const config = useRuntimeConfig(event)
  const auth = config.githubToken || undefined

  const octokit = new Octokit({
    auth,
  })

  // 1. Fetch Profile
  let profileData: any = null
  try {
    const res = await octokit.rest.users.getByUsername({ username })
    profileData = {
      ...res.data,
      name: res.data.name || name,
      email: res.data.email || email,
      location: res.data.location || location,
    }
  }
  catch {
    profileData = {
      name,
      email,
      location,
      created_at: new Date().toISOString(),
      followers: 0,
      following: 0,
    }
  }

  // 2. Fetch Repositories
  let reposList: any[] = []
  try {
    const results = await Promise.all(projectSlugs.map(async (slug) => {
      try {
        const res = await octokit.rest.repos.get({ owner: username, repo: slug })
        return res.data
      }
      catch {
        return null
      }
    }))
    reposList = results.filter(r => r !== null)
  }
  catch {}

  // 3. Fetch Contributions
  let contributionsList: any[] = []
  try {
    const res = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:merged author:${username}`,
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    })

    const summaryMap = new Map<string, any>()

    for (const item of res.data.items) {
      const repositoryUrl = item.repository_url
      if (!repositoryUrl) continue

      const repoFullName = repositoryUrl.replace('https://api.github.com/repos/', '')
      const [owner] = repoFullName.split('/')
      if (owner?.toLowerCase() === username.toLowerCase()) continue

      const updatedAt = item.updated_at || item.closed_at || item.created_at || new Date().toISOString()
      const existing = summaryMap.get(repoFullName)
      const summary: any = existing || {
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

    contributionsList = enriched
      .sort((a, b) => b.prCount - a.prCount
        || (b.stars || 0) - (a.stars || 0)
        || new Date(b.lastPrUpdatedAt).getTime() - new Date(a.lastPrUpdatedAt).getTime())
      .slice(0, 6)
  }
  catch {}

  const rawResponse = {
    profile: profileData,
    repos: { list: reposList },
    contributions: { list: contributionsList },
  }

  // 2. Validate Output (Response)
  const outputValidation = gitHubApiResponseSchema.safeParse(rawResponse)
  if (!outputValidation.success)
    console.warn('API output schema validation mismatch, returning sanitized/fallback data', outputValidation.error)

  return outputValidation.success ? outputValidation.data : rawResponse
})
