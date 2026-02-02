# Scripts

This directory contains utility scripts for the project.

## convert-icon.js

Converts `icon.svg` to `icon.png` (128x128) for VSCode Marketplace publishing.

### Usage

```bash
node scripts/convert-icon.js
```

### Requirements

- Node.js
- sharp package (installed as dev dependency)

### What it does

1. Reads `icon.svg` from project root
2. Converts to PNG format at 128x128 resolution
3. Saves as `icon.png` in project root

The PNG file is required for VSCode Marketplace publication.
