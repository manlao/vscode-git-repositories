import * as vscode from "vscode";

export class RepositoryDecorationProvider
  implements vscode.FileDecorationProvider
{
  private _onDidChangeFileDecorations = new vscode.EventEmitter<
    vscode.Uri | vscode.Uri[] | undefined
  >();
  readonly onDidChangeFileDecorations = this._onDidChangeFileDecorations.event;

  private decorations = new Map<string, vscode.FileDecoration>();

  provideFileDecoration(
    uri: vscode.Uri,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    if (uri.scheme !== "git-repositories") {
      return undefined;
    }

    return this.decorations.get(uri.toString());
  }

  setCount(id: string, count: number): void {
    const uri = vscode.Uri.parse(`git-repositories:${id}`);
    const decoration = new vscode.FileDecoration(
      count.toString(),
      `${count} repositories`,
    );

    this.decorations.set(uri.toString(), decoration);
    this._onDidChangeFileDecorations.fire(uri);
  }

  clearCount(id: string): void {
    const uri = vscode.Uri.parse(`git-repositories:${id}`);

    this.decorations.delete(uri.toString());
    this._onDidChangeFileDecorations.fire(uri);
  }

  clear(): void {
    this.decorations.clear();
    this._onDidChangeFileDecorations.fire(undefined);
  }

  dispose(): void {
    this._onDidChangeFileDecorations.dispose();
  }
}
