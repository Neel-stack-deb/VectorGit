/**
 * Code diff visualization module
 * Detects and highlights risky changes in code
 */

const RISKY_PATTERNS = [
  { pattern: /\|\|\s*(true|false|1|0|undefined|null)/, risk: 'Unconditional condition' },
  { pattern: /&&\s*(false|0|undefined|null)/, risk: 'Impossible condition' },
  { pattern: /!\s*!\s*/, risk: 'Double negation' },
  { pattern: /return\s+(true|false)/, risk: 'Hardcoded return' },
  { pattern: /throw\s+new\s+Error\(\s*\)/, risk: 'Generic error throw' }
];

function normalizeCode(code) {
  return code.split('\n').map(line => line.trim()).filter(Boolean);
}

function simpleLineDiff(oldCode, newCode) {
  const oldLines = normalizeCode(oldCode);
  const newLines = normalizeCode(newCode);

  const diff = {
    added: [],
    removed: [],
    unchanged: []
  };

  // Simple approach: find common lines and mark differences
  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  for (const line of oldLines) {
    if (!newSet.has(line)) {
      diff.removed.push(line);
    } else {
      diff.unchanged.push(line);
    }
  }

  for (const line of newLines) {
    if (!oldSet.has(line)) {
      diff.added.push(line);
    }
  }

  return diff;
}

function detectRiskyChanges(addedLines, removedLines) {
  const risks = [];

  for (const line of addedLines) {
    for (const { pattern, risk } of RISKY_PATTERNS) {
      if (pattern.test(line)) {
        risks.push({
          type: 'added',
          line,
          risk
        });
      }
    }

    // Check for OR operators adding new paths
    if (line.includes('||') && !line.includes('&&')) {
      const detail = line.match(/\|\|(.*?)[\);\n]/)?.[1]?.trim() || 'unknown';
      risks.push({
        type: 'added',
        line,
        risk: `OR condition added: ${detail}`
      });
    }

    // Check for negations
    if ((line.match(/!/g) || []).length > 0) {
      risks.push({
        type: 'added',
        line,
        risk: 'Negation operator used'
      });
    }
  }

  for (const line of removedLines) {
    // Check if removal weakens condition
    if (line.includes('&&')) {
      risks.push({
        type: 'removed',
        line,
        risk: 'AND condition removed (weakens check)'
      });
    }
  }

  return Array.from(new Set(risks.map(r => r.risk)));
}

function formatDiff(oldCode, newCode) {
  const diff = simpleLineDiff(oldCode, newCode);
  const risks = detectRiskyChanges(diff.added, diff.removed);

  const output = [];

  if (diff.removed.length > 0 || diff.added.length > 0) {
    output.push('Code Changes:');
    output.push('');

    // Show removed lines
    for (const line of diff.removed) {
      output.push(`- ${line}`);
    }

    // Show added lines
    for (const line of diff.added) {
      output.push(`+ ${line}`);
    }

    output.push('');
  }

  // Show risk annotations
  if (risks.length > 0) {
    output.push('⚠ Risky Changes Detected:');
    output.push('');
    for (const risk of risks) {
      output.push(`• ${risk}`);
    }
  }

  return {
    diff,
    risks,
    formatted: output.join('\n')
  };
}

function getCodeSnippet(code, maxLines = 10) {
  const lines = normalizeCode(code);
  if (lines.length <= maxLines) {
    return code;
  }

  // Return first and last few lines with ellipsis
  const start = lines.slice(0, 3);
  const end = lines.slice(-3);
  return start.join('\n') + '\n...\n' + end.join('\n');
}

module.exports = {
  simpleLineDiff,
  detectRiskyChanges,
  formatDiff,
  getCodeSnippet
};
