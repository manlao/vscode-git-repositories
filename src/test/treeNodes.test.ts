import * as assert from "assert";
import * as vscode from "vscode";
import {
  DomainNode,
  OwnerNode,
  RepositoryNode,
  WorktreeNode,
  EmptyStateNode,
  LocalGroupNode,
} from "../views/treeNodes";
import { RepositoryInfo, WorktreeInfo } from "../scanner/repositoryScanner";

suite("TreeNodes Test Suite", () => {
  const createMockRepository = (
    path: string,
    name: string,
    worktreeCount: number = 1,
  ): RepositoryInfo => {
    const worktrees: WorktreeInfo[] = [];

    worktrees.push({
      name: "main",
      path: path,
      branch: "main",
      isMain: true,
      isDetached: false,
    });

    for (let i = 1; i < worktreeCount; i++) {
      worktrees.push({
        name: `worktree-${i}`,
        path: `${path}-worktree-${i}`,
        branch: `feature-${i}`,
        isMain: false,
        isDetached: false,
      });
    }

    return {
      path,
      name,
      remotes: [
        {
          name: "origin",
          fetchUrl: "https://github.com/user/repo.git",
        },
      ],
      currentBranch: "main",
      isSubmodule: false,
      worktrees,
      lastScanned: new Date().toISOString(),
    };
  };

  suite("EmptyStateNode", () => {
    test("should create node with correct properties", () => {
      const node = new EmptyStateNode();

      assert.strictEqual(node.label, "treeNode.emptyState.label");
      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.None,
      );
      assert.strictEqual(node.contextValue, "emptyState");
      assert.ok(node.command);
      assert.strictEqual(node.command.command, "workbench.action.openSettings");
    });
  });

  suite("DomainNode", () => {
    test("should create collapsed node when no current workspace", () => {
      const repos = [createMockRepository("/path/to/repo1", "repo1")];
      const node = new DomainNode("github.com", repos);

      assert.strictEqual(node.label, "github.com");
      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      assert.ok(node.resourceUri);
      assert.strictEqual(node.resourceUri.scheme, "git-repositories");
    });

    test("should create expanded node when contains current workspace", () => {
      const repos = [createMockRepository("/path/to/repo1", "repo1")];
      const node = new DomainNode("github.com", repos, "/path/to/repo1");

      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Expanded,
      );
    });

    test("should expand when worktree matches current workspace", () => {
      const repos = [createMockRepository("/path/to/repo1", "repo1", 2)];
      const node = new DomainNode(
        "github.com",
        repos,
        "/path/to/repo1-worktree-1",
      );

      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Expanded,
      );
    });
  });

  suite("OwnerNode", () => {
    test("should create collapsed node when no current workspace", () => {
      const repos = [createMockRepository("/path/to/repo1", "repo1")];
      const node = new OwnerNode("owner", "owner", repos, "github.com");

      assert.strictEqual(node.label, "owner");
      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      assert.strictEqual(node.contextValue, "owner");
    });

    test("should update expansion state when contains current workspace", () => {
      const repos = [createMockRepository("/path/to/repo1", "repo1")];
      const node = new OwnerNode("owner", "owner", repos, "github.com");

      node.updateExpansionState("/path/to/repo1");

      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Expanded,
      );
    });

    test("should handle nested owner hierarchy", () => {
      const repos = [createMockRepository("/path/to/repo1", "repo1")];
      const parent = new OwnerNode("org", "org", [], "github.com");
      const child = new OwnerNode(
        "subteam",
        "org/subteam",
        repos,
        "github.com",
      );

      parent.addChild("subteam", child);
      parent.updateExpansionState("/path/to/repo1");

      assert.strictEqual(
        parent.collapsibleState,
        vscode.TreeItemCollapsibleState.Expanded,
      );
    });
  });

  suite("RepositoryNode", () => {
    test("should create node without worktrees", () => {
      const repo = createMockRepository("/path/to/repo1", "repo1", 1);
      const node = new RepositoryNode(repo);

      assert.strictEqual(node.label, "repo1");
      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.None,
      );
      assert.strictEqual(node.contextValue, "repository");
    });

    test("should create collapsed node with worktrees when not current workspace", () => {
      const repo = createMockRepository("/path/to/repo1", "repo1", 3);
      const node = new RepositoryNode(repo);

      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });

    test("should create expanded node with worktrees when is current workspace", () => {
      const repo = createMockRepository("/path/to/repo1", "repo1", 3);
      const node = new RepositoryNode(repo, "/path/to/repo1");

      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Expanded,
      );
    });

    test("should use repo-selected icon when current workspace matches", () => {
      const repo = createMockRepository("/path/to/repo1", "repo1");
      const node = new RepositoryNode(repo, "/path/to/repo1");

      assert.ok(node.iconPath);
      const icon = node.iconPath as vscode.ThemeIcon;
      assert.strictEqual(icon.id, "repo-selected");
      assert.strictEqual(node.contextValue, "repositoryOpen");
    });

    test("should use repo icon when current workspace does not match", () => {
      const repo = createMockRepository("/path/to/repo1", "repo1");
      const node = new RepositoryNode(repo, "/other/path");

      assert.ok(node.iconPath);
      const icon = node.iconPath as vscode.ThemeIcon;
      assert.strictEqual(icon.id, "repo");
      assert.strictEqual(node.contextValue, "repository");
    });
  });

  suite("WorktreeNode", () => {
    test("should create node with branch description", () => {
      const worktree: WorktreeInfo = {
        name: "feature",
        path: "/path/to/worktree",
        branch: "feature-branch",
        isMain: false,
        isDetached: false,
      };
      const node = new WorktreeNode(worktree);

      assert.strictEqual(node.label, "feature");
      assert.strictEqual(node.description, "feature-branch");
      assert.strictEqual(node.contextValue, "worktree");
    });

    test("should show detached when HEAD is detached", () => {
      const worktree: WorktreeInfo = {
        name: "detached-wt",
        path: "/path/to/worktree",
        isMain: false,
        isDetached: true,
      };
      const node = new WorktreeNode(worktree);

      assert.strictEqual(node.description, "worktree.detached");
    });

    test("should use git-branch icon when current workspace matches", () => {
      const worktree: WorktreeInfo = {
        name: "feature",
        path: "/path/to/worktree",
        branch: "feature-branch",
        isMain: false,
        isDetached: false,
      };
      const node = new WorktreeNode(worktree, "/path/to/worktree");

      assert.ok(node.iconPath);
      const icon = node.iconPath as vscode.ThemeIcon;
      assert.strictEqual(node.contextValue, "worktreeOpen");
      assert.strictEqual(icon.id, "git-branch");
    });

    test("should use worktree icon when current workspace does not match", () => {
      const worktree: WorktreeInfo = {
        name: "feature",
        path: "/path/to/worktree",
        branch: "feature-branch",
        isMain: false,
        isDetached: false,
      };
      const node = new WorktreeNode(worktree, "/other/path");

      assert.ok(node.iconPath);
      const icon = node.iconPath as vscode.ThemeIcon;
      assert.strictEqual(icon.id, "worktree");
      assert.strictEqual(node.contextValue, "worktree");
    });
  });

  suite("LocalGroupNode", () => {
    test("should create node with repository count", () => {
      const repos = [
        createMockRepository("/path/to/repo1", "repo1"),
        createMockRepository("/path/to/repo2", "repo2"),
      ];
      const node = new LocalGroupNode(repos);

      assert.strictEqual(node.label, "treeNode.localGroup.label");
      assert.ok(node.resourceUri);
      assert.strictEqual(node.resourceUri.scheme, "git-repositories");
      assert.strictEqual(
        node.collapsibleState,
        vscode.TreeItemCollapsibleState.Expanded,
      );
    });
  });

  suite("ContextValue for Current Workspace", () => {
    test("RepositoryNode should have different contextValue based on workspace match", () => {
      const repo = createMockRepository("/path/to/repo", "test-repo");

      const closedNode = new RepositoryNode(repo, "/different/path");
      assert.strictEqual(closedNode.contextValue, "repository");

      const openNode = new RepositoryNode(repo, "/path/to/repo");
      assert.strictEqual(openNode.contextValue, "repositoryOpen");
    });

    test("WorktreeNode should have different contextValue based on workspace match", () => {
      const worktree: WorktreeInfo = {
        name: "feature",
        path: "/path/to/worktree",
        branch: "feature-branch",
        isMain: false,
        isDetached: false,
      };

      const closedNode = new WorktreeNode(worktree, "/different/path");
      assert.strictEqual(closedNode.contextValue, "worktree");

      const openNode = new WorktreeNode(worktree, "/path/to/worktree");
      assert.strictEqual(openNode.contextValue, "worktreeOpen");
    });

    test("Main worktree should have correct contextValue based on workspace match", () => {
      const mainWorktree: WorktreeInfo = {
        name: "main",
        path: "/path/to/main",
        branch: "main",
        isMain: true,
        isDetached: false,
      };

      const closedNode = new WorktreeNode(mainWorktree, "/different/path");
      assert.strictEqual(closedNode.contextValue, "mainWorktree");

      const openNode = new WorktreeNode(mainWorktree, "/path/to/main");
      assert.strictEqual(openNode.contextValue, "mainWorktreeOpen");
    });
  });
});
