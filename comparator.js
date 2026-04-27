/**
 * Cosine similarity between two vectors
 */
const structural = require('./structural');
const explain = require('./explain');
function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return null;
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  norm1 = Math.sqrt(norm1);
  norm2 = Math.sqrt(norm2);

  if (norm1 === 0 || norm2 === 0) {
    return 0;
  }

  return dotProduct / (norm1 * norm2);
}

/**
 * Calculate semantic distance (1 - similarity)
 * Returns distance between 0 and 1
 * 0 = identical, 1 = completely different
 */
function semanticDistance(vec1, vec2) {
  const similarity = cosineSimilarity(vec1, vec2);
  if (similarity === null) {
    return null;
  }
  return 1 - similarity;
}

function getConfidencePercentage(distance) {
  return Math.max(0, Math.min(100, Math.round(distance * 100)));
}

function getConfidenceLabel(confidencePercentage) {
  if (confidencePercentage <= 30) return 'LOW';
  if (confidencePercentage < 70) return 'MEDIUM';
  return 'HIGH';
}

function classifyZone(entry) {
  const text = [entry?.name || '', entry?.file || ''].join(' ').toLowerCase();

  if (/\b(auth|login|validate)\b/.test(text)) {
    return 'AUTH';
  }

  if (/\b(payment|transaction)\b/.test(text)) {
    return 'PAYMENT';
  }

  return 'GENERAL';
}

function getZoneThreshold(zone) {
  if (zone === 'AUTH') return 0.2;
  if (zone === 'PAYMENT') return 0.25;
  return 0.5;
}

function getZoneWeight(zone) {
  if (zone === 'AUTH') return 1.0;
  if (zone === 'PAYMENT') return 0.9;
  return 0.5;
}

function computeRiskScore(structuralDrift, embeddingDistance, zone) {
  const zoneWeight = getZoneWeight(zone);

  // Blend: 50% structural, 30% embedding, 20% zone weight
  const rawScore = (0.5 * structuralDrift) + (0.3 * embeddingDistance) + (0.2 * zoneWeight);

  // Scale to 0-100
  return Math.max(0, Math.min(100, Math.round(rawScore * 100)));
}

function getRiskLevel(riskScore) {
  if (riskScore >= 70) return 'HIGH';
  if (riskScore >= 30) return 'MEDIUM';
  return 'LOW';
}

function getEmbeddingValue(entry) {
  if (!entry) {
    return null;
  }

  if (Array.isArray(entry)) {
    return entry;
  }

  return entry.embedding || null;
}

function getAstValue(entry) {
  if (!entry || Array.isArray(entry)) {
    return null;
  }

  return entry.ast || null;
}

function getStructuralValue(entry) {
  if (!entry || Array.isArray(entry)) {
    return null;
  }

  return entry.structural || null;
}

function normalizeList(values) {
  return Array.from(new Set((values || []).filter(Boolean))).sort();
}

function listChanged(oldList, newList) {
  const left = normalizeList(oldList);
  const right = normalizeList(newList);

  if (left.length !== right.length) {
    return true;
  }

  for (let index = 0; index < left.length; index++) {
    if (left[index] !== right[index]) {
      return true;
    }
  }

  return false;
}

function collectReasons(baselineAst, currentAst) {
  const reasons = [];

  if (!baselineAst || !currentAst) {
    return reasons;
  }

  if (listChanged(baselineAst.conditionals, currentAst.conditionals)) {
    reasons.push('Conditional logic modified');
  }

  if (listChanged(baselineAst.booleanExpressions, currentAst.booleanExpressions)) {
    reasons.push('Boolean expression altered');
  }

  if (listChanged(baselineAst.returnValues, currentAst.returnValues)) {
    reasons.push('Return behavior changed');
  }

  if (listChanged(baselineAst.functionCalls, currentAst.functionCalls)) {
    reasons.push('Function call behavior changed');
  }

  const authRelated = Boolean(baselineAst.hasAuthContext || currentAst.hasAuthContext);
  const logicChanged = reasons.some(reason =>
    reason === 'Conditional logic modified' ||
    reason === 'Boolean expression altered' ||
    reason === 'Function call behavior changed'
  );

  if (authRelated && logicChanged) {
    reasons.unshift('Authorization logic altered');
  }

  return reasons;
}

/**
 * Compare embeddings and flag regressions
 * @param {Array} newEmbeddings - Array of { key, embedding }
 * @param {Object} baselineEmbeddings - Map of key -> embedding
 * @param {Number} threshold - Distance threshold to flag (default 0.3)
 * @returns {Array} Array of regression findings
 */
function compareEmbeddings(newEmbeddings, baselineEmbeddings, threshold = 0.02) {
  const regressions = [];

  for (const newItem of newEmbeddings) {
    const baselineEntry = baselineEmbeddings[newItem.key];
    const baselineEmbedding = getEmbeddingValue(baselineEntry);

    if (!baselineEmbedding) {
      // New function, no baseline
      continue;
    }

    const zone = classifyZone(newItem);
    const zoneThreshold = getZoneThreshold(zone);
    const distance = semanticDistance(newItem.embedding, baselineEmbedding);

    // Compute structural drift
    const baselineStructural = getStructuralValue(baselineEntry);
    const currentStructural = newItem.structural;
    const structuralDrift = structural.computeStructuralDrift(baselineStructural, currentStructural);
    const structuralIssues = structural.detectStructuralIssues(baselineStructural, currentStructural);

    // Blend scores: 60% embedding, 40% structural
    const finalScore = (0.6 * distance) + (0.4 * structuralDrift);

    if (finalScore !== null && finalScore > zoneThreshold) {
      const confidence = getConfidencePercentage(finalScore);
      const embeddingConfidence = getConfidencePercentage(distance);
      const structuralConfidence = getConfidencePercentage(structuralDrift);
      const riskScore = computeRiskScore(structuralDrift, distance, zone);
      const riskLevel = getRiskLevel(riskScore);
      const impact = explain.synthesizeImpact(structuralIssues, distance, zone, newItem.name);

      regressions.push({
        key: newItem.key,
        distance: parseFloat(distance.toFixed(3)),
        structuralDrift: parseFloat(structuralDrift.toFixed(3)),
        finalScore: parseFloat(finalScore.toFixed(3)),
        severity: getSeverity(finalScore),
        file: newItem.file,
        name: newItem.name,
        zone,
        threshold: zoneThreshold,
        confidence,
        confidenceLabel: getConfidenceLabel(confidence),
        embeddingConfidence,
        structuralConfidence,
        riskScore,
        riskLevel,
        structuralIssues,
        impact,
        reasons: collectReasons(getAstValue(baselineEntry), newItem.ast)
      });
    }
  }

  return regressions.sort((a, b) => b.distance - a.distance);
}

function getSeverity(distance) {
  if (distance > 0.08) return 'CRITICAL';
  if (distance > 0.05) return 'HIGH';
  if (distance > 0.03) return 'MEDIUM';
  return 'LOW';
}

module.exports = {
  cosineSimilarity,
  semanticDistance,
  getConfidencePercentage,
  getConfidenceLabel,
  classifyZone,
  getZoneThreshold,
  compareEmbeddings,
  getSeverity
};
