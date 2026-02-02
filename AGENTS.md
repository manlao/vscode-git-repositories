# AGENTS.md - Git Repositories VSCode Extension

## Project Overview

This is a production-ready VSCode extension for Git repository management with support for worktrees, remote grouping, and workspace tracking. The extension provides a tree view that automatically organizes repositories by remote domain and owner hierarchy, with automatic expansion when the current workspace matches a repository or worktree.

**Key Features:**

- Recursive scanning of configured paths for Git repositories
- Tree view organized by remote domain and owner hierarchy
- Support for Git worktrees with detailed branch/commit information
- Automatic expansion of tree nodes containing the current workspace
- Visual indicators (icons) showing currently open repositories/worktrees
- Quick picker (Cmd/Ctrl+Alt+P) for fast repository/worktree navigation
- Environment variable expansion in configuration paths (~, $HOME, etc.)
- Glob pattern-based ignore paths for excluding directories

**Tech Stack:**

- TypeScript with strict mode enabled
- ESBuild for fast bundling
- simple-git for Git operations
- minimatch for glob pattern matching
- VSCode Extension API
- Mocha test framework with @vscode/test-cli

---

## Build, Lint, and Test Commands

### Development Commands

```bash
# Check types without emitting files
npm run check-types

# Lint the source code
npm run lint

# Compile the extension (type-check + lint + build)
npm run compile

# Watch mode - runs esbuild and tsc in parallel
npm run watch

# Package for production (type-check + lint + production build)
npm run package
```

### Testing Commands

```bash
# Run all tests
npm test

# Compile tests to out/ directory
npm run compile-tests

# Watch tests (recompile on changes)
npm run watch-tests

# Run a single test file
# First compile tests, then use vscode-test with specific file
npm run compile-tests
npx vscode-test --testFile=out/test/extension.test.js

# Full pre-test setup (compile tests + compile extension + lint)
npm run pretest
```

### Test File Location

- Test files: `src/test/**/*.test.ts`
- Compiled tests: `out/test/**/*.test.js`
- Test configuration: `.vscode-test.mjs`
- **Total Tests**: 45 tests across 6 test suites (as of the latest implementation)

**Test Suites:**

1. `extension.test.ts` - Main extension tests (2 tests)
2. `config.test.ts` - Configuration module tests (4 tests)
3. `treeNodes.test.ts` - Tree node component tests (17 tests)
4. `repositoryStorage.test.ts` - Storage layer tests (7 tests)
5. `repositoryTreeDataProvider.test.ts` - Tree provider tests (9 tests)
6. `integration.test.ts` - Extension integration tests (6 tests)

---

## Architecture Overview

### Component Structure

The extension follows a layered architecture:

```txt
┌─────────────────────────────────────────┐
│  VSCode Extension Host (extension.ts)   │
│  - Command registration                 │
│  - Lifecycle management                 │
└─────────────┬───────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
┌──────▼─────┐  ┌───▼────────────────────┐
│  Scanner   │  │  Storage               │
│  (simple-  │  │  (ExtensionContext     │
│   git)     │  │   globalState)         │
└──────┬─────┘  └───┬────────────────────┘
       │            │
       │      ┌─────▼──────────┐
       │      │  TreeProvider  │
       └─────►│  (Workspace    │
              │   tracking)    │
              └────┬───────────┘
                   │
         ┌─────────┴──────────┐
         │    Tree Nodes      │
         │  - DomainNode      │
         │  - OwnerNode       │
         │  - RepositoryNode  │
         │  - WorktreeNode    │
         └────────────────────┘
```

### Tree View Hierarchy

The extension displays repositories in a hierarchical tree structure:

```txt
github.com (DomainNode - domain grouping)
├─ owner1 (OwnerNode - organization/user)
│  ├─ owner1/nested (OwnerNode - nested path support)
│  │  └─ repo-name (RepositoryNode - main worktree)
│  │     ├─ feature-branch (WorktreeNode - secondary worktree)
│  │     └─ bugfix-branch (WorktreeNode - secondary worktree)
│  └─ simple-repo (RepositoryNode - single worktree)
├─ owner2 (OwnerNode)
│  └─ another-repo (RepositoryNode)
└─ ...
gitlab.com (DomainNode)
└─ ...
No Remote (LocalGroupNode - repositories without remotes)
└─ local-repo (RepositoryNode)
```

