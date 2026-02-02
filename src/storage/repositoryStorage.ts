import * as vscode from "vscode";
import { RepositoryInfo } from "../scanner/repositoryScanner";

export class RepositoryStorage {
  private static readonly STORAGE_KEY =
    "git-repositories.discoveredRepositories";
  private _onDidChangeRepositories = new vscode.EventEmitter<
    RepositoryInfo[]
  >();
  public readonly onDidChangeRepositories: vscode.Event<RepositoryInfo[]> =
    this._onDidChangeRepositories.event;

  constructor(private context: vscode.ExtensionContext) {}

  async saveRepositories(repos: RepositoryInfo[]): Promise<void> {
    await this.context.globalState.update(RepositoryStorage.STORAGE_KEY, repos);

    this._onDidChangeRepositories.fire(repos);
  }

  async getRepositories(): Promise<RepositoryInfo[]> {
    return this.context.globalState.get<RepositoryInfo[]>(
      RepositoryStorage.STORAGE_KEY,
      [],
    );
  }

  async addRepository(repo: RepositoryInfo): Promise<void> {
    const repos = await this.getRepositories();
    const existingIndex = repos.findIndex((r) => r.path === repo.path);

    if (existingIndex >= 0) {
      repos[existingIndex] = repo;
    } else {
      repos.push(repo);
    }

    await this.saveRepositories(repos);
  }

  async removeRepository(path: string): Promise<void> {
    const repos = await this.getRepositories();
    const filtered = repos.filter((r) => r.path !== path);

    await this.saveRepositories(filtered);
  }

  async clear(): Promise<void> {
    await this.saveRepositories([]);
  }
}
