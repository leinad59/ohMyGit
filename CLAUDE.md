# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oh My Git is a VSCode extension that displays TXT file content inline within Git commit history records, providing a stealthy reading experience. The extension integrates with VSCode's SCM view and allows users to read text files while appearing to browse Git history.

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript to JavaScript
npm run compile

# Watch for file changes and auto-compile
npm run watch

# Run linting (ESLint)
npm run lint

# Run tests
npm test

# Package and publish extension
npm run publish
```

## Architecture

### Core Components

1. **extension.ts** (`src/extension.ts:1`) - Main entry point that initializes all components and registers commands/views
2. **GitHistoryProvider** (`src/gitHistoryProvider.ts:1`) - Core provider that manages Git history display and TXT content integration
3. **TxtContentManager** (`src/txtContentManager.ts:1`) - Handles TXT file reading, encoding detection, and content pagination
4. **InlineReader** (`src/inlineReader.ts:1`) - Manages the inline display of TXT content within Git commit messages
5. **KeyboardHandler** (`src/keyboardHandler.ts:1`) - Handles keyboard shortcuts for navigation and interaction
6. **ConfigManager** (`src/configManager.ts:1`) - Manages VSCode configuration settings and persistence

### Type Definitions

- `src/types/gitTypes.ts` - Git-related interfaces and types
- `src/types/readerTypes.ts` - Reader functionality interfaces and types

## Key Features

### TXT Content Integration
- Reads TXT files with automatic encoding detection (UTF-8, GBK, GB2312, Big5)
- Paginates content with configurable page size (default: 30 characters)
- Persists reading progress per file using file path as key
- Supports hiding/showing content with toggle functionality

### Git Integration
- Uses `simple-git` library for Git operations
- Displays commit history in VSCode's SCM view
- Inline TXT content appears as part of commit messages
- Maintains stealth reading appearance

### Navigation
- Keyboard shortcuts: `Ctrl/Cmd + ←/→` for page navigation
- Click-to-paginate on active reading items
- Search functionality with `Alt+F` and navigation shortcuts
- Jump to specific pages, first/last page buttons

## Configuration

The extension uses VSCode's configuration system:
- `ohmygit.txtFilePath` - Path to the TXT file to display
- `ohmygit.pageSize` - Number of characters per page (default: 30)

## Testing and Debugging

- Use `F5` to launch extension development host
- View console output in VSCode developer tools
- Test with different file encodings and sizes
- Verify Git integration in actual Git repositories

## Build Process

- TypeScript compilation outputs to `./out/extension.js`
- Prepublish hook ensures compilation before packaging
- Uses `vsce` for VSCode extension packaging
- Excludes test files and development dependencies from package

## Important Notes

- Extension requires Git repository context to function
- File permissions must allow VSCode to read TXT files
- Large TXT files may impact performance
- All UI text is in Chinese (simplified)
- Uses VSCode's TreeDataProvider API for custom view implementation