**Tree Node Types:**

1. **EmptyStateNode** - Shown when no repository paths are configured
2. **DomainNode** - Groups repositories by remote domain (github.com, gitlab.com, etc.)
3. **OwnerNode** - Hierarchical organization by owner/path (supports nested paths like org/team/project)
4. **LocalGroupNode** - Groups repositories without remotes
5. **RepositoryNode** - Represents a Git repository (main worktree)
6. **WorktreeNode** - Represents a secondary Git worktree

### Workspace Tracking & Auto-Expansion

The extension automatically expands tree nodes when they contain the currently open workspace:

- **Detection**: Tracks `vscode.workspace.workspaceFolders[0].uri.fsPath`
- **Icon Indicators**:
  - `repo-selected` icon for currently open repository
  - `git-branch` icon for currently open worktree
  - Default `repo` and `worktree` icons otherwise
- **Auto-Expand**: All parent nodes (Domain → Owner → Repository) automatically expand when they contain the current workspace
- **Real-time Updates**: Tree refreshes when workspace folders change

**Implementation Details:**

- `containsCurrentWorkspace()` helper function checks if repository/worktree matches current workspace
- `OwnerNode.updateExpansionState()` recursively expands parent nodes
- `RepositoryNode` and `WorktreeNode` use different icons based on workspace match

---

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2022
- **Module**: Node16
- **Strict mode**: Enabled (all strict type-checking options active)
- **Source maps**: Enabled for debugging
- **Root directory**: `src/`

### Import Conventions

```typescript
// ✅ CORRECT: Namespace imports for core dependencies
import * as vscode from 'vscode';
import * as assert from 'assert';

// When adding project-local files, use relative imports:
import * as utils from './utils';
import { GitRepository } from './models/GitRepository';
```

**Rules**:

- Use namespace imports (`import * as`) for external modules (vscode, node builtins)
- Use relative imports for local project files
- Import naming follows camelCase or PascalCase (enforced by ESLint)
- Place all imports at the top of the file

### ESLint Rules (eslint.config.mjs)

The project enforces these rules:

```javascript
// Naming convention for imports
"@typescript-eslint/naming-convention": ["warn", {
    selector: "import",
    format: ["camelCase", "PascalCase"]
}]

// Always use curly braces for control statements
"curly": "warn"

// Use === and !== instead of == and !=
"eqeqeq": "warn"

// Don't throw string literals, throw Error objects
"no-throw-literal": "warn"

// Require semicolons
"semi": "warn"
```

### Naming Conventions

- **Functions**: lowerCamelCase - `activate()`, `deactivate()`, `registerCommand()`
- **Variables**: lowerCamelCase - `const disposable = ...`
- **Constants**: lowerCamelCase (use UPPER_SNAKE_CASE only for true constants)
- **Classes**: PascalCase - `GitRepository`, `RepositoryManager`
- **Interfaces**: PascalCase - `IGitConfig`, `RepositoryOptions` (prefix with `I` optional)
- **Types**: PascalCase - `CommandCallback`, `ExtensionState`
- **Command IDs**: `git-repositories.commandName` (package-name.commandName format)

### Function Definitions

```typescript
// ✅ CORRECT: Extension lifecycle functions
export function activate(context: vscode.ExtensionContext) {
    // Synchronous activation logic
}

export function deactivate() {
    // Cleanup logic
}

// ✅ CORRECT: Async functions with explicit return types
export async function fetchRepositories(): Promise<GitRepository[]> {
    try {
        const repos = await gitApi.getRepos();
        return repos;
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch: ${error}`);
        throw error;
    }
}

// ✅ CORRECT: Arrow function callbacks
const disposable = vscode.commands.registerCommand('cmd', () => {
    vscode.window.showInformationMessage('Hello!');
});
```

### Error Handling

**Current state**: No error handling patterns exist yet in the minimal codebase.

**Recommended patterns** (adopt these as you add code):

```typescript
// ✅ CORRECT: Async/await with try-catch
async function doSomething() {
    try {
        const result = await someAsyncOperation();
        return result;
    } catch (error) {
        // Log to console for debugging
        console.error('Operation failed:', error);
        // Show user-friendly message
        vscode.window.showErrorMessage('Operation failed');
        // Re-throw if caller needs to handle
        throw error;
    }
}

