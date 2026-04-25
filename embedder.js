require('dotenv').config();

let openrouterClient = null;

// Lazy load OpenRouter client (OpenAI SDK configured for OpenRouter)
function getClient() {
  if (!openrouterClient) {
    try {
      const { OpenAI } = require('openai');
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not set in environment');
      }
      openrouterClient = new OpenAI({
        apiKey,
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/yourusername/vectorgit',
          'X-Title': 'VectorGit'
        }
      });
    } catch (e) {
      console.error('OpenRouter client error:', e.message);
      throw e;
    }
  }
  return openrouterClient;
}

/**
 * Convert code snippet to embedding vector
 * Uses OpenRouter with text-embedding-3-small model
 */
async function codeToEmbedding(code) {
  try {
    const client = getClient();
    const response = await client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: code
    });
    return response.data[0].embedding;
  } catch (e) {
    console.error('Embedding error:', e.message);
    throw e;
  }
}

/**
 * Batch convert multiple code snippets to embeddings
 * Uses OpenRouter API for efficiency
 */
async function codesToEmbeddings(codeSnippets) {
  try {
    const client = getClient();
    const response = await client.embeddings.create({
      model: 'openai/text-embedding-3-small',
      input: codeSnippets
    });
    return response.data.map((d, i) => ({ index: d.index, embedding: d.embedding }));
  } catch (e) {
    console.error('Batch embedding error:', e.message);
    throw e;
  }
}

module.exports = {
  codeToEmbedding,
  codesToEmbeddings,
  getClient
};
