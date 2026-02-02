import * as fs from "fs/promises";
import * as path from "path";
import { simpleGit, SimpleGit } from "simple-git";
import { Minimatch } from "minimatch";
import { getRepositoryPaths, getIgnorePatterns } from "../config";

/**
 * Information about a Git remote repository.
 */
export interface RemoteInfo {
  name: string;
  fetchUrl?: string;
  pushUrl?: string;
}

/**
 * Information about a Git worktree.
 */
export interface WorktreeInfo {
  name: string; // Worktree name
  path: string; // Absolute path to worktree
  branch?: string; // Branch name (from ref, e.g., "refs/heads/main" -> "main")
  isMain: boolean; // Whether this is the main worktree
  isDetached: boolean; // Whether HEAD is detached
  commitHash?: string; // Short commit hash
  commitMessage?: string; // First line of commit message
}

/**
 * Information about a discovered Git repository.
 */
export interface RepositoryInfo {
  path: string;
  name: string;
  remotes: RemoteInfo[];
  currentBranch?: string;
  isSubmodule: boolean;
  worktrees: WorktreeInfo[];
  lastScanned: string;
}

/**
 * Scanner to discover Git repositories in configured paths.
 */
export class RepositoryScanner {
  private static readonly MAX_DEPTH = 10;
  private static readonly SKIP_DIRECTORIES = [
    "node_modules",
    ".vscode",
    "dist",
    "build",
    "target",
    ".git",
  ];

  private ignoreMatchers: Minimatch[] = [];

  constructor() {
    this.updateIgnorePatterns();
  }

  private updateIgnorePatterns(): void {
    const patterns = getIgnorePatterns();

    this.ignoreMatchers = patterns.map(
      (pattern) => new Minimatch(pattern, { dot: true }),
    );
  }

  private shouldIgnorePath(targetPath: string): boolean {
    return this.ignoreMatchers.some((matcher) => matcher.match(targetPath));
  }

