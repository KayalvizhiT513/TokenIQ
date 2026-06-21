import { Octokit } from '@octokit/rest'

export interface GitHubPR {
  number: number
  title: string
  author: string
  filesChanged: number
  linesAdded: number
  linesDeleted: number
  mergedAt: Date | null
  openedAt: Date
}

export async function fetchPullRequests(
  owner: string,
  repo: string,
  pat: string,
  limit = 500,
): Promise<GitHubPR[]> {
  const octokit = new Octokit({ auth: pat })
  const prs: GitHubPR[] = []

  try {
    let page = 1
    let hasMore = true

    while (hasMore && prs.length < limit) {
      const response = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'closed',
        per_page: 100,
        page,
      })

      for (const pr of response.data) {
        if (prs.length >= limit) break

        const filesResponse = await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: pr.number,
          per_page: 100,
        })

        const filesChanged = filesResponse.data.length
        const linesAdded = filesResponse.data.reduce(
          (sum, f) => sum + (f.additions || 0),
          0,
        )
        const linesDeleted = filesResponse.data.reduce(
          (sum, f) => sum + (f.deletions || 0),
          0,
        )

        prs.push({
          number: pr.number,
          title: pr.title,
          author: pr.user?.login || 'unknown',
          filesChanged,
          linesAdded,
          linesDeleted,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          openedAt: new Date(pr.created_at),
        })
      }

      hasMore = response.data.length === 100
      page++
    }

    return prs
  } catch (error) {
    console.error('GitHub API error:', error)
    throw error
  }
}
