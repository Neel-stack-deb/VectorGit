const fs = require('fs');
const path = require('path');

const EMBEDDINGS_DIR = '.vectorgit';
const EMBEDDINGS_FILE = path.join(EMBEDDINGS_DIR, 'embeddings.json');

function ensureDir() {
  if (!fs.existsSync(EMBEDDINGS_DIR)) {
    fs.mkdirSync(EMBEDDINGS_DIR, { recursive: true });
  }
}

function loadEmbeddings() {
  ensureDir();
  if (!fs.existsSync(EMBEDDINGS_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(EMBEDDINGS_FILE, 'utf8'));
  } catch (e) {
    console.error('Error loading embeddings:', e.message);
    return {};
  }
}

function saveEmbeddings(embeddings) {
  ensureDir();
  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2));
}

function replaceEmbeddings(embeddings) {
  ensureDir();
  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2));
}

function getBaselineEmbedding(fileHash, functionName) {
  const embeddings = loadEmbeddings();
  return embeddings[`${fileHash}::${functionName}`];
}

function setBaselineEmbedding(fileHash, functionName, embedding) {
  const embeddings = loadEmbeddings();
  embeddings[`${fileHash}::${functionName}`] = embedding;
  saveEmbeddings(embeddings);
}

function getAllEmbeddings() {
  return loadEmbeddings();
}

function clearEmbeddings() {
  ensureDir();
  fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify({}, null, 2));
}

module.exports = {
  loadEmbeddings,
  saveEmbeddings,
  replaceEmbeddings,
  getBaselineEmbedding,
  setBaselineEmbedding,
  getAllEmbeddings,
  clearEmbeddings,
  EMBEDDINGS_FILE
};
