/**
 * PR-style review formatting for vectorgit
 * Outputs comments in the style of a code review bot
 */

function generateRecommendation(riskLevel, structuralIssues, zone) {
  let recommendation = '';

  if (riskLevel === 'HIGH') {
    if (zone === 'AUTH') {
      recommendation = 'Review access control conditions and authorization logic carefully before merging.';
    } else if (zone === 'PAYMENT') {
      recommendation = 'Verify payment validation and transaction handling logic before merging.';
    } else {
      recommendation = 'Review control flow changes thoroughly before merging.';
    }
  } else if (riskLevel === 'MEDIUM') {
    recommendation = 'Review the structural changes and verify they match the intended behavior.';
  } else {
    recommendation = 'Change detected. Review to ensure it aligns with code requirements.';
  }

  // Add specific recommendations based on issues
  if (structuralIssues) {
    if (structuralIssues.some(i => i.includes('inverted'))) {
      recommendation += ' Pay special attention to inverted conditions.';
    }
    if (structuralIssues.some(i => i.includes('OR') || i.includes('||'))) {
      recommendation += ' Verify that new OR conditions do not introduce unintended access paths.';
    }
    if (structuralIssues.some(i => i.includes('Removed') || i.includes('removed'))) {
      recommendation += ' Confirm that removed checks were intentional.';
    }
  }

  return recommendation;
}

function formatPRReview(regressions) {
  const lines = [];

  lines.push('---');
  lines.push('');
  lines.push('**VectorGit Bot** commented:');
  lines.push('');
  lines.push('🚨 **Semantic Regressions Detected**');
  lines.push('');
  lines.push(`Found **${regressions.length}** change(s) that may introduce semantic drift.`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  // Count by risk level
  const riskCounts = {
    HIGH: regressions.filter(r => r.riskLevel === 'HIGH').length,
    MEDIUM: regressions.filter(r => r.riskLevel === 'MEDIUM').length,
    LOW: regressions.filter(r => r.riskLevel === 'LOW').length
  };

  if (riskCounts.HIGH > 0) {
    lines.push(`- 🔴 **${riskCounts.HIGH}** HIGH risk change(s)`);
  }
  if (riskCounts.MEDIUM > 0) {
    lines.push(`- 🟡 **${riskCounts.MEDIUM}** MEDIUM risk change(s)`);
  }
  if (riskCounts.LOW > 0) {
    lines.push(`- 🟢 **${riskCounts.LOW}** LOW risk change(s)`);
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');

  for (let i = 0; i < regressions.length; i++) {
    const regression = regressions[i];

    lines.push(`### ${i + 1}. \`${regression.name}\` (${regression.zone})`);
    lines.push('');
    lines.push(`**Risk Score:** ${regression.riskScore}/100 (${regression.riskLevel})`);
    lines.push(`**File:** \`${regression.file}\``);
    lines.push('');

    if (regression.impact) {
      lines.push('**Impact:**');
      lines.push('');
      lines.push(`> ${regression.impact.summary}`);
      lines.push('');
    }

    if (regression.codeDiff && regression.codeDiff.formatted) {
      lines.push('**Code Changes:**');
      lines.push('');
      lines.push('```diff');
      lines.push(regression.codeDiff.formatted);
      lines.push('```');
      lines.push('');
    }

    if (regression.structuralIssues && regression.structuralIssues.length > 0) {
      lines.push('**Structural Issues:**');
      lines.push('');
      for (const issue of regression.structuralIssues) {
        lines.push(`- ${issue}`);
      }
      lines.push('');
    }

    const recommendation = generateRecommendation(
      regression.riskLevel,
      regression.structuralIssues,
      regression.zone
    );

    lines.push('**Recommendation:**');
    lines.push('');
    lines.push(`> ${recommendation}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*This is an automated review by VectorGit. Review the changes carefully before merging.*');

  return lines.join('\n');
}

function formatPRComment(regression) {
  const lines = [];

  const emoji = regression.riskLevel === 'HIGH' ? '🔴' : regression.riskLevel === 'MEDIUM' ? '🟡' : '🟢';

  lines.push(`${emoji} **${regression.riskLevel} RISK** \`${regression.name}\``);
  lines.push('');
  lines.push(`Risk Score: **${regression.riskScore}/100**`);
  lines.push('');

  if (regression.impact) {
    lines.push(`${regression.impact.summary}`);
    lines.push('');
  }

  const recommendation = generateRecommendation(
    regression.riskLevel,
    regression.structuralIssues,
    regression.zone
  );

  lines.push(`**→ ${recommendation}`);
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  generateRecommendation,
  formatPRReview,
  formatPRComment
};
