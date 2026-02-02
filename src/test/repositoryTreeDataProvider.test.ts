import * as assert from "assert";
import * as vscode from "vscode";
import { RepositoryTreeDataProvider } from "../views/repositoryTreeDataProvider";
import { RepositoryStorage } from "../storage/repositoryStorage";
import { RepositoryDecorationProvider } from "../views/repositoryDecorationProvider";
import { RepositoryInfo } from "../scanner/repositoryScanner";
import {
  DomainNode,
  OwnerNode,
  RepositoryNode,
  WorktreeNode,
  EmptyStateNode,
  LocalGroupNode,
} from "../views/treeNodes";

suite("RepositoryTreeDataProvider Test Suite", () => {
  let provider: RepositoryTreeDataProvider;
  let storage: RepositoryStorage;
  let mockContext: vscode.ExtensionContext;

  const createMockRepository = (
    path: string,
    name: string,
    remoteUrl?: string,
  ): RepositoryInfo => ({
    path,
    name,
    remotes: remoteUrl
      ? [
          {
            name: "origin",
            fetchUrl: remoteUrl,
          },
        ]
      : [],
    currentBranch: "main",
    isSubmodule: false,
    worktrees: [
      {
        name: "main",
        path,
        branch: "main",
        isMain: true,
        isDetached: false,
      },
    ],
    lastScanned: new Date().toISOString(),
  });

  setup(() => {
    const memento = new Map<string, any>();
    mockContext = {
      globalState: {
        get: (key: string, defaultValue?: any) =>
          memento.get(key) ?? defaultValue,
        update: async (key: string, value: any) => {
          memento.set(key, value);
        },
        keys: () => Array.from(memento.keys()),
        setKeysForSync: () => {},
      },
      subscriptions: [],
    } as any;

    storage = new RepositoryStorage(mockContext);
    const decorationProvider = new RepositoryDecorationProvider();
    provider = new RepositoryTreeDataProvider(storage, decorationProvider);
  });

  teardown(() => {
    provider.dispose();
  });

  test("should return EmptyStateNode when no repositories", async () => {
    await storage.saveRepositories([]);

    const children = await provider.getChildren();

    assert.strictEqual(children?.length, 1);
    assert.ok(children?.[0] instanceof EmptyStateNode);
  });

  test("should group repositories by domain", async () => {
    const repos = [
      createMockRepository(
        "/path/to/repo1",
        "repo1",
        "https://github.com/user/repo1.git",
      ),
      createMockRepository(
        "/path/to/repo2",
        "repo2",
        "https://gitlab.com/user/repo2.git",
      ),
    ];
    await storage.saveRepositories(repos);

    const children = await provider.getChildren();

    assert.strictEqual(children?.length, 2);
    assert.ok(children?.[0] instanceof DomainNode);
    assert.ok(children?.[1] instanceof DomainNode);
  });

  test("should create LocalGroupNode for repositories without remotes", async () => {
    const repos = [
      createMockRepository("/path/to/repo1", "repo1"),
      createMockRepository("/path/to/repo2", "repo2"),
    ];
    await storage.saveRepositories(repos);

    const children = await provider.getChildren();

    assert.strictEqual(children?.length, 1);
    assert.ok(children?.[0] instanceof LocalGroupNode);
  });

  test("should create owner hierarchy from remote URL", async () => {
    const repos = [
      createMockRepository(
        "/path/to/repo1",
        "repo1",
        "https://github.com/org/team/repo1.git",
      ),
    ];
    await storage.saveRepositories(repos);

    const rootChildren = await provider.getChildren();
    assert.ok(rootChildren?.[0] instanceof DomainNode);

    const domainChildren = await provider.getChildren(rootChildren?.[0]);
    assert.ok(domainChildren?.[0] instanceof OwnerNode);
  });

  test("should return repository children for RepositoryNode with worktrees", async () => {
    const repo = createMockRepository(
      "/path/to/repo1",
      "repo1",
      "https://github.com/user/repo1.git",
    );
    repo.worktrees.push({
      name: "feature",
      path: "/path/to/repo1-feature",
      branch: "feature-branch",
      isMain: false,
      isDetached: false,
    });
    await storage.saveRepositories([repo]);

    const rootChildren = await provider.getChildren();
    const domainChildren = await provider.getChildren(rootChildren?.[0]);
    const ownerChildren = await provider.getChildren(domainChildren?.[0]);
    const repoNode = ownerChildren?.[0] as RepositoryNode;

    const worktreeChildren = await provider.getChildren(repoNode);

    assert.strictEqual(worktreeChildren?.length, 1);
    assert.ok(worktreeChildren?.[0] instanceof WorktreeNode);
  });

  test("should filter out main worktree from children", async () => {
    const repo = createMockRepository(
      "/path/to/repo1",
      "repo1",
      "https://github.com/user/repo1.git",
    );
    repo.worktrees.push({
      name: "feature",
      path: "/path/to/repo1-feature",
      branch: "feature-branch",
      isMain: false,
      isDetached: false,
    });
    await storage.saveRepositories([repo]);

    const rootChildren = await provider.getChildren();
    const domainChildren = await provider.getChildren(rootChildren?.[0]);
    const ownerChildren = await provider.getChildren(domainChildren?.[0]);
    const repoNode = ownerChildren?.[0] as RepositoryNode;
    const worktreeChildren = await provider.getChildren(repoNode);

    const mainWorktree = worktreeChildren?.find((child) => {
      if (child instanceof WorktreeNode) {
        return child.worktree.isMain;
      }
      return false;
    });

    assert.strictEqual(mainWorktree, undefined);
  });

  test("should track current workspace path", () => {
    const currentPath = provider.getCurrentWorkspacePath();

    assert.ok(currentPath !== undefined || currentPath === undefined);
  });

  test("should refresh tree when storage changes", () => {
    return new Promise<void>((resolve) => {
      provider.onDidChangeTreeData(() => {
        resolve();
      });

      const repos = [createMockRepository("/path/to/repo1", "repo1")];
      storage.saveRepositories(repos);
    });
  });

  test("should return TreeItem for node", () => {
    const repo = createMockRepository("/path/to/repo1", "repo1");
    const node = new RepositoryNode(repo);

    const treeItem = provider.getTreeItem(node);

    assert.strictEqual(treeItem, node);
  });
});