// ✅ CORRECT: Error objects, not string literals
throw new Error('Repository not found');

// ❌ WRONG: Don't throw string literals
throw 'Repository not found';  // ESLint will warn
```

### Type Safety

```typescript
// ✅ CORRECT: Use explicit types from vscode SDK
function activate(context: vscode.ExtensionContext) {
    const disposable: vscode.Disposable = vscode.commands.registerCommand(...);
}

// ✅ CORRECT: Define interfaces for complex data
interface RepositoryConfig {
    path: string;
    remote: string;
    branch?: string;
}

// ❌ AVOID: Don't suppress type errors
// Never use: as any, @ts-ignore, @ts-expect-error
```

### Control Flow

```typescript
// ✅ CORRECT: Always use curly braces (enforced by ESLint)
if (condition) {
    doSomething();
}

// ❌ WRONG: Single-line without braces
if (condition) doSomething();  // ESLint will warn
```

### Semicolons

- **Required**: All statements must end with semicolons (enforced by ESLint)

---

## VSCode Extension Patterns

### Command Registration

```typescript
export function activate(context: vscode.ExtensionContext) {
    // Register command with proper disposal
    const disposable = vscode.commands.registerCommand(
        'git-repositories.commandName',
        async () => {
            // Command implementation
        }
    );

    // Add to subscriptions for automatic cleanup
    context.subscriptions.push(disposable);
}
```

### Extension Context

- Use `context.subscriptions.push()` for all disposables
- Store extension state in `context.globalState` or `context.workspaceState`
- Access extension path via `context.extensionPath`

---

## Testing Conventions

### Test Structure

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    // Optional: Display message at test start
    vscode.window.showInformationMessage('Start all tests.');

    test('descriptive test name', () => {
        assert.strictEqual(actual, expected);
    });

    test('async test', async () => {
        const result = await someAsyncFunction();
        assert.strictEqual(result, expectedValue);
    });
});
```

### Test Assertions

- Use `assert.strictEqual()` for equality checks (not `assert.equal()`)
- Use `assert.deepStrictEqual()` for object/array comparisons
- Organize tests in suites using `suite()` and `test()`

### Testing Patterns Used

**1. Mock Extension Context:**

```typescript
function createMockContext(): vscode.ExtensionContext {
    const storage = new Map<string, any>();
    return {
        globalState: {
            get: (key: string, defaultValue?: any) => storage.get(key) ?? defaultValue,
            update: async (key: string, value: any) => { storage.set(key, value); },
            keys: () => Array.from(storage.keys()),
        },
        subscriptions: [],
        // ... other context properties
    } as any;
}
```

**2. Promise-based Async Tests:**

```typescript
// ✅ CORRECT: Use Promise-based pattern
test('async test with event', async () => {
    const promise = new Promise<RepositoryInfo[]>((resolve) => {
        provider.onDidChangeRepositories((repos) => {
            resolve(repos);
        });
    });

    await storage.saveRepositories(testData);
    const result = await promise;
    assert.deepStrictEqual(result, testData);
});

// ❌ WRONG: Don't mix done callback with async
test('async test', async (done) => {  // Will fail: Resolution method is overspecified
    // ...
});
```

**3. Extension Activation in Tests:**

```typescript
// Get extension ID dynamically
const extensions = vscode.extensions.all;
const extension = extensions.find((ext) =>
    ext.id.includes('git-repositories')
);
assert.ok(extension, 'Extension should be installed');
```

---

## Dependencies

### Production Dependencies

- **@vscode/l10n** (^0.0.18) - VSCode localization library for runtime message translation
- **simple-git** (^3.30.0) - Git command execution and repository operations
- **minimatch** (^10.1.1) - Glob pattern matching for ignore paths

### Development Dependencies

- **@types/vscode** - TypeScript type definitions for VSCode API
- **@types/node** - Node.js type definitions
- **@types/mocha** - Mocha test framework types
- **@vscode/test-cli** - VSCode extension testing runner
- **@vscode/test-electron** - VSCode test environment
- **esbuild** - Fast JavaScript bundler
- **eslint** + **typescript-eslint** - Linting
- **npm-run-all** - Run multiple npm scripts in parallel

