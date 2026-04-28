# VectorGit - Semantic Version Control for JavaScript

A minimal MVP that adds semantic analysis to Git by detecting logic changes in JavaScript functions using embeddings and cosine similarity.

## Project Structure

```
vectorgit/
├── bin_vectorgit              CLI entry point
├── cli.js                     Main command handler
├── parser.js                  AST parsing for JS functions
├── embedder.js                Convert code to embeddings
├── comparator.js              Cosine similarity calculation
├── store.js                   JSON-based storage
├── package.json               Dependencies
├── .env.example               API key template
└── demo_auth_v*.js            Demo scenario files
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up OpenRouter API Key

```bash
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY from https://openrouter.ai
```

### 3. Initialize VectorGit

```bash
node cli.js init
```

Creates `.vectorgit/` directory and sets up git hooks.

### 4. Create Baseline Embeddings

```bash
node cli.js baseline
```

Analyzes all JS files in the repo and stores baseline embeddings.

### 5. Run Semantic Check

```bash
node cli.js review
```

Compares current code against baseline and flags regressions.

## Terminal Command Sequences

### 1. Sample Test Case (Built-in Demo)

Use this exact sequence to baseline the safe version and then detect the buggy version.

```bash
# 1) Put safe code in active demo file
cp demo_access_control_safe.js demo_access_control.js

# 2) Save baseline from safe code
node cli.js baseline demo_access_control.js

# 3) Replace with buggy code
cp demo_access_control_buggy.js demo_access_control.js

# 4) Run review on the same file path
node cli.js review demo_access_control.js
```

Windows PowerShell equivalent:

```powershell
Copy-Item .\demo_access_control_safe.js .\demo_access_control.js -Force
node cli.js baseline demo_access_control.js
Copy-Item .\demo_access_control_buggy.js .\demo_access_control.js -Force
node cli.js review demo_access_control.js
```

### 2. User-Made Test Case

Create your own safe file and buggy file, then use the same path for baseline and review.

```bash
# Example files you create:
# auth_guard_safe.js
# auth_guard_buggy.js

# 1) Copy safe version to active file path
cp auth_guard_safe.js auth_guard.js

# 2) Baseline safe version
node cli.js baseline auth_guard.js

# 3) Replace active file with buggy version
cp auth_guard_buggy.js auth_guard.js

# 4) Check for regression
node cli.js review auth_guard.js
# or:
node cli.js commit auth_guard.js
```

Important rule: baseline and review must run against the same target file path (for example `auth_guard.js`).

## Features

### Command: `init`
- Creates `.vectorgit/` directory
- Sets up pre-commit git hook
- Initializes empty embeddings baseline

### Command: `baseline` (and alias `analyze`)
- Finds all JavaScript files in repo
- Extracts functions using Babel AST parser
- Generates embeddings for each function
- Stores baseline for comparison

### Command: `commit`
- Loads baseline embeddings
- Recomputes embeddings for current code
- Calculates cosine similarity
- Flags functions with distance > 0.3 as regressions

## Legacy Demo (Auth v1/v2)

### Step 1: Initialize

```bash
node cli.js init
```

### Step 2: Set baseline with correct code

Copy v1 to active file:
```bash
cp demo_auth_v1.js auth.js
node cli.js baseline auth.js
```

Output:
```
🔍 Analyzing repository for baseline embeddings...
  Found 1 JavaScript files
  Extracted 3 functions
  Computing embeddings...
✓ Saved 3 baseline embeddings
```

### Step 3: Replace with broken code

```bash
cp demo_auth_v2.js auth.js
node cli.js review auth.js
```

Output:
```
🔐 Running semantic check...
  Computing embeddings...
[⚠️  ALERT] Semantic Regression Detected

  File: auth.js
  Function: validateUser
  Change Score: 0.78
  Severity: HIGH

  File: auth.js
  Function: hashPassword
  Change Score: 0.62
  Severity: HIGH

  File: auth.js
  Function: authenticateUser
  Change Score: 0.55
  Severity: HIGH
```

## 🔧 How It Works

### 1. **Parsing**
- Uses Babel parser to convert JS into AST
- Extracts function declarations, arrow functions, methods
- Preserves original code for embedding

### 2. **Embeddings**
- Sends code snippets to OpenRouter's `text-embedding-3-small` model
- Receives 1536-dimensional vectors
- Stores embeddings with file hash + function name as key

### 3. **Comparison**
- Computes cosine similarity between current and baseline
- Distance = 1 - similarity (0 = identical, 1 = different)
- Flags changes > 0.3 threshold

### 4. **Storage**
- `.vectorgit/embeddings.json` stores baseline
- Key format: `<file_hash>::<function_name>@<line_number>`
- Simple JSON structure for portability

## Threshold & Severity

| Distance | Severity | Action |
|----------|----------|--------|
| < 0.30   | ✓ OK     | Pass |
| 0.30-0.40 | MEDIUM  | Warning |
| 0.40-0.60 | HIGH    | Alert |
| > 0.60   | CRITICAL | Block |

## Configuration

### Environment Variables
- `OPENROUTER_API_KEY` - Required for embeddings (get from https://openrouter.ai)

### Files Ignored
- `.vectorgit/`
- `node_modules/`
- `.git/`
- `dist/`, `build/`

### Supported File Types
- `.js`
- `.jsx`
- `.ts`
- `.tsx`

## Git Hook Integration

When initialized, VectorGit sets up a pre-commit hook that:
- Runs `vectorgit commit` before commit
- Blocks commit if regressions detected (exit code 1)
- Shows detailed report of changes

## API Costs

Using `text-embedding-3-small`:
- ~$0.02 per 1M tokens
- ~100 tokens per function on average
- Example: 100 functions ≈ $0.0002

## Limitations (MVP)

- Single language (JavaScript only)
- Function-level granularity only
- No diff-based optimization (always full re-embed)
- No caching between runs
- Threshold is hardcoded (no config file)
- No support for private/vendor code filtering

##  Extend It

To enhance beyond MVP:

1. **Multi-language support** - Add parsers for Python, Go, Rust
2. **Smart diffing** - Only embed changed functions
3. **Configuration** - Add `.vectorgit.config.json` for thresholds
4. **Database** - Replace JSON with SQLite for large repos
5. **UI** - Web dashboard to visualize regressions
6. **CI/CD** - GitHub Actions integration
7. **Blame** - Link regressions to specific commits

## 📚 Example API Response

```json
{
  "status": "alert",
  "message": "Semantic Regression Detected",
  "regressions": [
    {
      "key": "abc12345::validateUser@10",
      "distance": 0.78,
      "file": "auth.js",
      "name": "validateUser",
      "severity": "HIGH"
    }
  ]
}
```

---

Built for Google Solutions 2026
