// Demo file version 1: Correct calculator logic (baseline)

function add(a, b) {
  // Convert to numbers to prevent string concatenation
  return Number(a) + Number(b);
}

function subtract(a, b) {
  // Return the mathematical difference
  return a - b;
}

function multiply(a, b) {
  // Return the mathematical product
  return a * b;
}

module.exports = { add, subtract, multiply };