---

## File Organization

```txt
src/
├── extension.ts                     # Extension entry point (activate/deactivate)
├── config.ts                        # Configuration management (paths, ignore patterns)
├── scanner/
│   └── repositoryScanner.ts        # Git repository scanning with simple-git
├── storage/
│   └── repositoryStorage.ts        # Repository data persistence with globalState
├── views/
│   ├── repositoryTreeDataProvider.ts  # TreeDataProvider implementation
│   └── treeNodes.ts                # Tree node classes (Domain, Owner, Repo, Worktree)
└── test/
    ├── extension.test.ts           # Main test suite
    ├── config.test.ts              # Configuration module tests
    ├── treeNodes.test.ts           # Tree node component tests
    ├── repositoryStorage.test.ts   # Storage layer tests
    ├── repositoryTreeDataProvider.test.ts  # Tree provider tests
    └── integration.test.ts         # Integration tests

l10n/
├── bundle.l10n.json                # English runtime messages (default)
├── bundle.l10n.zh-cn.json          # Chinese Simplified runtime messages
├── bundle.l10n.zh-tw.json          # Chinese Traditional runtime messages
├── bundle.l10n.ja.json             # Japanese runtime messages
├── bundle.l10n.ko.json             # Korean runtime messages
├── bundle.l10n.fr.json             # French runtime messages
├── bundle.l10n.es.json             # Spanish runtime messages
├── bundle.l10n.de.json             # German runtime messages
├── bundle.l10n.ru.json             # Russian runtime messages
└── bundle.l10n.pt-br.json          # Portuguese runtime messages
```

**Key Modules:**

### extension.ts

- Extension activation and deactivation lifecycle
- Command registration (refresh, open, quick pick)
- Orchestrates scanner, storage, and tree provider
- Handles progress notifications
- Uses `@vscode/l10n` for runtime message translation

### config.ts

- Reads configuration from `git-repositories.paths` and `git-repositories.ignorePaths`
- Expands environment variables ($HOME, ${USER}, ~, etc.)
- Provides `onConfigurationChange` event listener

### scanner/repositoryScanner.ts

- Recursively scans configured paths for Git repositories
- Uses `simple-git` for Git operations
- Extracts repository metadata: remotes, branches, worktrees, commits
- Implements glob pattern matching via `minimatch` for ignore paths
- MAX_DEPTH: 10 levels, SKIP_DIRECTORIES: node_modules, .vscode, dist, build, target, .git

### storage/repositoryStorage.ts

- Persists repository data in `ExtensionContext.globalState`
- Emits `onDidChangeRepositories` event when data changes
- Provides CRUD operations: saveRepositories, getRepositories, addRepository, removeRepository, clear

### views/repositoryTreeDataProvider.ts

- Implements `vscode.TreeDataProvider<RepositoryTreeNode>`
- Tracks current workspace path from `vscode.workspace.workspaceFolders[0]`
- Groups repositories by domain (github.com, gitlab.com, etc.)
- Builds hierarchical owner tree (supports nested paths like org/team/project)
- Auto-expands nodes containing current workspace

### views/treeNodes.ts

- Defines all tree node classes: EmptyStateNode, DomainNode, OwnerNode, LocalGroupNode, RepositoryNode, WorktreeNode
- Implements workspace tracking logic (icons, expansion state)
- `containsCurrentWorkspace()` helper for matching workspace paths

---

## Development Workflow

### Before Committing

1. **Type check**: `npm run check-types`
2. **Lint**: `npm run lint`
3. **Test**: `npm test`
4. **Build**: `npm run compile`

### When Adding New Features

1. Create feature branch
2. Implement code following style guidelines above
3. Add tests in `src/test/` mirroring source structure
4. Run `npm run compile` to verify build
5. Run `npm test` to verify tests pass
6. Fix any lint/type errors before committing

### Debugging

- Press F5 in VSCode to launch Extension Development Host
- Set breakpoints in `.ts` files (source maps enabled)
- Use `console.log()` for diagnostic output
- Check Debug Console for extension output

---

## Key Principles for AI Agents

