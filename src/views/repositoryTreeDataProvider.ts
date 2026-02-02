import * as vscode from "vscode";
import { RepositoryStorage } from "../storage/repositoryStorage";
import { RepositoryInfo } from "../scanner/repositoryScanner";
import {
  RepositoryTreeNode,
  DomainNode,
  OwnerNode,
  RepositoryNode,
  WorktreeNode,
  EmptyStateNode,
  LocalGroupNode,
} from "./treeNodes";
import { RepositoryDecorationProvider } from "./repositoryDecorationProvider";
import { getShowRepositoryCount } from "../config";

/**
 * TreeDataProvider for displaying Git repositories in a tree structure.
 * Displays repositories grouped by domain and owner hierarchy.
 */
export class RepositoryTreeDataProvider
  implements vscode.TreeDataProvider<RepositoryTreeNode>, vscode.Disposable
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    RepositoryTreeNode | undefined | null | void
  > = new vscode.EventEmitter<RepositoryTreeNode | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    RepositoryTreeNode | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private disposables: vscode.Disposable[] = [];
  private repositories: RepositoryInfo[] = [];
  private currentWorkspacePath: string | undefined;
  private decorationProvider: RepositoryDecorationProvider;

  constructor(
    private storage: RepositoryStorage,
    decorationProvider: RepositoryDecorationProvider,
  ) {
    this.decorationProvider = decorationProvider;

    const subscription = this.storage.onDidChangeRepositories(() => {
      this.loadRepositories();
    });

    this.disposables.push(subscription);

    this.updateCurrentWorkspace();

    const workspaceSubscription = vscode.workspace.onDidChangeWorkspaceFolders(
      () => {
        this.updateCurrentWorkspace();
        this.refresh();
      },
    );

    this.disposables.push(workspaceSubscription);

    this.loadRepositories();
  }

  private updateCurrentWorkspace(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
      this.currentWorkspacePath = workspaceFolders[0].uri.fsPath;
    } else {
      this.currentWorkspacePath = undefined;
    }
  }

  getCurrentWorkspacePath(): string | undefined {
    return this.currentWorkspacePath;
  }

  /**
   * Load repositories from storage and refresh the tree view.
   */
  private async loadRepositories(): Promise<void> {
    this.repositories = await this.storage.getRepositories();
    this.refresh();
  }

  /**
   * Trigger a refresh of the tree view.
   */
  refresh(): void {
    // Clear decorations if the setting is disabled
    if (!getShowRepositoryCount()) {
      this.decorationProvider.clear();
    }

    this._onDidChangeTreeData.fire();
  }

  /**
   * Get the TreeItem representation of an element.
   */
  getTreeItem(element: RepositoryTreeNode): vscode.TreeItem {
    return element;
  }

  /**
   * Get the children of an element.
   */
  getChildren(
    element?: RepositoryTreeNode,
  ): vscode.ProviderResult<RepositoryTreeNode[]> {
    if (!element) {
      return this.getRemoteViewRootNodes();
    }

    if (element instanceof EmptyStateNode) {
      return [];
    }

    if (element instanceof DomainNode) {
      return this.getOwnerNodes(element.domain, element.repositories);
    }

    if (element instanceof OwnerNode) {
      return element.getChildren(this.currentWorkspacePath);
    }

    if (element instanceof LocalGroupNode) {
      return element.repositories.map(
        (repo) => new RepositoryNode(repo, this.currentWorkspacePath),
      );
    }

    if (element instanceof RepositoryNode) {
      if (element.repository.worktrees.length > 1) {
        const sortedWorktrees = [...element.repository.worktrees]
          .filter((worktree) => !worktree.isMain)
          .sort((a, b) => a.name.localeCompare(b.name));
        return sortedWorktrees.map(
          (worktree) => new WorktreeNode(worktree, this.currentWorkspacePath),
        );
      }
      return [];
    }

    return [];
  }

  private getRemoteViewRootNodes(): RepositoryTreeNode[] {
    if (this.repositories.length === 0) {
      return [new EmptyStateNode()];
    }

    const reposWithRemote: RepositoryInfo[] = [];
    const reposWithoutRemote: RepositoryInfo[] = [];

    for (const repo of this.repositories) {
      if (repo.remotes.length > 0 && repo.remotes[0].fetchUrl) {
        reposWithRemote.push(repo);
      } else {
        reposWithoutRemote.push(repo);
      }
    }

    const domainMap = new Map<string, RepositoryInfo[]>();

    for (const repo of reposWithRemote) {
      const domain = this.extractDomain(repo.remotes[0].fetchUrl!);
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(repo);
    }

    const nodes: RepositoryTreeNode[] = [];

    for (const [domain, repos] of domainMap.entries()) {
      const domainNode = new DomainNode(
        domain,
        repos,
        this.currentWorkspacePath,
      );

      if (getShowRepositoryCount()) {
        this.decorationProvider.setCount(`domain:${domain}`, repos.length);
      }

      nodes.push(domainNode);
    }

    if (reposWithoutRemote.length > 0) {
      const localNode = new LocalGroupNode(reposWithoutRemote);

      if (getShowRepositoryCount()) {
        this.decorationProvider.setCount(
          `local-group`,
          reposWithoutRemote.length,
        );
      }

      nodes.push(localNode);
    }

    return nodes;
  }

  private getOwnerNodes(
    domain: string,
    repositories: RepositoryInfo[],
  ): RepositoryTreeNode[] {
    const root = new OwnerNode("", "", [], domain, this.currentWorkspacePath);

    for (const repo of repositories) {
      if (repo.remotes.length === 0 || !repo.remotes[0].fetchUrl) {
        continue;
      }

      const ownerPath = this.extractOwner(repo.remotes[0].fetchUrl);
      const segments = ownerPath.split("/").filter((s) => s.length > 0);

      if (segments.length === 0) {
        continue;
      }

      let currentNode = root;
      let fullPath = "";

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        fullPath = fullPath ? `${fullPath}/${segment}` : segment;

        let childNode = currentNode.children.get(segment);

        if (!childNode || !(childNode instanceof OwnerNode)) {
          const newOwnerNode = new OwnerNode(
            segment,
            fullPath,
            [],
            domain,
            this.currentWorkspacePath,
          );

          currentNode.addChild(segment, newOwnerNode);
          childNode = newOwnerNode;
        }

        currentNode = childNode as OwnerNode;
      }

      currentNode.repositories.push(repo);
    }

    const updateDescriptions = (node: OwnerNode): number => {
      let totalRepos = node.repositories.length;

      for (const child of node.children.values()) {
        if (child instanceof OwnerNode) {
          totalRepos += updateDescriptions(child);
        }
      }

      if (totalRepos > 0) {
        const ownerKey = `owner:${domain || "local"}:${node.fullPath}`;

        if (getShowRepositoryCount()) {
          this.decorationProvider.setCount(ownerKey, totalRepos);
        }
      }

      return totalRepos;
    };

    updateDescriptions(root);

    root.updateExpansionState(this.currentWorkspacePath);

    return root.getChildren(this.currentWorkspacePath);
  }

  private extractDomain(remoteUrl: string): string {
    const sshMatch = remoteUrl.match(/^(?:git@|ssh:\/\/(?:git@)?)([^:\/]+)/);

    if (sshMatch) {
      return sshMatch[1];
    }

    const httpsMatch = remoteUrl.match(/^https?:\/\/([^\/]+)/);

    if (httpsMatch) {
      return httpsMatch[1];
    }

    return "unknown";
  }

  private extractOwner(remoteUrl: string): string {
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

    if (!pathPart) {
      return "unknown";
    }

    const segments = pathPart.split("/").filter((s) => s.length > 0);

    if (segments.length === 0) {
      return "unknown";
    }

    if (segments.length === 1) {
      return segments[0];
    }

    return segments.slice(0, -1).join("/");
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
