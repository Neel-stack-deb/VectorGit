// Demo file version 2: BROKEN calculator logic (semantic regression)

function add(a, b) {
  // Bug: Removed Number() conversion, which might result in string concatenation
  return a + b;
}

function subtract(a, b) {
  // Bug: Changed logic to always return the absolute difference
  return Math.abs(a - b);
}

function multiply(a, b) {
  // Bug: Added an incorrect condition that ignores negative numbers
  if (a < 0 || b < 0) {
    return 0;
  }
  return a * b;
}

module.exports = { add, subtract, multiply };
