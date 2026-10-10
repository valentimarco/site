import type { ContributionSummary, GitHubRepository } from '~/utils/consts'

// Display-only fallbacks. The endpoint takes no client input — the account it queries is
// server-configured via `GITHUB_USERNAME`.
interface UseGitHubOptions {
  name: string
  email: string
  location: string
}

interface GitHubProfileData {
  name: string
  email: string
  location: string
  created_at: string
  followers: number
  following: number
  fetchedAt: Date
}

// Explicit response shape: the inferred /api/github union loses `profile` on one branch
interface GitHubData {
  profile: GitHubProfileData
  repos: { list: GitHubRepository[], fetchedAt?: Date }
  contributions: { list: ContributionSummary[], fetchedAt?: Date }
}

export async function useGitHub(options: UseGitHubOptions) {
  const { name, email, location } = options

  const { data, status } = await useFetch<GitHubData>('/api/github', {
    key: 'github',
    // This data only backs below-the-fold sections (projects, contributions) and a couple of profile
    // stats. Fetching it during SSR made the whole homepage wait on GitHub; resolve it on the client
    // after hydration instead, so first paint never depends on the API. No localStorage read here on
    // purpose: injecting a cached value synchronously during hydration desyncs the DOM from the SSR
    // HTML (Vue then reports a hydration mismatch). The endpoint itself is edge/KV-cached, so the
    // post-mount fetch is quick.
    server: false,
    lazy: true,
    default: () => ({
      profile: {
        name,
        email,
        location,
        created_at: new Date().toISOString(),
        followers: 0,
        following: 0,
        fetchedAt: new Date(),
      },
      repos: {
        list: [] as GitHubRepository[],
        fetchedAt: new Date(),
      },
      contributions: {
        list: [] as ContributionSummary[],
        fetchedAt: new Date(),
      },
    }),
  })

  return {
    status,
    profile: computed(() => data.value?.profile || {
      name,
      email,
      location,
      created_at: new Date().toISOString(),
      followers: 0,
      following: 0,
      fetchedAt: new Date(),
    }),
    repos: computed(() => data.value?.repos || {
      list: [],
      fetchedAt: new Date(),
    }),
    contributions: computed(() => data.value?.contributions || {
      list: [],
      fetchedAt: new Date(),
    }),
  }
}
