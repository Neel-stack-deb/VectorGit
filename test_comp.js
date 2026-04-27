const comparator = require('./comparator.js');

const vec1 = [1, 0];
const vec2 = [0, 1];

const newItem = {
    key: 'test',
    embedding: vec2,
    ast: { conditionals: ['new'] },
    file: 'test.js',
    name: 'test'
};

const baseline = {
    'test': {
        embedding: vec1,
        ast: { conditionals: ['old'] }
    }
};

const regs = comparator.compareEmbeddings([newItem], baseline, 0.1);
console.log('Regressions:', JSON.stringify(regs, null, 2));

const sd = (v1, v2) => {
    // Manually testing the distance
    const dot = v1[0]*v2[0] + v1[1]*v2[1];
    const n1 = Math.sqrt(v1[0]*v1[0] + v1[1]*v1[1]);
    const n2 = Math.sqrt(v2[0]*v2[0] + v2[1]*v2[1]);
    return 1 - (dot / (n1 * n2));
};

console.log('Manual SD:', sd(vec1, vec2));
