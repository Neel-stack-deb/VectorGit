# VectorGit MVP - Getting Started Guide

## ⚡ 5-Minute Setup

### 1. Install Dependencies
```bash
cd C:\Users\debar\OneDrive\Desktop\Projects\VectorGit
npm install
```

Expected output:
```
added 45 packages in 8s
```

### 2. Get OpenRouter API Key

Go to: https://openrouter.ai

Sign up, then go to your API keys dashboard and create a new key.

### 3. Set Environment Variable

Create/edit `.env`:
```bash
copy .env.example .env
```

Edit the file and set:
```
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE
```

### 4. Test Installation

```bash
node cli.js
```

Should show help:
```
VectorGit - Semantic Version Control for JavaScript

Usage:
  vectorgit init      Initialize VectorGit in current directory
  vectorgit analyze   Analyze repo and create baseline embeddings
  vectorgit commit    Check for semantic regressions before commit
```

---

## 🧪 Full Demo (10 minutes)

### Step 1: Initialize Project

```bash
node cli.js init
```

Expected output:
```
📦 Initializing VectorGit...
✓ Created .vectorgit/ directory
✓ Set up pre-commit hook
✓ VectorGit initialized
  Next: Run "vectorgit analyze" to create baseline embeddings
```

**What happened:**
- Created `.vectorgit/` directory
- Created `.vectorgit/embeddings.json` (empty)
- Created `.git/hooks/pre-commit` script

### Step 2: Create Baseline (Correct Code)

```bash
copy demo_auth_v1.js auth.js
node cli.js analyze
```

Expected output:
```
🔍 Analyzing repository for baseline embeddings...
  Found 2 JavaScript files
  Extracted 3 functions
  Computing embeddings (this may take a moment)...
✓ Saved 3 baseline embeddings
  VectorGit is ready to detect semantic changes!
```

**What happened:**
- Found `auth.js` and other .js files
- Extracted 3 functions: `validateUser`, `hashPassword`, `authenticateUser`
- Called OpenAI API to convert each function to a 1536-dim vector
- Stored baseline in `.vectorgit/embeddings.json`

**Check baseline:**
```bash
type .vectorgit\embeddings.json
```

You'll see:
```json
{
  "abc12345::validateUser@1": [0.123, -0.456, ...],
  "abc12345::hashPassword@25": [0.789, -0.012, ...],
  "abc12345::authenticateUser@40": [0.345, -0.678, ...]
}
```

### Step 3: Verify Baseline Passes

```bash
node cli.js commit
```

Expected output:
```
🔐 Running semantic check...
  Computing embeddings...
[OK] No major semantic changes detected
```

**Exit code: 0** (success)

### Step 4: Introduce Breaking Changes

```bash
copy demo_auth_v2.js auth.js
node cli.js commit
```

Expected output:
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

**Exit code: 1** (failure - regression detected)

### Step 5: View the Changes

**V1 (Correct):**
```bash
type demo_auth_v1.js | findstr /n validateUser
```

```javascript
function validateUser(username, password) {
  if (!password || password.length < 8) {  // ← STRICT: >= 8 chars
    return false;
  }
```

**V2 (Broken):**
```bash
type demo_auth_v2.js | findstr /n validateUser
```

```javascript
function validateUser(username, password) {
  if (password && password.length < 4) {   // ← REVERSED: < 4 chars! 🐛
    return false;
  }
```

The tool detected the semantic change!

---

## 📊 Understanding the Output

### Change Score (Semantic Distance)
- **0.00 - 0.30**: OK (minor changes)
- **0.30 - 0.40**: MEDIUM (notable change)
- **0.40 - 0.60**: HIGH (significant change)
- **0.60 - 1.00**: CRITICAL (logic completely different)

### Why the Scores Are Different

```
validateUser:      0.78 (CRITICAL)
  ↑ 
  └─ Logic reversed, accepts weak passwords

hashPassword:      0.62 (HIGH)
  ↑
  └─ Hashing algorithm changed to simpler version

authenticateUser:  0.55 (HIGH)
  ↑
  └─ Security vulnerability: plain text instead of hash
```

Each semantic change gets its own distance score based on how different the embeddings are.

---

## 🔄 Repeat Test

### Reset to Baseline
```bash
copy demo_auth_v1.js auth.js
node cli.js commit
```

Output: `[OK] No major semantic changes detected`

### Small Change (Should Pass)
Edit `demo_auth_v1.js`, rename a variable:
```javascript
function validateUser(user, pass) {  // Changed param names
  if (!pass || pass.length < 8) {
    return false;
  }
  // ...
}
```

Copy and test:
```bash
copy demo_auth_v1.js auth.js
# Make small rename changes
node cli.js commit
```

Output: Likely `[OK]` since semantic meaning unchanged

### Logical Change (Should Fail)
```javascript
function validateUser(username, password) {
  // Changed the logic check
  if (!password || password.length < 5) {  // Changed from < 8
    return false;
  }
}
```

Copy and test:
```bash
node cli.js commit
```

Output: `[⚠️  ALERT]` with moderate score (~0.3-0.5)

---

## 🐛 Troubleshooting

### "OPENAI_API_KEY not set"
```bash
# Check .env file exists
type .env
# Should show OPENAI_API_KEY=sk-proj-...
```

### "No JavaScript files found"
```bash
# Create a test file
echo "function test() { return 42; }" > test.js
node cli.js analyze
```

### "Cannot parse file"
Ensure files are valid JavaScript. Babel might fail on invalid syntax.

### "HTTP 401 - Invalid API key"
Check your OpenAI API key is correct and has billing enabled.

### Rate limit errors
OpenAI throttles requests. Wait a moment and retry.

---

## 📈 Next Steps

1. **Try different code changes:**
   - Variable renames (should pass)
   - Comment changes (should pass)
   - Logic tweaks (should flag)
   - Security changes (should flag)

2. **Analyze your own code:**
   ```bash
   # Remove demo files
   del demo_auth_*.js auth.js
   
   # Reinitialize
   node cli.js init
   node cli.js analyze
   
   # Make changes to your own code
   node cli.js commit
   ```

3. **Integrate with Git:**
   ```bash
   git add .
   git commit -m "Initial commit"  # Runs pre-commit hook
   ```

4. **Extend the tool:**
   - See `ARCHITECTURE.md` for how to add multi-language support
   - See `BUILD_SUMMARY.md` for extension ideas

---

## 📚 Files to Review

1. **README.md** - Full documentation
2. **BUILD_SUMMARY.md** - What was built and why
3. **ARCHITECTURE.md** - System design and data flows
4. **cli.js** - Main entry point (read this first)
5. **parser.js** - How we extract functions
6. **embedder.js** - How we call OpenAI
7. **comparator.js** - How we detect changes
8. **store.js** - How we save baselines

---

## 🎉 You're Ready!

VectorGit is now ready to use. Start with:

```bash
node cli.js init
copy demo_auth_v1.js auth.js
node cli.js analyze
copy demo_auth_v2.js auth.js
node cli.js commit
```

Happy semantic versioning! 🚀
