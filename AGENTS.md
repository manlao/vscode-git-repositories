# AGENTS.md - Git Repositories VSCode Extension

## Project Overview
This is a VSCode extension for Git Repository management. The project uses TypeScript, ESBuild for bundling, and the VSCode Extension Testing framework.

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

---

## File Organization

```
src/
├── extension.ts          # Extension entry point (activate/deactivate)
├── commands/             # Command implementations (create as needed)
├── models/              # Data models and types (create as needed)
├── services/            # Business logic and API calls (create as needed)
├── utils/               # Utility functions (create as needed)
└── test/
    └── **/*.test.ts     # Test files mirror src structure
```

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

---

## Notes for Code Review

- **No pre-existing custom rules**: This project uses VSCode extension template defaults
- **Minimal codebase**: Currently only contains boilerplate; adopt conventions consistently as you add features
- **No formatter configured**: Consider adding Prettier if team prefers automated formatting
- **Strict TypeScript**: Leverage full type safety; the project has strict mode enabled
