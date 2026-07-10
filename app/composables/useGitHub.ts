import type { ContributionSummary, GitHubRepository } from '~/utils/consts'

interface UseGitHubOptions {
  username: string
  name: string
  email: string
  location: string
  projectSlugs: string[]
}

export async function useGitHub(options: UseGitHubOptions) {
  const { username, name, email, location, projectSlugs } = options

  const { data } = await useFetch('/api/github', {
    query: {
      username,
      name,
      email,
      location,
      projectSlugs,
    },
    key: `github:${username}`,
    getCachedData,
    transform: (res) => {
      // Store local cache like the original implementation for offline support
      setCachedData('profile', res.profile)
      setCachedData('repos', res.repos)
      setCachedData('contributions', res.contributions)
      return res
    },
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
