# Git Repositories

A powerful VSCode extension for managing multiple Git repositories with support for worktrees, smart grouping, and workspace tracking.

## Features

### 📁 Intelligent Repository Organization

Automatically organizes your Git repositories in a hierarchical tree view:

- **Remote-based Grouping**: Repositories are grouped by their remote domain (github.com, gitlab.com, etc.)
- **Owner Hierarchy**: Supports nested organization paths (e.g., `organization/team/project`)
- **Local Repositories**: Repositories without remotes are grouped separately
- **Worktree Support**: Display and manage Git worktrees with branch and commit information

### 🎯 Current Workspace Tracking

The extension automatically highlights and expands the currently open workspace:

- **Visual Indicators**: Different icons for currently open repositories and worktrees
- **Auto-Expansion**: Parent nodes automatically expand to reveal your current workspace
- **Real-time Updates**: Tree refreshes when you switch workspace folders

### ⚡ Quick Navigation

Fast repository and worktree switching:

- **Quick Picker**: Press `Cmd+Alt+P` (Mac) or `Ctrl+Alt+P` (Windows/Linux) to open a searchable list
- **One-Click Open**: Click any repository or worktree to open it
- **New Window Support**: Open repositories in a new window via inline action buttons

### 🔍 Recursive Scanning

Automatically discovers Git repositories in configured paths:

- **Deep Scanning**: Recursively scans up to 10 directory levels
- **Smart Filtering**: Ignore patterns to skip common build directories (node_modules, dist, etc.)
- **Environment Variables**: Supports `$HOME`, `~`, and other environment variables in paths

### 🌲 Git Worktree Support

Full support for Git worktrees with detailed information:

- Display all worktrees under their parent repository
- Show branch name, commit hash, and commit message
- Identify main vs. secondary worktrees
- Handle detached HEAD states

## Installation

1. Open VSCode
2. Go to Extensions (`Cmd+Shift+X` or `Ctrl+Shift+X`)
3. Search for "Git Repositories"
4. Click Install

## Getting Started

### 1. Configure Repository Paths

Open VSCode settings (`Cmd+,` or `Ctrl+,`) and search for "Git Repositories":

```json
{
  "git-repositories.paths": [
    "$HOME/projects",
    "$HOME/work",
    "/path/to/your/repos"
  ]
}
```

### 2. View Your Repositories

- Click the Repositories icon in the Activity Bar (left sidebar)
- Your repositories will be automatically scanned and organized by remote domain

### 3. Navigate Quickly

- Press `Cmd+Alt+P` (Mac) or `Ctrl+Alt+P` (Windows/Linux)
- Type to search for a repository or worktree
- Press Enter to open

## Extension Settings

This extension contributes the following settings:

### `git-repositories.paths`

**Type**: `array` of `string`
**Default**: `[]`

List of directory paths to scan for Git repositories. Supports environment variable expansion.

**Examples**:

```json
{
  "git-repositories.paths": [
    "$HOME/projects",
    "$HOME/work",
    "${HOME}/repos",
    "~/development"
  ]
}
```

**Supported Environment Variables**:

- `$HOME`, `${HOME}` - User home directory
- `$USER`, `${USER}` - Current username
- `~` - Tilde expansion to home directory
- Any environment variable: `$VAR` or `${VAR}`

### `git-repositories.ignorePaths`

**Type**: `array` of `string`
**Default**:

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

**Glob Pattern Syntax**:

- `*` - Matches any characters except `/`
- `**` - Matches any number of directories
- `?` - Matches a single character
- `{a,b}` - Matches a or b
- `[abc]` - Matches a, b, or c

**Examples**:

```json
{
  "git-repositories.ignorePaths": [
    "**/node_modules/**",
    "**/.cache/**",
    "**/temp/**",
    "**/private/**"
  ]
}
```

## Commands

| Command                              | Keybinding        | Description                                                  |
|--------------------------------------|-------------------|--------------------------------------------------------------|
| `Git Repositories: Refresh`          | -                 | Rescan all configured paths for repositories                 |
| `Git Repositories: Quick Open`       | `Cmd/Ctrl+Alt+P`  | Show quick picker for fast repository/worktree navigation    |

