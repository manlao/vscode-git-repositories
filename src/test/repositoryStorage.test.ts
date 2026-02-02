import * as assert from "assert";
import * as vscode from "vscode";
import { RepositoryStorage } from "../storage/repositoryStorage";
import { RepositoryInfo } from "../scanner/repositoryScanner";

suite("RepositoryStorage Test Suite", () => {
  let storage: RepositoryStorage;
  let mockContext: vscode.ExtensionContext;

  const createMockRepository = (
    path: string,
    name: string,
  ): RepositoryInfo => ({
    path,
    name,
    remotes: [],
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
    } as any;

    storage = new RepositoryStorage(mockContext);
  });

  test("should return empty array when no repositories stored", async () => {
    const repos = await storage.getRepositories();
    assert.strictEqual(repos.length, 0);
  });

  test("should save and retrieve repositories", async () => {
    const repos = [
      createMockRepository("/path/to/repo1", "repo1"),
      createMockRepository("/path/to/repo2", "repo2"),
    ];

    await storage.saveRepositories(repos);
    const retrieved = await storage.getRepositories();

    assert.strictEqual(retrieved.length, 2);
    assert.strictEqual(retrieved[0].name, "repo1");
    assert.strictEqual(retrieved[1].name, "repo2");
  });

  test("should add new repository", async () => {
    const repo1 = createMockRepository("/path/to/repo1", "repo1");
    const repo2 = createMockRepository("/path/to/repo2", "repo2");

    await storage.addRepository(repo1);
    await storage.addRepository(repo2);

    const repos = await storage.getRepositories();
    assert.strictEqual(repos.length, 2);
  });

  test("should update existing repository when adding with same path", async () => {
    const repo1 = createMockRepository("/path/to/repo1", "repo1");
    await storage.addRepository(repo1);

    const repo1Updated = createMockRepository(
      "/path/to/repo1",
      "repo1-updated",
    );
    await storage.addRepository(repo1Updated);

    const repos = await storage.getRepositories();
    assert.strictEqual(repos.length, 1);
    assert.strictEqual(repos[0].name, "repo1-updated");
  });

  test("should remove repository by path", async () => {
    const repos = [
      createMockRepository("/path/to/repo1", "repo1"),
      createMockRepository("/path/to/repo2", "repo2"),
      createMockRepository("/path/to/repo3", "repo3"),
    ];
    await storage.saveRepositories(repos);

    await storage.removeRepository("/path/to/repo2");

    const remaining = await storage.getRepositories();
    assert.strictEqual(remaining.length, 2);
    assert.strictEqual(remaining[0].name, "repo1");
    assert.strictEqual(remaining[1].name, "repo3");
  });

  test("should clear all repositories", async () => {
    const repos = [
      createMockRepository("/path/to/repo1", "repo1"),
      createMockRepository("/path/to/repo2", "repo2"),
    ];
    await storage.saveRepositories(repos);

    await storage.clear();

    const remaining = await storage.getRepositories();
    assert.strictEqual(remaining.length, 0);
  });

  test("should fire event when repositories change", async () => {
    let eventFired = false;
    let receivedRepos: RepositoryInfo[] = [];

    const disposable = storage.onDidChangeRepositories((repos) => {
      eventFired = true;
      receivedRepos = repos;
    });

    const repos = [createMockRepository("/path/to/repo1", "repo1")];
    await storage.saveRepositories(repos);

    assert.strictEqual(eventFired, true);
    assert.strictEqual(receivedRepos.length, 1);
    assert.strictEqual(receivedRepos[0].name, "repo1");

    disposable.dispose();
  });
});
