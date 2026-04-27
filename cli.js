#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const store = require('./store');
const parser = require('./parser');
const embedder = require('./embedder');
const comparator = require('./comparator');

const useColor = process.stdout.isTTY;
const color = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function paint(text, code) {
  if (!useColor) {
    return text;
  }

  return `${code}${text}${color.reset}`;
}

function logStep(message) {
  console.log(paint(message, color.cyan));
}

function logSuccess(message) {
  console.log(paint(`✔ ${message}`, color.green));
}

function logAlert(message) {
  console.log(paint(`🚨 ${message}`, color.red));
}

function logMuted(message) {
  console.log(paint(message, color.dim));
}

async function initProject() {
  console.log(paint('VectorGit', color.bold));
  logStep('Initializing workspace...');

  // Ensure .vectorgit directory
  if (!fs.existsSync('.vectorgit')) {
    fs.mkdirSync('.vectorgit', { recursive: true });
  }

  // Create empty embeddings file
  store.clearEmbeddings();
  logSuccess('Created .vectorgit/ directory');

  // Create git hook
  setupGitHook();

  logSuccess('VectorGit initialized');
  logMuted('Next: Run "vectorgit baseline" to create a safe baseline');
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
  return buildBaseline();
}

async function buildBaseline() {
  console.log(paint('VectorGit Baseline', color.bold));
  logStep('Parsing code...');

  const jsFiles = parser.findJSFiles('.');
  if (jsFiles.length === 0) {
    console.log('  No JavaScript files found');
    return 0;
  }

  logMuted(`  Found ${jsFiles.length} JavaScript files`);

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

  logMuted(`  Extracted ${totalFunctions} functions`);

  if (totalFunctions === 0) {
    logMuted('  No functions found to analyze');
    return;
  }

  logStep('Generating embeddings...');

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
        ast: func.ast,
        structural: func.structural
      };
    }

    // Save baseline
    store.replaceEmbeddings(embeddingMap);

    logSuccess('Baseline initialized successfully');
    logMuted(`  (${totalFunctions} functions stored)`);
    logMuted('  VectorGit is ready to detect semantic changes!');
    return 0;
  } catch (e) {
    logAlert(`Embedding failed: ${e.message}`);
    process.exit(1);
  }
}

async function checkChanges() {
  console.log(paint('VectorGit Check', color.bold));

  const baselineEmbeddings = store.getAllEmbeddings();

  if (Object.keys(baselineEmbeddings).length === 0) {
    logMuted('No baseline - skipping check. Run "vectorgit baseline" first.');
    return 0;
  }

  logStep('Parsing code...');
  const jsFiles = parser.findJSFiles('.');
  if (jsFiles.length === 0) {
    logMuted('No changes to check');
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
        structural: func.structural,
        key: `${fileHash}::${func.name}`
      });
    }
  }

  if (allFunctions.length === 0) {
    logMuted('No functions found');
    return 0;
  }

  logStep('Generating embeddings...');

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
        ast: func.ast,
        structural: func.structural
      });
    }

    // Compare
    logStep('Comparing with baseline...');
    const regressions = comparator.compareEmbeddings(
      currentEmbeddings,
      baselineEmbeddings,
      0.02 // threshold
    );

    if (regressions.length === 0) {
      logSuccess('No major semantic changes detected');
      return 0;
    }

    logAlert('Semantic Regression Detected');
    console.log('');

    for (const regression of regressions) {
      // Risk level with color
      let riskColor = color.green;
      if (regression.riskLevel === 'MEDIUM') riskColor = color.yellow;
      if (regression.riskLevel === 'HIGH') riskColor = color.red;

      console.log('');
      console.log(paint(`🚨 ${regression.riskLevel} RISK CHANGE`, riskColor));
      console.log(`Risk Score: ${regression.riskScore}/100`);
      console.log('');
      console.log(paint(`Zone: ${regression.zone}`, color.yellow));
      console.log(`File: ${regression.file ? path.basename(regression.file) : 'unknown'}`);
      console.log(`Function: ${regression.name}`);
      console.log(`Final Score: ${regression.finalScore} (threshold: ${regression.threshold})`);
      console.log(`Confidence: ${regression.confidenceLabel} (${regression.confidence}%)`);
      console.log('');

      // Human-readable impact explanation
      if (regression.impact) {
        console.log('Impact:');
        console.log('');
        console.log(regression.impact.summary);
        console.log('');

        if (regression.impact.details && regression.impact.details.length > 0) {
          console.log('Details:');
          console.log('');
          for (const detail of regression.impact.details) {
            console.log(`• ${detail}`);
          }
          console.log('');
        }
      }

      console.log('Breakdown:');
      console.log(`* Embedding Drift: ${regression.distance} (${regression.embeddingConfidence}%)`);
      console.log(`* Structural Drift: ${regression.structuralDrift} (${regression.structuralConfidence}%)`);
      console.log('');
      console.log('Structural Analysis:');
      console.log('');

      if (regression.structuralIssues && regression.structuralIssues.length > 0) {
        for (const issue of regression.structuralIssues) {
          console.log(`* ${issue}`);
        }
      } else {
        logMuted('(no structural changes detected)');
      }

      console.log('');
      console.log('Reasons:');
      console.log('');

      if (regression.reasons && regression.reasons.length > 0) {
        for (const reason of regression.reasons) {
          console.log(`* ${reason}`);
        }
      } else {
        console.log('* (no semantic reasons detected)');
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
  vectorgit baseline  Parse current codebase and overwrite the baseline
  vectorgit analyze   Alias for baseline
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
      case 'baseline':
        await buildBaseline();
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