1. **Type Safety First**: Never suppress TypeScript errors with `as any` or `@ts-ignore`
2. **Follow ESLint**: Fix all lint warnings before completing work
3. **Test Your Changes**: Run `npm run compile-tests && npm test` after modifications
4. **Match Existing Patterns**: Use namespace imports, follow naming conventions
5. **Error Handling**: Always wrap async operations in try-catch with user-friendly messages
6. **Verify Before Completion**: Run `npm run compile` to ensure build succeeds
7. **Dispose Properly**: Add all disposables to `context.subscriptions`
8. **VSCode API First**: Use VSCode SDK APIs rather than Node.js equivalents when available

---

## Common Tasks

### Adding a New Command

1. Update `package.json` contributes.commands section
2. Register command in `activate()` function
3. Add command implementation
4. Push disposable to context.subscriptions
5. Add tests for the command

### Adding Configuration Options

1. Update `package.json` contributes.configuration section
2. Access via `vscode.workspace.getConfiguration('git-repositories')`
3. Handle configuration changes with `onDidChangeConfiguration`

**Example:**

```typescript
// In config.ts
export function getNewConfigOption(): string {
    const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
    return config.get<string>('newOption', 'defaultValue');
}

// Listen for changes
export function onConfigurationChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(`${CONFIG_SECTION}.newOption`)) {
            callback();
        }
    });
}
```

### Working with Tree Nodes

When adding new tree node types:

1. Extend `vscode.TreeItem` in `views/treeNodes.ts`
2. Add to `RepositoryTreeNode` union type
3. Implement `getChildren()` logic in `RepositoryTreeDataProvider`
4. Set appropriate `contextValue` for menu contributions

**Example:**

```typescript
export class CustomNode extends vscode.TreeItem {
    constructor(public readonly data: CustomData) {
        super('Label', vscode.TreeItemCollapsibleState.None);
        this.id = `custom:${data.id}`;
        this.iconPath = new vscode.ThemeIcon('icon-name');
        this.contextValue = 'customNode';
        this.command = {
            command: 'git-repositories.handleCustom',
            title: 'Handle Custom Node',
            arguments: [this],
        };
    }
}
```

### Adding Repository Scanner Features

When extending repository scanning:

1. Add new fields to `RepositoryInfo` or `WorktreeInfo` interfaces in `scanner/repositoryScanner.ts`
2. Extract the data in `extractRepositoryInfo()` method
3. Update tests in `repositoryStorage.test.ts` and `repositoryTreeDataProvider.test.ts`
4. Display the data in tree nodes or tooltips

**Example:**

```typescript
// Add to interface
export interface RepositoryInfo {
    // ... existing fields
    newField?: string;
}

// Extract in scanner
const repositoryInfo: RepositoryInfo = {
    // ... existing fields
    newField: await extractNewData(git),
};
```

---

## Registered Commands

The extension provides the following commands (all prefixed with `git-repositories.`):

| Command                        | Keybinding        | Description                                      |
|--------------------------------|-------------------|--------------------------------------------------|
| `refreshRepositories`          | -                 | Rescan all configured paths for repositories     |
| `openRepository`               | -                 | Open repository in current window                |
| `openRepositoryInNewWindow`    | -                 | Open repository in new window                    |
| `openWorktree`                 | -                 | Open worktree in current window                  |
| `openWorktreeInNewWindow`      | -                 | Open worktree in new window                      |
| `showQuickPick`                | Cmd/Ctrl+Alt+P    | Show quick picker for fast navigation            |

**Command Implementation Pattern:**

```typescript
const command = vscode.commands.registerCommand(
    'git-repositories.commandName',
    async (node: NodeType) => {
        if (!node) { return; }
        // Command logic here
    }
);

context.subscriptions.push(command);
```

---

## Configuration

### git-repositories.paths

**Type:** `array` of `string`
**Default:** `[]`

List of directory paths to scan for Git repositories. Supports environment variable expansion.

**Examples:**

```json
{
    "git-repositories.paths": [
        "$HOME/projects",
        "$HOME/work",
        "/Users/username/repos"
    ]
}
```

**Supported Environment Variables:**

- `$HOME`, `${HOME}` - User home directory
- `$USER`, `${USER}` - Current username
- `~` - Tilde expansion to home directory
- Any other environment variable: `$VAR` or `${VAR}`

### git-repositories.ignorePaths

**Type:** `array` of `string`
**Default:**