## Tree View Structure

```txt
📁 github.com (domain)
├─ 📁 username (owner)
│  └─ 📦 simple-repo (repository - single worktree)
├─ 📁 org (owner)
│  ├─ 📦 direct-repo (repository)
│  └─ 📁 team (nested owner)
│     └─ 📦 project-name (repository)
│        ├─ 🌿 feature-branch (worktree)
│        └─ 🌿 bugfix-branch (worktree)
└─ 📁 another-user (owner)
   └─ 📦 another-repo (repository)

📁 gitlab.com
└─ ...

📁 No Remote (local repositories without remotes)
└─ 📦 local-project
```

**Visual Indicators**:

- ✨ **Highlighted icon** - Currently open repository/worktree
- 📦 Repository icon - Main repository/worktree
- 🌿 Branch icon - Secondary worktrees
- 📁 Folder icon - Domain/owner groups

## How It Works

### Repository Scanning

1. The extension reads paths from `git-repositories.paths` configuration
2. Recursively scans each path for directories containing `.git` folders
3. Ignores paths matching patterns in `git-repositories.ignorePaths`
4. Extracts repository metadata using `simple-git`:
   - Remote URLs and names
   - Current branch
   - All worktrees with branch/commit information
5. Stores discovered repositories in VSCode's global state

### Tree Organization

1. **Domain Grouping**: Repositories are grouped by their remote domain (extracted from first remote URL)
2. **Owner Hierarchy**: Owner paths are split and organized hierarchically
   - For example, a repository with remote URL `git@github.com:org/team/project.git`:
     - Domain: `github.com`
     - Owner path: `org/team`
     - Repository: `project`
   - This creates: `github.com` → `org` → `team` → `project`
   - Each path segment becomes a nested owner node
3. **Local Group**: Repositories without remotes are placed in a "No Remote" group
4. **Worktree Display**: Secondary worktrees appear as children under their parent repository

### Workspace Tracking

1. Tracks the current workspace via `vscode.workspace.workspaceFolders[0]`
2. Compares repository/worktree paths against current workspace path
3. Updates icons and expansion state automatically
4. Refreshes tree when workspace folders change

## Requirements

- VSCode 1.108.1 or higher
- Git installed and available in PATH

## Known Limitations

- Maximum scan depth: 10 directory levels
- Only the first remote URL is used for domain/owner grouping
- Submodules (where `.git` is a file, not a directory) are detected but treated as regular repositories
- Worktree commit information requires read access to the worktree directory

## Performance Tips

### For Large Directory Trees

Add ignore patterns for large directories you don't need to scan:

```json
{
  "git-repositories.ignorePaths": [
    "**/node_modules/**",
    "**/.cache/**",
    "**/venv/**",
    "**/vendor/**"
  ]
}
```

### For Many Repositories

The extension caches discovered repositories in VSCode's global state, so rescans only happen when:

- VSCode starts
- You manually trigger a refresh
- Configuration changes

## Troubleshooting

### No repositories appear

1. **Check configuration**: Open Settings → Extensions → Git Repositories
2. **Verify paths exist**: Ensure paths in `git-repositories.paths` are valid
3. **Check permissions**: Ensure you have read access to configured directories
4. **Manual refresh**: Click the refresh button in the tree view

### Repositories are missing

1. **Check depth**: The scanner stops at 10 directory levels. Move repositories higher in the tree.
2. **Check ignore patterns**: Ensure your repositories aren't matched by ignore patterns
3. **Check `.git` directory**: Ensure repositories have a `.git` directory (not submodules with `.git` file)

### Performance issues

1. **Add ignore patterns**: Exclude large directories like `node_modules`, build outputs
2. **Reduce scan paths**: Only include directories that actually contain repositories
3. **Increase specificity**: Use more specific paths instead of scanning entire home directory

## Development

This extension is built with:

- **TypeScript** - Type-safe development
- **simple-git** - Git command execution
- **minimatch** - Glob pattern matching
- **ESBuild** - Fast bundling
- **Mocha** - Testing framework

For development setup and contribution guidelines, see [AGENTS.md](./AGENTS.md).

## License

[MIT](LICENSE)

## Feedback & Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/yourusername/git-repositories).
