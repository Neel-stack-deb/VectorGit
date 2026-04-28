#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const store = require('./store');
const parser = require('./parser');
const embedder = require('./embedder');
const comparator = require('./comparator');
const review = require('./review');
const chalk = require('chalk');

const color = {
  dim: chalk.dim,
  green: chalk.green,
  yellow: chalk.yellow,
  red: chalk.red,
  cyan: chalk.cyan,
  bold: chalk.bold
};

function paint(text, style) {
  return typeof style === 'function' ? style(text) : text;
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

function logHeader(message) {
  console.log(paint(message, color.bold));
}

function printColoredDiff(formattedDiff) {
  const lines = formattedDiff.split('\n');

  for (const line of lines) {
    if (line.startsWith('+ ')) {
      console.log(chalk.green(line));
      continue;
    }

    if (line.startsWith('- ')) {
      console.log(chalk.red(line));
      continue;
    }

    if (line.startsWith('⚠') || line.startsWith('•')) {
      console.log(chalk.yellow(line));
      continue;
    }

    if (line.endsWith(':')) {
      console.log(chalk.cyan(line));
      continue;
    }

    console.log(line);
  }
}

function printColoredReview(reviewText) {
  const lines = reviewText.split('\n');
  let inDiffBlock = false;

  for (const line of lines) {
    if (line.trim().startsWith('```diff')) {
      inDiffBlock = true;
      console.log(chalk.cyan(line));
      continue;
    }

    if (line.trim().startsWith('```')) {
      inDiffBlock = false;
      console.log(chalk.cyan(line));
      continue;
    }

    if (inDiffBlock) {
      if (line.startsWith('+ ')) {
        console.log(chalk.green(line));
      } else if (line.startsWith('- ')) {
        console.log(chalk.red(line));
      } else {
        console.log(chalk.gray(line));
      }
      continue;
    }

    if (line.startsWith('## ') || line.startsWith('### ')) {
      console.log(chalk.bold.cyan(line));
      continue;
    }

    if (line.startsWith('**') && line.endsWith('**')) {
      console.log(chalk.bold(line));
      continue;
    }

    if (line.startsWith('- 🔴') || line.startsWith('- 🟡') || line.startsWith('- 🟢')) {
      console.log(chalk.yellow(line));
      continue;
    }

    console.log(line);
  }
}

function normalizeTargetPath(targetPath) {
  return path.resolve(process.cwd(), targetPath);
}

function filterFilesByTargets(files, targets) {
  if (!targets || targets.length === 0) {
    return files;
  }

  const normalizedTargets = targets.map(normalizeTargetPath);

  return files.filter(file => {
    const absoluteFilePath = normalizeTargetPath(file);
    return normalizedTargets.some(target => absoluteFilePath === target || absoluteFilePath.endsWith(path.sep + target.split(path.sep).pop()));
  });
}

function parseCommandOptions(args) {
  const flags = {
    ci: false
  };

  const targets = [];

  for (const argument of args) {
    if (argument === '--ci') {
      flags.ci = true;
      continue;
    }

    targets.push(argument);
  }

  return { flags, targets };
}

function hasHighRisk(regressions) {
  return regressions.some(regression => regression.riskLevel === 'HIGH');
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

async function analyzeRepo(targets = []) {
  return buildBaseline(targets);
}

async function buildBaseline(targets = []) {
  console.log(paint('VectorGit Baseline', color.bold));
  logStep('Parsing code...');

  const jsFiles = filterFilesByTargets(parser.findJSFiles('.'), targets);
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
        structural: func.structural,
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
        code: func.code,
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

async function runSemanticCheck(targets = []) {
  const baselineEmbeddings = store.getAllEmbeddings();

  if (Object.keys(baselineEmbeddings).length === 0) {
    return { ok: false, error: 'No baseline - run "vectorgit baseline" first' };
  }

  const jsFiles = filterFilesByTargets(parser.findJSFiles('.'), targets);
  if (jsFiles.length === 0) {
    return { ok: true, regressions: [] };
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
    return { ok: true, regressions: [] };
  }

  try {
    const codes = allFunctions.map(f => f.code);
    const embeddings = await embedder.codesToEmbeddings(codes);

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

    const regressions = comparator.compareEmbeddings(
      currentEmbeddings,
      baselineEmbeddings,
      0.02
    );

    return { ok: true, regressions };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkChanges(targets = []) {
  console.log(paint('VectorGit Check', color.bold));
  logStep('Parsing code...');
  logStep('Generating embeddings...');
  logStep('Comparing with baseline...');

  const result = await runSemanticCheck(targets);

  if (!result.ok) {
    logMuted(result.error);
    return 0;
  }

  if (result.regressions.length === 0) {
    logSuccess('No major semantic changes detected');
    return 0;
  }

  const highRiskDetected = hasHighRisk(result.regressions);

  logAlert('Semantic Regression Detected');
  console.log('');

  for (const regression of result.regressions) {
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

    if (regression.impact) {
      logHeader('Impact:');
      console.log('');
      console.log(regression.impact.summary);
      console.log('');

      if (regression.impact.details && regression.impact.details.length > 0) {
        logHeader('Details:');
        console.log('');
        for (const detail of regression.impact.details) {
          console.log(`• ${detail}`);
        }
        console.log('');
      }
    }

    if (regression.codeDiff && regression.codeDiff.formatted) {
      logHeader('Code Diff:');
      console.log('');
      printColoredDiff(regression.codeDiff.formatted);
      console.log('');
    }

    logHeader('Breakdown:');
    console.log(`* Embedding Drift: ${regression.distance} (${regression.embeddingConfidence}%)`);
    console.log(`* Structural Drift: ${regression.structuralDrift} (${regression.structuralConfidence}%)`);
    console.log('');
    logHeader('Structural Analysis:');
    console.log('');

    if (regression.structuralIssues && regression.structuralIssues.length > 0) {
      for (const issue of regression.structuralIssues) {
        console.log(`* ${issue}`);
      }
    } else {
      logMuted('(no structural changes detected)');
    }

    console.log('');
    logHeader('Reasons:');
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

  if (highRiskDetected) {
    return 1;
  }

  logMuted('Only LOW/MEDIUM risk changes detected. Allowing pass.');
  return 0;
}

async function reviewMode(targets = []) {
  console.log(paint('VectorGit Review', color.bold));
  logStep('Parsing code...');
  logStep('Generating embeddings...');
  logStep('Comparing with baseline...');

  const result = await runSemanticCheck(targets);

  if (!result.ok) {
    logMuted(result.error);
    return 0;
  }

  if (result.regressions.length === 0) {
    logSuccess('No regressions detected');
    return 0;
  }

  const highRiskDetected = hasHighRisk(result.regressions);

  // Output in PR-style format
  console.log('');
  printColoredReview(review.formatPRReview(result.regressions));

  return highRiskDetected ? 1 : 0;
}

async function analyzeCIMode(targets = []) {
  const result = await runSemanticCheck(targets);

  if (!result.ok) {
    console.log('❌ Build Failed: Semantic Regression Check Error');
    console.log(result.error);
    return 1;
  }

  if (result.regressions.length === 0) {
    console.log('✅ Build Passed: No Semantic Regression Detected');
    return 0;
  }

  if (hasHighRisk(result.regressions)) {
    console.log('❌ Build Failed: Semantic Regression Detected');
    return 1;
  }

  console.log('✅ Build Passed: No High-Risk Semantic Regression Detected');
  return 0;
}

async function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];
  const { flags, targets } = parseCommandOptions(args.slice(1));

  if (!command) {
    console.log(`
VectorGit - Semantic Version Control for JavaScript

Usage:
  vectorgit init      Initialize VectorGit in current directory
  vectorgit baseline [file...]  Parse selected files and overwrite the baseline
  vectorgit analyze [file...] [--ci]  Baseline (default) or CI check mode
  vectorgit commit [file...]    Check selected files for semantic regressions before commit
  vectorgit review [file...]    Output selected files in PR-style format

Example:
  vectorgit init
  vectorgit baseline
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
        await buildBaseline(targets);
        break;
      case 'analyze':
        if (flags.ci) {
          const ciExitCode = await analyzeCIMode(targets);
          process.exit(ciExitCode);
        }
        await analyzeRepo(targets);
        break;
      case 'commit':
        const exitCode = await checkChanges(targets);
        process.exit(exitCode);
        break;
      case 'review':
        const reviewExitCode = await reviewMode(targets);
        process.exit(reviewExitCode);
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