```json
[
    "**/node_modules/**",
    "**/.vscode/**",
    "**/dist/**",
    "**/build/**",
    "**/target/**"
]
```

Glob patterns for paths to ignore when scanning for Git repositories.

**Glob Pattern Syntax:**

- `*` - Matches any characters except `/`
- `**` - Matches any number of directories
- `?` - Matches a single character
- `{a,b}` - Matches a or b
- `[abc]` - Matches a, b, or c

**Examples:**

```json
{
    "git-repositories.ignorePaths": [
        "**/node_modules/**",
        "**/.cache/**",
        "**/temp/**",
        "/Users/username/private/**"
    ]
}
```

---

## Internationalization (i18n)

The extension supports multiple languages through VSCode's built-in i18n system, with both **static UI strings** (package.json) and **runtime messages** (TypeScript code) fully translated.

### Supported Languages

- **English** (default) - `package.nls.json` + `l10n/bundle.l10n.json`
- **简体中文** (Chinese Simplified) - `package.nls.zh-cn.json` + `l10n/bundle.l10n.zh-cn.json`
- **繁體中文** (Chinese Traditional) - `package.nls.zh-tw.json` + `l10n/bundle.l10n.zh-tw.json`
- **日本語** (Japanese) - `package.nls.ja.json` + `l10n/bundle.l10n.ja.json`
- **한국어** (Korean) - `package.nls.ko.json` + `l10n/bundle.l10n.ko.json`
- **Français** (French) - `package.nls.fr.json` + `l10n/bundle.l10n.fr.json`
- **Español** (Spanish) - `package.nls.es.json` + `l10n/bundle.l10n.es.json`
- **Deutsch** (German) - `package.nls.de.json` + `l10n/bundle.l10n.de.json`
- **Русский** (Russian) - `package.nls.ru.json` + `l10n/bundle.l10n.ru.json`
- **Português** (Portuguese) - `package.nls.pt-br.json` + `l10n/bundle.l10n.pt-br.json`

### How It Works

The extension uses two i18n systems:

#### 1. Static UI Strings (package.json)

1. **package.json** uses localization keys with `%key%` syntax
2. **package.nls.json** files contain translations for each language
3. VSCode automatically loads the correct translation based on user's display language

#### 2. Runtime Messages (TypeScript code)

1. Code uses `@vscode/l10n` package: `import * as l10n from "@vscode/l10n"`
2. **l10n/bundle.l10n.json** files contain runtime message translations
3. Messages are translated at runtime: `l10n.t("error.scanFailed")`
4. VSCode automatically selects the correct language bundle

### File Structure

```txt
# Static UI strings (package.json)
package.json                # Uses %key% references
package.nls.json            # English (default)
package.nls.zh-cn.json      # Chinese Simplified
package.nls.zh-tw.json      # Chinese Traditional
package.nls.ja.json         # Japanese
package.nls.ko.json         # Korean
package.nls.fr.json         # French
package.nls.es.json         # Spanish
package.nls.de.json         # German
package.nls.ru.json         # Russian
package.nls.pt-br.json      # Portuguese (Brazil)

# Runtime messages (TypeScript code)
l10n/bundle.l10n.json       # English (default)
l10n/bundle.l10n.zh-cn.json # Chinese Simplified
l10n/bundle.l10n.zh-tw.json # Chinese Traditional
l10n/bundle.l10n.ja.json    # Japanese
l10n/bundle.l10n.ko.json    # Korean
l10n/bundle.l10n.fr.json    # French
l10n/bundle.l10n.es.json    # Spanish
l10n/bundle.l10n.de.json    # German
l10n/bundle.l10n.ru.json    # Russian
l10n/bundle.l10n.pt-br.json # Portuguese (Brazil)
```

### Available Translation Keys

#### Static UI Strings (package.nls.json)

```json
{
  "displayName": "Extension display name",
  "description": "Extension description",
  "viewsContainer.title": "Activity bar title",
  "views.repositories.name": "Tree view name",
  "views.repositories.contextualTitle": "Tree view contextual title",
  "command.refreshRepositories.title": "Refresh command title",
  "command.openRepository.title": "Open repository command title",
  "command.openRepositoryInNewWindow.title": "Open in new window command title",
  "command.openWorktree.title": "Open worktree command title",
  "command.openWorktreeInNewWindow.title": "Open worktree in new window command title",
  "command.showQuickPick.title": "Quick open command title",
  "config.title": "Configuration section title",
  "config.paths.description": "Repository paths setting description",
  "config.ignorePaths.description": "Ignore paths setting description"
}
```

