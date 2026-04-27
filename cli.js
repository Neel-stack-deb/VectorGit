#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const store = require('./store');
const parser = require('./parser');
const embedder = require('./embedder');
const comparator = require('./comparator');

async function initProject() {
  console.log('📦 Initializing VectorGit...');

  // Ensure .vectorgit directory
  if (!fs.existsSync('.vectorgit')) {
    fs.mkdirSync('.vectorgit', { recursive: true });
  }

  // Create empty embeddings file
  store.clearEmbeddings();
  console.log('✓ Created .vectorgit/ directory');

  // Create git hook
  setupGitHook();

  console.log('✓ VectorGit initialized');
  console.log('  Next: Run "vectorgit analyze" to create baseline embeddings');
}

function setupGitHook() {
  const hookPath = '.git/hooks/pre-commit';

  if (!fs.existsSync('.git')) {
    console.log('  (Skipping git hook - not a git repo yet)');
    return;
  }

  const hookContent = `#!/bin/bash
# VectorGit pre-commit hook

node <<'EOF'
const cli = require('${path.resolve(__dirname, 'cli')}');
cli.runCheck().catch(e => {
  console.error('[ERROR]', e.message);
  process.exit(1);
});
EOF
`;

  fs.mkdirSync('.git/hooks', { recursive: true });
  fs.writeFileSync(hookPath, hookContent);
  fs.chmodSync(hookPath, 0o755);
  console.log('✓ Set up pre-commit hook');
}

async function analyzeRepo() {
  console.log('🔍 Analyzing repository for baseline embeddings...');

  const jsFiles = parser.findJSFiles('.');
  if (jsFiles.length === 0) {
    console.log('  No JavaScript files found');
    return;
  }

  console.log(`  Found ${jsFiles.length} JavaScript files`);

  let totalFunctions = 0;
  const allFunctions = [];

  for (const file of jsFiles) {
    const functions = parser.extractFunctions(file);
    const fileHash = parser.hashFile(file);

    for (const func of functions) {
      allFunctions.push({
        file,
        fileHash,
        name: func.name,
        code: func.code,
        ast: func.ast,
        key: `${fileHash}::${func.name}`
      });
    }
    totalFunctions += functions.length;
  }

  console.log(`  Extracted ${totalFunctions} functions`);

  if (totalFunctions === 0) {
    console.log('  No functions found to analyze');
    return;
  }

  console.log('  Computing embeddings (this may take a moment)...');

  try {
    const codes = allFunctions.map(f => f.code);
    const embeddings = await embedder.codesToEmbeddings(codes);

    // Build embedding map
    const embeddingMap = {};
    for (const { index, embedding } of embeddings) {
      const func = allFunctions[index];
      embeddingMap[func.key] = {
        embedding,
        file: func.file,
        name: func.name,
        ast: func.ast
      };
    }

    // Save baseline
    store.saveEmbeddings(embeddingMap);

    console.log(`✓ Saved ${totalFunctions} baseline embeddings`);
    console.log('  VectorGit is ready to detect semantic changes!');
  } catch (e) {
    console.error('❌ Embedding failed:', e.message);
    process.exit(1);
  }
}

async function checkChanges() {
  console.log('🔐 Running semantic check...');

  const baselineEmbeddings = store.getAllEmbeddings();

  if (Object.keys(baselineEmbeddings).length === 0) {
    console.log('[OK] No baseline - skipping check. Run "vectorgit analyze" first.');
    return 0;
  }

  const jsFiles = parser.findJSFiles('.');
  if (jsFiles.length === 0) {
    console.log('[OK] No changes to check');
    return 0;
  }

  const allFunctions = [];
  for (const file of jsFiles) {
    const functions = parser.extractFunctions(file);
    const fileHash = parser.hashFile(file);

    for (const func of functions) {
      allFunctions.push({
        file,
        fileHash,
        name: func.name,
        code: func.code,
        ast: func.ast,
        key: `${fileHash}::${func.name}`
      });
    }
  }

  if (allFunctions.length === 0) {
    console.log('[OK] No functions found');
    return 0;
  }

  console.log('  Computing embeddings...');

  try {
    const codes = allFunctions.map(f => f.code);
    const embeddings = await embedder.codesToEmbeddings(codes);

    // Build current embedding map
    const currentEmbeddings = [];
    for (const { index, embedding } of embeddings) {
      const func = allFunctions[index];
      currentEmbeddings.push({
        key: func.key,
        embedding,
        file: func.file,
        name: func.name,
        ast: func.ast
      });
    }

    // Compare
    const regressions = comparator.compareEmbeddings(
      currentEmbeddings,
      baselineEmbeddings,
      0.02 // threshold
    );

    if (regressions.length === 0) {
      console.log('[OK] No major semantic changes detected\n');
      return 0;
    }

    console.log('[⚠️  ALERT] Semantic Regression Detected\n');

    for (const regression of regressions) {
      console.log(`File: ${path.basename(regression.file)}`);
      console.log(`Function: ${regression.name}`);
      console.log(`Score: ${regression.distance}`);
      console.log('');
      console.log('Reasons:');
      console.log('');

      if (regression.reasons && regression.reasons.length > 0) {
        for (const reason of regression.reasons) {
          console.log(`* ${reason}`);
        }
      } else {
        console.log('* AST baseline unavailable or no rule matched');
      }

      console.log('');
    }

    return 1;
  } catch (e) {
    console.error('❌ Check failed:', e.message);
    process.exit(1);
  }
}

async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
VectorGit - Semantic Version Control for JavaScript

Usage:
  vectorgit init      Initialize VectorGit in current directory
  vectorgit analyze   Analyze repo and create baseline embeddings
  vectorgit commit    Check for semantic regressions before commit

Example:
  vectorgit init
  vectorgit analyze
  git add .
  vectorgit commit

Environment:
  OPENAI_API_KEY    Required for computing embeddings
    `);
    return;
  }

  try {
    switch (command) {
      case 'init':
        await initProject();
        break;
      case 'analyze':
        await analyzeRepo();
        break;
      case 'commit':
        const exitCode = await checkChanges();
        process.exit(exitCode);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

// Export for use in hooks
async function runCheck() {
  return checkChanges();
}

if (require.main === module) {
  runCLI();
}

module.exports = { runCheck };