  /**
   * Scan a base path recursively to find Git repositories.
   * @param basePath The directory path to scan
   * @returns Array of discovered repositories
   */
  async scanPath(basePath: string): Promise<RepositoryInfo[]> {
    this.updateIgnorePatterns();

    const repositories: RepositoryInfo[] = [];
    const seenPaths = new Set<string>();

    const scan = async (dirPath: string, depth: number): Promise<void> => {
      if (depth > RepositoryScanner.MAX_DEPTH) {
        return;
      }

      if (this.shouldIgnorePath(dirPath)) {
        return;
      }

      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const gitEntry = entries.find((e) => e.name === ".git");

        if (gitEntry) {
          if (gitEntry.isFile()) {
            return;
          }

          const normalizedPath = path.normalize(dirPath);

          if (seenPaths.has(normalizedPath)) {
            return;
          }

          seenPaths.add(normalizedPath);

          const repoInfo = await this.extractRepositoryInfo(
            dirPath,
            gitEntry.isFile(),
          );

          if (repoInfo) {
            repositories.push(repoInfo);
          }

          return;
        }

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.isSymbolicLink()) {
            if (RepositoryScanner.SKIP_DIRECTORIES.includes(entry.name)) {
              continue;
            }

            await scan(path.join(dirPath, entry.name), depth + 1);
          }
        }
      } catch (error) {
        console.warn(`Cannot access ${dirPath}:`, error);
      }
    };

    await scan(basePath, 0);

    return repositories;
  }

  /**
   * Scan all configured repository paths.
   * @returns Array of all discovered repositories (worktrees are skipped during scan)
   */
  async scanAllConfiguredPaths(): Promise<RepositoryInfo[]> {
    const configuredPaths = getRepositoryPaths();
    const allRepositories: RepositoryInfo[] = [];
    const seenPaths = new Set<string>();

    for (const configPath of configuredPaths) {
      try {
        const repos = await this.scanPath(configPath);

        for (const repo of repos) {
          const normalizedPath = path.normalize(repo.path);

          if (!seenPaths.has(normalizedPath)) {
            seenPaths.add(normalizedPath);
            allRepositories.push(repo);
          }
        }
      } catch (error) {
        console.error(`Failed to scan path ${configPath}:`, error);
      }
    }

    return allRepositories;
  }

  /**
   * Extract repository information from a git directory.
   * @param repoPath Path to the repository root
   * @param isGitFile Whether .git is a file (submodule) or directory
   * @returns Repository information or null if invalid
   */
  private async extractRepositoryInfo(
    repoPath: string,
    isGitFile: boolean,
  ): Promise<RepositoryInfo | null> {
    try {
      const git: SimpleGit = simpleGit(repoPath);

      // Get current branch
      let currentBranch: string | undefined;

      try {
        const status = await git.status();

        currentBranch = status.current || undefined;
      } catch (error) {
        console.warn(`[Scanner] Could not get status for ${repoPath}:`, error);
      }

      // Get remotes
      const remotes: RemoteInfo[] = [];

      try {
        const remoteList = await git.getRemotes(true);

        for (const remote of remoteList) {
          remotes.push({
            name: remote.name,
            fetchUrl: remote.refs.fetch,
            pushUrl: remote.refs.push,
          });
        }
      } catch (error) {
        console.warn(`[Scanner] Could not get remotes for ${repoPath}:`, error);
      }

      // Get worktrees
      const worktrees: WorktreeInfo[] = [];

      try {
        const worktreeList = await git.raw(["worktree", "list", "--porcelain"]);
        const lines = worktreeList.split("\n");

        let currentWorktree: Partial<WorktreeInfo> = {};

        for (const line of lines) {
          if (line.startsWith("worktree ")) {
            if (currentWorktree.path) {
              worktrees.push(currentWorktree as WorktreeInfo);
            }

            currentWorktree = {
              path: line.substring("worktree ".length),
              name: "",
              isMain: false,
              isDetached: false,
            };
          } else if (line.startsWith("HEAD ")) {
            const ref = line.substring("HEAD ".length);

            if (currentWorktree.path) {
              currentWorktree.branch = ref.startsWith("refs/heads/")
                ? ref.substring("refs/heads/".length)
                : ref;
              currentWorktree.commitHash = ref.substring(0, 8);
            }
          } else if (line.startsWith("branch ")) {
            if (currentWorktree.path) {
              currentWorktree.branch = line.substring(
                "branch refs/heads/".length,
              );
            }
          } else if (line === "detached") {
            if (currentWorktree.path) {
              currentWorktree.isDetached = true;
            }
          } else if (line === "") {
            if (currentWorktree.path) {
              worktrees.push(currentWorktree as WorktreeInfo);
              currentWorktree = {};
            }
          }
        }

        if (currentWorktree.path) {
          worktrees.push(currentWorktree as WorktreeInfo);
        }

        for (const wt of worktrees) {
          wt.name = path.basename(wt.path);
          wt.isMain = path.normalize(wt.path) === path.normalize(repoPath);

          try {
            const wtGit = simpleGit(wt.path);
            const log = await wtGit.log({ maxCount: 1 });

            if (log.latest) {
              wt.commitHash = log.latest.hash.substring(0, 8);
              wt.commitMessage = log.latest.message.split("\n")[0];
            }
          } catch (error) {
            console.warn(
              `[Scanner] Could not get commit info for worktree ${wt.path}:`,
              error,
            );
          }
        }
      } catch (error) {
        console.warn(
          `[Scanner] Could not get worktrees for ${repoPath}:`,
          error,
        );
      }

      const repositoryInfo: RepositoryInfo = {
        path: repoPath,
        name: path.basename(repoPath),
        remotes,
        currentBranch,
        isSubmodule: isGitFile,
        worktrees,
        lastScanned: new Date().toISOString(),
      };

      return repositoryInfo;
    } catch (error) {
      console.error(
        `[Scanner] Failed to extract repository info for ${repoPath}:`,
        error,
      );

      return null;
    }
  }
}
