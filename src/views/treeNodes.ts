import * as vscode from "vscode";
import { RepositoryInfo, WorktreeInfo } from "../scanner/repositoryScanner";

/**
 * Helper function to check if any repository or its worktrees contain the current workspace path.
 */
function containsCurrentWorkspace(
  repositories: RepositoryInfo[],
  currentWorkspacePath?: string,
): boolean {
  if (!currentWorkspacePath) {
    return false;
  }

  return repositories.some(
    (repo) =>
      repo.path === currentWorkspacePath ||
      repo.worktrees.some((wt) => wt.path === currentWorkspacePath),
  );
}

export class EmptyStateNode extends vscode.TreeItem {
  constructor() {
    super(
      vscode.l10n.t("treeNode.emptyState.label"),
      vscode.TreeItemCollapsibleState.None,
    );

    this.iconPath = new vscode.ThemeIcon("info");
    this.contextValue = "emptyState";
    this.tooltip = vscode.l10n.t("treeNode.emptyState.tooltip");
    this.command = {
      command: "workbench.action.openSettings",
      title: vscode.l10n.t("command.openSettings"),
      arguments: ["@ext:git-repositories"],
    };
  }
}

export class DomainNode extends vscode.TreeItem {
  constructor(
    public readonly domain: string,
    public readonly repositories: RepositoryInfo[],
    currentWorkspacePath?: string,
  ) {
    const shouldExpand = containsCurrentWorkspace(
      repositories,
      currentWorkspacePath,
    );
    super(
      domain,
      shouldExpand
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed,
    );

    this.id = `domain:${domain}`;
    this.iconPath = new vscode.ThemeIcon("folder");
    this.contextValue = "domain";
    this.resourceUri = vscode.Uri.parse(`git-repositories:domain:${domain}`);
  }
}

export class OwnerNode extends vscode.TreeItem {
  public children: Map<string, OwnerNode | RepositoryNode> = new Map();

  constructor(
    public readonly owner: string,
    public readonly fullPath: string,
    public readonly repositories: RepositoryInfo[],
    public readonly domain?: string,
    currentWorkspacePath?: string,
  ) {
    const shouldExpand = containsCurrentWorkspace(
      repositories,
      currentWorkspacePath,
    );

    super(
      owner,
      shouldExpand
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed,
    );

    this.id = domain ? `owner:${domain}:${fullPath}` : `owner:${fullPath}`;
    this.iconPath = new vscode.ThemeIcon("folder");
    this.contextValue = "owner";
    this.tooltip = fullPath;
    this.resourceUri = vscode.Uri.parse(
      `git-repositories:owner:${domain || "local"}:${fullPath}`,
    );
  }

  addChild(name: string, node: OwnerNode | RepositoryNode): void {
    this.children.set(name, node);
  }

  updateExpansionState(currentWorkspacePath?: string): void {
    if (!currentWorkspacePath) {
      return;
    }

    const hasCurrentWorkspace =
      this.containsCurrentWorkspaceRecursive(currentWorkspacePath);
    if (hasCurrentWorkspace) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }

    for (const child of this.children.values()) {
      if (child instanceof OwnerNode) {
        child.updateExpansionState(currentWorkspacePath);
      }
    }
  }

  private containsCurrentWorkspaceRecursive(
    currentWorkspacePath: string,
  ): boolean {
    if (containsCurrentWorkspace(this.repositories, currentWorkspacePath)) {
      return true;
    }

    for (const child of this.children.values()) {
      if (child instanceof OwnerNode) {
        if (child.containsCurrentWorkspaceRecursive(currentWorkspacePath)) {
          return true;
        }
      } else if (child instanceof RepositoryNode) {
        if (
          child.repository.path === currentWorkspacePath ||
          child.repository.worktrees.some(
            (wt) => wt.path === currentWorkspacePath,
          )
        ) {
          return true;
        }
      }
    }

    return false;
  }

  getChildren(currentWorkspacePath?: string): (OwnerNode | RepositoryNode)[] {
    if (this.children.size > 0) {
      return Array.from(this.children.values()).sort((a, b) => {
        if (a instanceof OwnerNode && b instanceof RepositoryNode) {
          return -1;
        }
        if (a instanceof RepositoryNode && b instanceof OwnerNode) {
          return 1;
        }
        if (a instanceof OwnerNode && b instanceof OwnerNode) {
          return a.owner.localeCompare(b.owner);
        }
        return (a as RepositoryNode).repository.name.localeCompare(
          (b as RepositoryNode).repository.name,
        );
      });
    }

    return this.repositories.map(
      (repo) => new RepositoryNode(repo, currentWorkspacePath),
    );
  }

  hasChildren(): boolean {
    return this.children.size > 0;
  }
}