#### Runtime Messages (l10n/bundle.l10n.json)

```json
{
  "error.scanFailed": "Failed to scan repositories",
  "progress.scanning": "Scanning for Git repositories...",
  "info.noRepositories": "No repositories found. Configure repository paths in settings.",
  "quickPick.placeholder": "Select a repository or worktree to open",
  "quickPick.separator.local": "Local",
  "worktree.detached": "detached"
}
```

### Adding a New Language

To add support for a new language, you need to create translations for both static UI strings and runtime messages.

#### Step 1: Static UI Strings

1. Create: `package.nls.<locale>.json`
   - Use standard locale codes (e.g., `zh-cn`, `ja`, `ko`, `fr`, `de`, `ru`, `pt-br`)
2. Copy the structure from `package.nls.json`
3. Translate all string values
4. Keep the same JSON keys
5. Ensure proper escaping for special characters in markdown descriptions

**Example (package.nls.it.json):**

```json
{
  "displayName": "Repository Git",
  "description": "Gestione repository Git multipli con supporto worktree",
  "viewsContainer.title": "Repository"
}
```

#### Step 2: Runtime Messages

1. Create: `l10n/bundle.l10n.<locale>.json`
2. Copy the structure from `l10n/bundle.l10n.json`
3. Translate all message values
4. Keep the same JSON keys

**Example (l10n/bundle.l10n.it.json):**

```json
{
  "error.scanFailed": "Scansione dei repository fallita",
  "progress.scanning": "Scansione dei repository Git in corso...",
  "info.noRepositories": "Nessun repository trovato. Configura i percorsi dei repository nelle impostazioni.",
  "quickPick.placeholder": "Seleziona un repository o worktree da aprire",
  "quickPick.separator.local": "Locale",
  "worktree.detached": "staccato"
}
```

### Testing Translations

1. Change VSCode display language:
   - Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
   - Run: `Configure Display Language`
   - Select target language
   - Restart VSCode
2. Install/reload the extension
3. Verify all UI elements display in the selected language

### Using Localized Strings in Code

When adding new user-facing messages in TypeScript code:

```typescript
import * as l10n from "@vscode/l10n";

// Error messages
vscode.window.showErrorMessage(l10n.t("error.scanFailed"));

// Progress notifications
await vscode.window.withProgress(
  {
    location: vscode.ProgressLocation.Notification,
    title: l10n.t("progress.scanning"),
  },
  async () => {
    // Work here
  }
);

// Information messages
vscode.window.showInformationMessage(l10n.t("info.noRepositories"));

// Quick pick placeholders
await vscode.window.showQuickPick(items, {
  placeHolder: l10n.t("quickPick.placeholder"),
});
```

**Process:**

1. Add the new key and English translation to `l10n/bundle.l10n.json`
2. Use `l10n.t("key.name")` in TypeScript code
3. Add translations to all language-specific `l10n/bundle.l10n.<locale>.json` files
4. Test in each language

### Translation Guidelines

- **Be concise**: VSCode UI has limited space
- **Match tone**: Keep professional and technical tone consistent
- **Preserve formatting**: Maintain markdown syntax in descriptions (package.nls.json)
- **Keep code examples**: Don't translate JSON code blocks or variable names
- **Technical terms**: Keep Git-specific terms (worktree, commit, branch) in English or use standard local translations
- **Consistency**: Use consistent terminology across both package.nls and l10n bundle files
- **Test thoroughly**: Verify truncation doesn't occur in UI

---

## Notes for Code Review

- **Production-Ready Codebase**: This extension is fully implemented with comprehensive test coverage (45 tests)
- **Architecture**: Layered design with clear separation between scanning, storage, and presentation
- **Internationalization**: Supports 10 languages with VSCode's native i18n system
- **No formatter configured**: Consider adding Prettier if team prefers automated formatting
- **Strict TypeScript**: Leverage full type safety; the project has strict mode enabled
- **simple-git**: Uses simple-git library for Git operations, not VSCode's Git Extension API
