const fs = require('fs');
const crypto = require('crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/**
 * Extract all functions from a JavaScript file
 * Returns array of { name, code, hash }
 */
function extractFunctions(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const functions = [];

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    traverse(ast, {
      FunctionDeclaration(path) {
        const node = path.node;
        const funcCode = code.slice(node.start, node.end);
        functions.push({
          name: node.id?.name || 'anonymous',
          code: funcCode,
          type: 'function',
          line: node.loc.start.line
        });
      },
      ArrowFunctionExpression(path) {
        const node = path.node;
        // Only capture top-level or assigned arrow functions
        if (path.isVariableDeclarator() || path.isFunctionExpression()) {
          const funcCode = code.slice(node.start, node.end);
          const parentNode = path.parent;
          let name = 'anonymous';
          if (parentNode.id) {
            name = parentNode.id.name;
          }
          functions.push({
            name,
            code: funcCode,
            type: 'arrow',
            line: node.loc.start.line
          });
        }
      },
      ObjectMethod(path) {
        const node = path.node;
        const funcCode = code.slice(node.start, node.end);
        functions.push({
          name: node.key.name || 'anonymous',
          code: funcCode,
          type: 'method',
          line: node.loc.start.line
        });
      }
    });
  } catch (e) {
    console.error(`Error parsing ${filePath}:`, e.message);
    return [];
  }

  return functions;
}

/**
 * Generate a hash of file content for tracking
 */
function hashFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/**
 * Find all JS files in a directory
 */
function findJSFiles(dir = '.') {
  const files = [];
  const ignore = ['.vectorgit', 'node_modules', '.git', 'dist', 'build'];

  function walk(current) {
    const items = fs.readdirSync(current);
    for (const item of items) {
      if (ignore.includes(item)) continue;
      const path = `${current}/${item}`;
      const stat = fs.statSync(path);
      if (stat.isDirectory()) {
        walk(path);
      } else if (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(path);
      }
    }
  }

  walk(dir);
  return files;
}

module.exports = {
  extractFunctions,
  hashFile,
  findJSFiles
};
