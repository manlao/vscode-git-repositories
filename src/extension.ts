import * as vscode from "vscode";
import { onConfigurationChange } from "./config";
import { RepositoryStorage } from "./storage/repositoryStorage";
import {
  RepositoryScanner,
  RepositoryInfo,
  WorktreeInfo,
} from "./scanner/repositoryScanner";
import { RepositoryTreeDataProvider } from "./views/repositoryTreeDataProvider";
import { RepositoryNode, WorktreeNode } from "./views/treeNodes";
import { RepositoryDecorationProvider } from "./views/repositoryDecorationProvider";

async function scanAndStore(
  scanner: RepositoryScanner,
  storage: RepositoryStorage,
): Promise<void> {
  try {
    const repos = await scanner.scanAllConfiguredPaths();

    await storage.saveRepositories(repos);
  } catch (error) {
    console.error("Failed to scan repositories:", error);

    vscode.window.showErrorMessage(vscode.l10n.t("error.scanFailed"));
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const storage = new RepositoryStorage(context);
  const scanner = new RepositoryScanner();

  const decorationProvider = new RepositoryDecorationProvider();

  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(decorationProvider),
  );
  context.subscriptions.push(decorationProvider);

  const treeDataProvider = new RepositoryTreeDataProvider(
    storage,
    decorationProvider,
  );

  context.subscriptions.push(treeDataProvider);

  // Register TreeView
  const treeView = vscode.window.createTreeView(
    "git-repositories.repositories",
    {
      treeDataProvider,
      showCollapseAll: true,
    },
  );

  context.subscriptions.push(treeView);

  // Scan repositories on activation
  await scanAndStore(scanner, storage);

  // Listen for configuration changes
  const configDisposable = onConfigurationChange(async () => {
    await scanAndStore(scanner, storage);
  });

  context.subscriptions.push(configDisposable);

  const refreshCommand = vscode.commands.registerCommand(
    "git-repositories.refreshRepositories",
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t("progress.scanning"),
          cancellable: false,
        },
        async () => {
          await scanAndStore(scanner, storage);
        },
      );
    },
  );

  context.subscriptions.push(refreshCommand);

  const openRepoCommand = vscode.commands.registerCommand(
    "git-repositories.openRepository",
    async (
      nodeOrPath: RepositoryNode | string,
      nodes?: RepositoryNode[],
      event?: { altKey?: boolean; metaKey?: boolean },
    ) => {
      const repoPath =
        typeof nodeOrPath === "string"
          ? nodeOrPath
          : nodeOrPath?.repository?.path;

      if (!repoPath) {
        return;
      }

      const openInNewWindow = event?.altKey || event?.metaKey || false;

      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(repoPath),
        openInNewWindow,
      );
    },
  );

  context.subscriptions.push(openRepoCommand);

  // Register open worktree command
  const openWorktreeCommand = vscode.commands.registerCommand(
    "git-repositories.openWorktree",
    async (
      nodeOrPath: WorktreeNode | string,
      nodes?: WorktreeNode[],
      event?: { altKey?: boolean; metaKey?: boolean },
    ) => {
      const worktreePath =
        typeof nodeOrPath === "string"
          ? nodeOrPath
          : nodeOrPath?.worktree?.path;

      if (!worktreePath) {
        return;
      }

      const openInNewWindow = event?.altKey || event?.metaKey || false;

      await vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(worktreePath),
        openInNewWindow,
      );
    },
  );

  context.subscriptions.push(openWorktreeCommand);

  // Register open worktree in new window command
  const openWorktreeNewWindowCommand = vscode.commands.registerCommand(
    "git-repositories.openWorktreeInNewWindow",
    (node: WorktreeNode) => {
      if (node && node.worktree) {
        vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(node.worktree.path),
          true, // Open in new window
        );
      }
    },
  );

  context.subscriptions.push(openWorktreeNewWindowCommand);

  // Register open in new window command
  const openRepoNewWindowCommand = vscode.commands.registerCommand(
    "git-repositories.openRepositoryInNewWindow",
    (node: RepositoryNode) => {
      if (node && node.repository) {
        vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(node.repository.path),
          true, // Open in new window
        );
      }
    },
  );

  context.subscriptions.push(openRepoNewWindowCommand);

  const showQuickPickCommand = vscode.commands.registerCommand(
    "git-repositories.showQuickPick",
    async () => {
      const repositories = await storage.getRepositories();

      if (repositories.length === 0) {
        vscode.window.showInformationMessage(
          vscode.l10n.t("info.noRepositories"),
        );

        return;
      }

      interface RepositoryQuickPickItem extends vscode.QuickPickItem {
        repository?: RepositoryInfo;
        worktree?: WorktreeInfo;
      }

      const extractDomain = (remoteUrl: string): string => {
        const sshMatch = remoteUrl.match(
          /^(?:git@|ssh:\/\/(?:git@)?)([^:\/]+)/,
        );

        if (sshMatch) {
          return sshMatch[1];
        }

        const httpsMatch = remoteUrl.match(/^https?:\/\/([^\/]+)/);

        if (httpsMatch) {
          return httpsMatch[1];
        }

        return "unknown";
      };

      const extractOwnerAndRepo = (remoteUrl: string): string => {
        let pathPart = "";

        const sshMatch = remoteUrl.match(
          /^(?:git@|ssh:\/\/(?:git@)?)[^:\/]+[:\/ ](.+?)(?:\.git)?$/,
        );

        if (sshMatch) {
          pathPart = sshMatch[1];
        } else {
          const httpsMatch = remoteUrl.match(
            /^https?:\/\/[^\/]+\/(.+?)(?:\.git)?$/,
          );

          if (httpsMatch) {
            pathPart = httpsMatch[1];
          }
        }

        return pathPart || "unknown";
      };

      const domainGroups = new Map<string, RepositoryInfo[]>();
      const localRepos: RepositoryInfo[] = [];

      for (const repo of repositories) {
        if (repo.remotes.length > 0 && repo.remotes[0].fetchUrl) {
          const domain = extractDomain(repo.remotes[0].fetchUrl);

          if (!domainGroups.has(domain)) {
            domainGroups.set(domain, []);
          }

          domainGroups.get(domain)!.push(repo);
        } else {
          localRepos.push(repo);
        }
      }

      const items: RepositoryQuickPickItem[] = [];

      for (const [domain, repos] of domainGroups.entries()) {
        items.push({
          label: domain,
          kind: vscode.QuickPickItemKind.Separator,
        });

        for (const repo of repos) {
          const ownerRepo = extractOwnerAndRepo(repo.remotes[0].fetchUrl!);

          if (repo.worktrees.length > 1) {
            for (const worktree of repo.worktrees) {
              const descriptionParts: string[] = [];

              if (worktree.branch) {
                descriptionParts.push(worktree.branch);
              } else if (worktree.isDetached) {
                descriptionParts.push(vscode.l10n.t("worktree.detached"));
              }

              if (worktree.commitHash) {
                descriptionParts.push(worktree.commitHash);
              }

              if (worktree.commitMessage) {
                descriptionParts.push(worktree.commitMessage);
              }

              items.push({
                label: `$(${worktree.isMain ? "repo" : "git-branch"}) ${ownerRepo}/${worktree.name}`,
                description: descriptionParts.join(" • "),
                detail: worktree.path,
                repository: repo,
                worktree: worktree,
              });
            }
          } else {
            const descriptionParts: string[] = [];

            if (repo.currentBranch) {
              descriptionParts.push(repo.currentBranch);
            }

            items.push({
              label: `$(repo) ${ownerRepo}`,
              description: descriptionParts.join(" • "),
              detail: repo.path,
              repository: repo,
            });
          }
        }
      }

      if (localRepos.length > 0) {
        items.push({
          label: vscode.l10n.t("quickPick.separator.local"),
          kind: vscode.QuickPickItemKind.Separator,
        });

        for (const repo of localRepos) {
          if (repo.worktrees.length > 1) {
            for (const worktree of repo.worktrees) {
              const descriptionParts: string[] = [];

              if (worktree.branch) {
                descriptionParts.push(worktree.branch);
              } else if (worktree.isDetached) {
                descriptionParts.push(vscode.l10n.t("worktree.detached"));
              }

              if (worktree.commitHash) {
                descriptionParts.push(worktree.commitHash);
              }

              if (worktree.commitMessage) {
                descriptionParts.push(worktree.commitMessage);
              }

              items.push({
                label: `$(${worktree.isMain ? "repo" : "git-branch"}) ${repo.name}/${worktree.name}`,
                description: descriptionParts.join(" • "),
                detail: worktree.path,
                repository: repo,
                worktree: worktree,
              });
            }
          } else {
            const descriptionParts: string[] = [];

            if (repo.currentBranch) {
              descriptionParts.push(repo.currentBranch);
            }

            items.push({
              label: `$(repo) ${repo.name}`,
              description: descriptionParts.join(" • "),
              detail: repo.path,
              repository: repo,
            });
          }
        }
      }

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t("quickPick.placeholder"),
        matchOnDescription: true,
        matchOnDetail: true,
      });

      if (selected && selected.repository) {
        const pathToOpen = selected.worktree
          ? selected.worktree.path
          : selected.repository.path;
        await vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(pathToOpen),
          false,
        );
      }
    },
  );

  context.subscriptions.push(showQuickPickCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
