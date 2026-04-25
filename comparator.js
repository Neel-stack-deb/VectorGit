/**
 * Cosine similarity between two vectors
 */
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

/**
 * Compare embeddings and flag regressions
 * @param {Array} newEmbeddings - Array of { key, embedding }
 * @param {Object} baselineEmbeddings - Map of key -> embedding
 * @param {Number} threshold - Distance threshold to flag (default 0.3)
 * @returns {Array} Array of regression findings
 */
function compareEmbeddings(newEmbeddings, baselineEmbeddings, threshold = 0.3) {
  const regressions = [];

  for (const newItem of newEmbeddings) {
    const baselineEmbedding = baselineEmbeddings[newItem.key];

    if (!baselineEmbedding) {
      // New function, no baseline
      continue;
    }

    const distance = semanticDistance(newItem.embedding, baselineEmbedding);

    if (distance !== null && distance > threshold) {
      regressions.push({
        key: newItem.key,
        distance: parseFloat(distance.toFixed(3)),
        severity: getSeverity(distance)
      });
    }
  }

  return regressions.sort((a, b) => b.distance - a.distance);
}

function getSeverity(distance) {
  if (distance > 0.6) return 'CRITICAL';
  if (distance > 0.4) return 'HIGH';
  if (distance > 0.3) return 'MEDIUM';
  return 'LOW';
}

module.exports = {
  cosineSimilarity,
  semanticDistance,
  compareEmbeddings,
  getSeverity
};
