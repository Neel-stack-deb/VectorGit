const fs = require('fs');
const path = require('path');
const parser = require('./parser.js');
const comparator = require('./comparator.js');

const v1Content = 'function validateUser(user) { if (user.age > 18) { return true; } return false; }';
const v2Content = 'function validateUser(user) { if (user.age >= 18 && user.isActive) { return true; } return false; }';

fs.writeFileSync('v1.js', v1Content);
fs.writeFileSync('v2.js', v2Content);

try {
    const v1Funcs = parser.extractFunctions('v1.js');
    const v2Funcs = parser.extractFunctions('v2.js');

    const v1f = v1Funcs.find(f => f.name === 'validateUser');
    const v2f = v2Funcs.find(f => f.name === 'validateUser');
    
    console.log('V1 AST:', JSON.stringify(v1f.ast, null, 2));
    console.log('V2 AST:', JSON.stringify(v2f.ast, null, 2));

    const fakeEmbedding1 = new Array(1536).fill(0.1);
    const fakeEmbedding2 = new Array(1536).fill(0.2);

    const newItem = {
        key: 'validateUser',
        embedding: fakeEmbedding2,
        ast: v2f.ast,
        file: 'v1.js',
        name: 'validateUser'
    };

    const baselineEmbeddings = {
        'validateUser': {
            embedding: fakeEmbedding1,
            ast: v1f.ast
        }
    };

    // Threshold high to ensure we see why it's not working if it doesn't
    const regressions = comparator.compareEmbeddings([newItem], baselineEmbeddings, 0.0001);

    console.log('Regressions found:', regressions.length);
    regressions.forEach(r => {
        console.log('Key:', r.key);
        console.log('Distance:', r.distance);
        console.log('Reasons:', r.reasons.join(', '));
    });

} catch (err) {
    console.error('Error:', err);
} finally {
    if (fs.existsSync('v1.js')) fs.unlinkSync('v1.js');
    if (fs.existsSync('v2.js')) fs.unlinkSync('v2.js');
}