export class LocalGroupNode extends vscode.TreeItem {
  constructor(public readonly repositories: RepositoryInfo[]) {
    super(
      vscode.l10n.t("treeNode.localGroup.label"),
      vscode.TreeItemCollapsibleState.Expanded,
    );

    this.id = "no-remote-group";
    this.iconPath = new vscode.ThemeIcon("folder");
    this.contextValue = "noRemoteGroup";
    this.resourceUri = vscode.Uri.parse(`git-repositories:local-group`);
  }
}

export class RepositoryNode extends vscode.TreeItem {
  constructor(
    public readonly repository: RepositoryInfo,
    currentWorkspacePath?: string,
  ) {
    const hasWorktrees = repository.worktrees.length > 1;
    const isCurrentlyOpen =
      currentWorkspacePath &&
      (currentWorkspacePath === repository.path ||
        repository.worktrees.some((wt) => wt.path === currentWorkspacePath));

    super(
      repository.name,
      hasWorktrees
        ? isCurrentlyOpen
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    this.id = `repo:${repository.path}`;
    this.iconPath = new vscode.ThemeIcon(
      isCurrentlyOpen ? "repo-selected" : "repo",
    );
    this.contextValue = "repository";
    this.tooltip = this.createTooltip();
    this.description = repository.currentBranch || "";
    this.resourceUri = vscode.Uri.file(repository.path);
    this.command = {
      command: "git-repositories.openRepository",
      title: vscode.l10n.t("command.openRepository"),
      arguments: [repository.path],
    };
  }

  private createTooltip(): string {
    const lines = [
      this.repository.name,
      `${vscode.l10n.t("treeNode.tooltip.path")}: ${this.repository.path}`,
      `${vscode.l10n.t("treeNode.tooltip.branch")}: ${this.repository.currentBranch || vscode.l10n.t("treeNode.branch.unknown")}`,
    ];

    if (this.repository.remotes.length > 0) {
      lines.push(
        `${vscode.l10n.t("treeNode.tooltip.remote")}: ${this.repository.remotes[0].fetchUrl || ""}`,
      );
    }

    return lines.join("\n");
  }
}

export class WorktreeNode extends vscode.TreeItem {
  constructor(
    public readonly worktree: WorktreeInfo,
    currentWorkspacePath?: string,
  ) {
    const isCurrentlyOpen = currentWorkspacePath === worktree.path;

    super(worktree.name, vscode.TreeItemCollapsibleState.None);

    this.id = `worktree:${worktree.path}`;

    if (isCurrentlyOpen) {
      this.iconPath = new vscode.ThemeIcon("git-branch");
    } else {
      this.iconPath = new vscode.ThemeIcon("worktree");
    }

    this.contextValue = worktree.isMain ? "mainWorktree" : "worktree";
    this.tooltip = `${worktree.path}\n${vscode.l10n.t("treeNode.tooltip.branch")}: ${worktree.branch || vscode.l10n.t("worktree.detached")}`;
    this.description = this.createDescription();
    this.command = {
      command: "git-repositories.openWorktree",
      title: vscode.l10n.t("command.openWorktree"),
      arguments: [worktree.path],
    };
  }

  private createDescription(): string {
    if (this.worktree.branch) {
      return this.worktree.branch;
    } else if (this.worktree.isDetached) {
      return vscode.l10n.t("worktree.detached");
    }

    return "";
  }
}

export type RepositoryTreeNode =
  | EmptyStateNode
  | DomainNode
  | OwnerNode
  | LocalGroupNode
  | RepositoryNode
  | WorktreeNode;
