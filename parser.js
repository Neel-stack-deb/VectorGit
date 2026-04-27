const fs = require('fs');
const crypto = require('crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const AUTH_KEYWORDS = [
  'auth',
  'authorization',
  'permission',
  'permissions',
  'role',
  'roles',
  'token',
  'session',
  'login',
  'user',
  'access',
  'secure',
  'verify',
  'admin'
];

function normalizeSnippet(code) {
  return code.replace(/\s+/g, ' ').trim();
}

function getCalleeName(node, code) {
  if (!node) {
    return '';
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'ThisExpression') {
    return 'this';
  }

  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const objectName = getCalleeName(node.object, code);
    const propertyName = node.property
      ? (node.property.name || node.property.value || normalizeSnippet(code.slice(node.property.start, node.property.end)))
      : '';

    return objectName && propertyName ? `${objectName}.${propertyName}` : objectName || propertyName;
  }

  return normalizeSnippet(code.slice(node.start, node.end));
}

function collectFunctionFeatures(path, code) {
  const features = {
    conditionals: [],
    booleanExpressions: [],
    returnValues: [],
    functionCalls: []
  };

  path.traverse({
    Function(innerPath) {
      innerPath.skip();
    },
    IfStatement(innerPath) {
      features.conditionals.push(normalizeSnippet(code.slice(innerPath.node.test.start, innerPath.node.test.end)));
    },
    ConditionalExpression(innerPath) {
      features.conditionals.push(normalizeSnippet(code.slice(innerPath.node.test.start, innerPath.node.test.end)));
    },
    LogicalExpression(innerPath) {
      features.booleanExpressions.push(normalizeSnippet(code.slice(innerPath.node.start, innerPath.node.end)));
    },
    ReturnStatement(innerPath) {
      const argument = innerPath.node.argument;
      features.returnValues.push(argument ? normalizeSnippet(code.slice(argument.start, argument.end)) : 'void');
    },
    CallExpression(innerPath) {
      features.functionCalls.push(getCalleeName(innerPath.node.callee, code));
    }
  });

  const unique = values => Array.from(new Set(values.filter(Boolean))).sort();

  const flattened = [
    ...features.conditionals,
    ...features.booleanExpressions,
    ...features.returnValues,
    ...features.functionCalls
  ];

  return {
    conditionals: unique(features.conditionals),
    booleanExpressions: unique(features.booleanExpressions),
    returnValues: unique(features.returnValues),
    functionCalls: unique(features.functionCalls),
    hasAuthContext: flattened.some(text => AUTH_KEYWORDS.some(keyword => text.toLowerCase().includes(keyword)))
  };
}

function getAssignedFunctionName(node, code) {
  if (!node) {
    return 'anonymous';
  }

  if (node.type === 'VariableDeclarator' && node.id && node.id.name) {
    return node.id.name;
  }

  if (node.type === 'AssignmentExpression') {
    if (node.left.type === 'Identifier') {
      return node.left.name;
    }

    if (node.left.type === 'MemberExpression' || node.left.type === 'OptionalMemberExpression') {
      return normalizeSnippet(code.slice(node.left.start, node.left.end));
    }
  }

  return 'anonymous';
}

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
        functions.push({
          name: node.id?.name || 'anonymous',
          code: code.slice(node.start, node.end),
          type: 'function',
          line: node.loc.start.line,
          ast: collectFunctionFeatures(path, code)
        });
      },
      ArrowFunctionExpression(path) {
        const node = path.node;
        const parentPath = path.parentPath;

        // Capture assigned arrow functions used as named functions.
        if (parentPath.isVariableDeclarator() || parentPath.isAssignmentExpression()) {
          functions.push({
            name: getAssignedFunctionName(parentPath.node, code),
            code: code.slice(node.start, node.end),
            type: 'arrow',
            line: node.loc.start.line,
            ast: collectFunctionFeatures(path, code)
          });
        }
      },
      ObjectMethod(path) {
        const node = path.node;
        functions.push({
          name: node.key?.name || node.key?.value || 'anonymous',
          code: code.slice(node.start, node.end),
          type: 'method',
          line: node.loc.start.line,
          ast: collectFunctionFeatures(path, code)
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
  return crypto.createHash('sha256').update(filePath).digest('hex').slice(0, 8);
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
