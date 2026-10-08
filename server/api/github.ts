import type { ContributionSummaryType, GitHubApiResponse, GitHubProfileType, GitHubRepositoryType } from '#shared/types/schemas'
// Explicit import: the global auto-import resolves to the 1-arg client signature under vue-tsc
import { queryCollection } from '@nuxt/content/nitro'
import { Octokit } from '@octokit/rest'

type ProfileData = GitHubProfileType
type RepoData = GitHubRepositoryType
type ContributionSummaryData = ContributionSummaryType

const handler = defineEventHandler(async (event) => {
  // 1. Validate Input (Query)
  const rawQuery = getQuery(event)
  const validation = gitHubQuerySchema.safeParse(rawQuery)

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Validation failed: ${validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
    })
  }

  const { username, projectSlugs } = validation.data

  // Resolve identity from content instead of client query params (PII stays out of URLs/logs)
  let profileFallback: Pick<ProfileData, 'name' | 'email' | 'location'> = {}
  try {
    const profileContent = await queryCollection(event, 'profile').first()
    profileFallback = {
      name: profileContent?.name,
      email: profileContent?.email,
      location: profileContent?.location,
    }
  }
  catch (error) {
    console.warn('[api/github] failed to load profile content, continuing with empty fallback', error)
  }

  const config = useRuntimeConfig(event)
  const octokit = new Octokit({
    auth: config.githubToken || undefined,
  })

  // 2. Fetch Profile
  let profileData: ProfileData = {
    source: 'fallback',
    ...profileFallback,
    created_at: new Date().toISOString(),
    followers: 0,
    following: 0,
  }
  try {
    const res = await octokit.rest.users.getByUsername({ username })
    profileData = {
      source: 'github',
      name: res.data.name || profileFallback.name,
      email: res.data.email || profileFallback.email,
      location: res.data.location || profileFallback.location,
      created_at: res.data.created_at,
      followers: res.data.followers,
      following: res.data.following,
    }
  }
  catch (error) {
    console.warn('[api/github] profile fetch failed, serving fallback profile', error)
  }

  // 3. Fetch Repositories
  let reposList: RepoData[] = []
  try {
    const results = await Promise.all(projectSlugs.map(async (slug): Promise<RepoData | null> => {
      try {
        const res = await octokit.rest.repos.get({ owner: username, repo: slug })
        // Resolved here rather than per-card in the component: the client was issuing N
        // unauthenticated requests straight from SSR, which exhausted the 60 req/h budget and
        // let a stale localStorage cache outrank the 403, so server and client rendered
        // different language badges.
        const languages = await octokit.rest.repos
          .listLanguages({ owner: username, repo: slug })
          .then(langRes => Object.entries(langRes.data)
            .sort(([, a], [, b]) => b - a)
            .map(([lang]) => lang))
          .catch((error) => {
            console.warn(`[api/github] languages fetch failed: ${username}/${slug}`, error)
            return [] as string[]
          })
        return {
          name: res.data.name,
          html_url: res.data.html_url,
          languages,
          stargazers_count: res.data.stargazers_count || 0,
          description: res.data.description,
        }
      }
      catch (error) {
        console.warn(`[api/github] repo fetch failed: ${username}/${slug}`, error)
        return null
      }
    }))
    reposList = results.filter((r): r is RepoData => r !== null)
  }
  catch (error) {
    console.warn('[api/github] repositories fetch failed, serving empty list', error)
  }

  // 4. Fetch Contributions
  let contributionsList: ContributionSummaryData[] = []
  try {
    const res = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:merged author:${username}`,
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    })

    const summaryMap = new Map<string, ContributionSummaryData>()

    for (const item of res.data.items) {
      const repositoryUrl = item.repository_url
      if (!repositoryUrl) continue

      const repoFullName = repositoryUrl.replace('https://api.github.com/repos/', '')
      const [owner] = repoFullName.split('/')
      if (owner?.toLowerCase() === username.toLowerCase()) continue

      const updatedAt = item.updated_at || item.closed_at || item.created_at || new Date().toISOString()
      const existing = summaryMap.get(repoFullName)
      const summary: ContributionSummaryData = existing || {
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
      catch (error) {
        console.warn(`[api/github] repo enrichment failed: ${summary.repoFullName}`, error)
        return summary
      }
    }))

    contributionsList = enriched
      .sort((a, b) => b.prCount - a.prCount
        || (b.stars || 0) - (a.stars || 0)
        || new Date(b.lastPrUpdatedAt).getTime() - new Date(a.lastPrUpdatedAt).getTime())
      .slice(0, 6)
  }
  catch (error) {
    console.warn('[api/github] contributions fetch failed, serving empty list', error)
  }

  const rawResponse = {
    profile: profileData,
    repos: { list: reposList },
    contributions: { list: contributionsList },
  }

  // 5. Validate Output (Response)
  const outputValidation = gitHubApiResponseSchema.safeParse(rawResponse)
  if (!outputValidation.success)
    console.warn('[api/github] output schema validation mismatch, returning sanitized/fallback data', outputValidation.error)

  return outputValidation.success ? outputValidation.data : rawResponse
})

/**
 * A degraded payload is still a `200`, so a plain route-rule cache would store it and then serve
 * it for the full `maxAge` — one expired token or rate-limit blip left the portfolio without its
 * Projects and Contributions sections for a full hour, and nothing at the edge logged it. Only
 * healthy payloads are written, and only they are ever read back.
 */
function isDegraded(payload: GitHubApiResponse) {
  return payload.profile?.source !== 'github'
    || payload.repos.list.length === 0
    || payload.contributions.list.length === 0
}

export default defineEventHandler(async (event) => {
  const rawQuery = getQuery(event)
  const validation = gitHubQuerySchema.safeParse(rawQuery)
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: `Validation failed: ${validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
    })
  }

  // Normalised so `?a=1&b=2` and `?b=2&a=1` share one entry.
  const { username, projectSlugs } = validation.data
  const cacheKey = `github:${username}:${[...projectSlugs].sort().join(',')}`
  const storage = useStorage('cache')

  const cached = await storage.getItem<GitHubApiResponse>(cacheKey)
  if (cached && !isDegraded(cached)) return cached

  const payload = await handler(event)
  if (!isDegraded(payload)) await storage.setItem(cacheKey, payload)
  else console.warn('[api/github] degraded response not cached, serving fallback')

  return payload
})
