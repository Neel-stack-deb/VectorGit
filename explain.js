/**
 * Explanation engine: converts technical signals into human-readable impact statements
 */

function generateExplanations(structuralIssues, zone, functionName) {
  const explanations = [];

  if (!structuralIssues || structuralIssues.length === 0) {
    return ['No significant changes detected.'];
  }

  for (const issue of structuralIssues) {
    let explanation = null;

    if (issue.includes('Condition inverted')) {
      if (zone === 'AUTH') {
        explanation = 'This change reverses access control logic, potentially allowing unauthorized access.';
      } else if (zone === 'PAYMENT') {
        explanation = 'This change inverts payment validation logic, risking incorrect transaction handling.';
      } else {
        explanation = 'A critical condition has been inverted, inverting the control flow.';
      }
    }

    if (issue.includes('OR condition introduced') || issue.includes('potential security bypass')) {
      if (zone === 'AUTH') {
        explanation = 'This may allow unintended access paths, bypassing intended authorization checks.';
      } else if (zone === 'PAYMENT') {
        explanation = 'This may allow unintended payment paths or reduce validation rigor.';
      } else {
        explanation = 'A new OR condition broadens the execution path, which may be unintended.';
      }
    }

    if (issue.includes('Condition removed')) {
      if (zone === 'AUTH') {
        explanation = 'A safety check has been removed, weakening authentication or authorization logic.';
      } else if (zone === 'PAYMENT') {
        explanation = 'A validation check has been removed, potentially allowing invalid transactions.';
      } else {
        explanation = 'A safety check has been removed from the control flow.';
      }
    }

    if (issue.includes('Condition added')) {
      explanation = 'A new condition has been added to the control flow, changing execution paths.';
    }

    if (issue.includes('Negation operator added')) {
      explanation = 'A negation operator has been introduced, inverting a boolean check.';
    }

    if (issue.includes('Negation operator removed')) {
      explanation = 'A negation operator has been removed, no longer inverting a boolean check.';
    }

    if (issue.includes('Logical operator changed') && issue.includes('&&') && issue.includes('||')) {
      explanation = 'The logical operator has been changed from AND to OR, broadening the condition.';
    }

    if (issue.includes('Return statements changed')) {
      explanation = 'Function return behavior has been altered, changing the output or exit path.';
    }

    if (issue.includes('Removed') && issue.includes('condition check')) {
      const count = parseInt(issue.match(/\d+/)?.[0] || '1');
      explanation = `${count} condition check(s) have been removed, reducing validation depth.`;
    }

    if (explanation) {
      explanations.push(explanation);
    }
  }

  // Ensure we have at least a generic explanation
  if (explanations.length === 0) {
    explanations.push('The control flow or return behavior has been modified.');
  }

  return Array.from(new Set(explanations));
}

function synthesizeImpact(structuralIssues, embeddingDistance, zone, functionName) {
  const explanations = generateExplanations(structuralIssues, zone, functionName);

  // Build a summary sentence
  let summary = '';

  if (zone === 'AUTH' && structuralIssues.some(i => i.includes('inverted') || i.includes('removed'))) {
    summary = `This change modifies authentication logic in ${functionName}, potentially affecting access control.`;
  } else if (zone === 'PAYMENT' && structuralIssues.some(i => i.includes('removed') || i.includes('OR'))) {
    summary = `This change alters payment validation in ${functionName}, potentially affecting transaction integrity.`;
  } else if (structuralIssues.some(i => i.includes('inverted'))) {
    summary = `This change inverts logic in ${functionName}, reversing the intended behavior.`;
  } else if (structuralIssues.some(i => i.includes('removed'))) {
    summary = `This change removes checks from ${functionName}, reducing control flow strictness.`;
  } else if (embeddingDistance > 0.7) {
    summary = `This change significantly alters the semantics of ${functionName}.`;
  } else {
    summary = `This change modifies the behavior of ${functionName}.`;
  }

  return {
    summary,
    details: explanations
  };
}

module.exports = {
  generateExplanations,
  synthesizeImpact
};
