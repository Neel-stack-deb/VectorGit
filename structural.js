/**
 * Structural analysis module for detecting control-flow mutations
 * Extracts signatures and computes drift independent of embeddings
 */

const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function normalizeCode(code) {
  return code.replace(/\s+/g, ' ').trim();
}

function extractStructuralSignature(path, code) {
  const signature = {
    ifCount: 0,
    conditions: [],
    negations: 0,
    logicalOps: [],
    returnCount: 0,
    callsInConditions: []
  };

  path.traverse({
    Function(innerPath) {
      innerPath.skip();
    },
    IfStatement(innerPath) {
      signature.ifCount++;

      const testNode = innerPath.node.test;
      const conditionText = normalizeCode(code.slice(testNode.start, testNode.end));
      signature.conditions.push(conditionText);

      // Count negations in this condition
      const negationMatches = conditionText.match(/!/g) || [];
      signature.negations += negationMatches.length;

      // Extract logical operators
      if (conditionText.includes('&&')) {
        signature.logicalOps.push('&&');
      }
      if (conditionText.includes('||')) {
        signature.logicalOps.push('||');
      }

      // Find calls inside the condition
      const conditionPath = innerPath.get('test');
      conditionPath.traverse({
        CallExpression(callPath) {
          const calleeName = callPath.node.callee.name || callPath.node.callee.property?.name || 'unknown';
          signature.callsInConditions.push(calleeName);
        }
      });
    },
    ConditionalExpression(innerPath) {
      const testNode = innerPath.node.test;
      const conditionText = normalizeCode(code.slice(testNode.start, testNode.end));
      signature.conditions.push(conditionText);

      const negationMatches = conditionText.match(/!/g) || [];
      signature.negations += negationMatches.length;

      if (conditionText.includes('&&')) {
        signature.logicalOps.push('&&');
      }
      if (conditionText.includes('||')) {
        signature.logicalOps.push('||');
      }
    },
    ReturnStatement(innerPath) {
      signature.returnCount++;
    }
  });

  // Normalize arrays
  signature.conditions = Array.from(new Set(signature.conditions)).sort();
  signature.logicalOps = Array.from(new Set(signature.logicalOps)).sort();
  signature.callsInConditions = Array.from(new Set(signature.callsInConditions)).sort();

  return signature;
}

function detectStructuralIssues(oldSig, newSig) {
  const issues = [];

  if (!oldSig || !newSig) {
    return issues;
  }

  // Check for inverted conditions
  for (const newCond of newSig.conditions) {
    for (const oldCond of oldSig.conditions) {
      if (oldCond === newCond.replace(/!/g, '') || oldCond.replace(/!/g, '') === newCond) {
        if ((oldCond.includes('!') && !newCond.includes('!')) ||
            (!oldCond.includes('!') && newCond.includes('!'))) {
          issues.push('Condition inverted');
          break;
        }
      }
    }
  }

  // Check for new OR conditions
  if (newSig.logicalOps.includes('||') && !oldSig.logicalOps.includes('||')) {
    issues.push('OR condition introduced (potential security bypass)');
  }

  // Check for removed conditions
  if (newSig.ifCount < oldSig.ifCount) {
    issues.push(`Removed ${oldSig.ifCount - newSig.ifCount} condition check(s)`);
  }

  // Check for new conditions
  if (newSig.ifCount > oldSig.ifCount) {
    issues.push(`Added ${newSig.ifCount - oldSig.ifCount} condition(s)`);
  }

  // Check for condition count changes
  if (newSig.conditions.length !== oldSig.conditions.length) {
    const removed = oldSig.conditions.filter(c => !newSig.conditions.includes(c));
    const added = newSig.conditions.filter(c => !oldSig.conditions.includes(c));

    if (removed.length > 0) {
      issues.push(`Condition removed: ${removed[0]}`);
    }
    if (added.length > 0) {
      issues.push(`Condition added: ${added[0]}`);
    }
  }

  // Check for negation changes
  if (newSig.negations !== oldSig.negations) {
    if (newSig.negations > oldSig.negations) {
      issues.push('Negation operator added');
    } else {
      issues.push('Negation operator removed');
    }
  }

  // Check for logical operator changes
  if (JSON.stringify(oldSig.logicalOps) !== JSON.stringify(newSig.logicalOps)) {
    const oldHasAnd = oldSig.logicalOps.includes('&&');
    const newHasOr = newSig.logicalOps.includes('||');

    if (!oldHasAnd && oldSig.logicalOps.length > 0 && newHasOr) {
      issues.push('Logical operator changed (&& → ||)');
    }
  }

  // Check for return statement changes
  if (newSig.returnCount !== oldSig.returnCount) {
    issues.push(`Return statements changed (${oldSig.returnCount} → ${newSig.returnCount})`);
  }

  return Array.from(new Set(issues));
}

function computeStructuralDrift(oldSig, newSig) {
  if (!oldSig || !newSig) {
    return 0;
  }

  let score = 0;

  // Condition changes
  if (JSON.stringify(oldSig.conditions) !== JSON.stringify(newSig.conditions)) {
    score += 0.3;
  }

  // Negation added or removed
  if (oldSig.negations !== newSig.negations) {
    score += 0.5 * Math.abs(oldSig.negations - newSig.negations) / Math.max(1, oldSig.negations);
  }

  // Logical operator changes
  if (JSON.stringify(oldSig.logicalOps) !== JSON.stringify(newSig.logicalOps)) {
    score += 0.4;
  }

  // If statement count changed
  if (oldSig.ifCount !== newSig.ifCount) {
    score += 0.2 * Math.abs(oldSig.ifCount - newSig.ifCount);
  }

  // Return statement changes
  if (oldSig.returnCount !== newSig.returnCount) {
    score += 0.15 * Math.abs(oldSig.returnCount - newSig.returnCount);
  }

  // Clamp between 0 and 1
  return Math.min(1, Math.max(0, score));
}

module.exports = {
  extractStructuralSignature,
  detectStructuralIssues,
  computeStructuralDrift
};
