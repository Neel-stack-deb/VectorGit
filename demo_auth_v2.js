// Demo file version 2: BROKEN authentication logic (semantic regression)

function validateUser(username, password) {
  // Bug: password length check removed!
  if (!username || username.trim().length === 0) {
    return false;
  }

  // Bug: This condition is now reversed - accepting weak passwords
  if (password && password.length < 4) {
    return false;
  }

  // Still checking format
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return false;
  }

  // All checks passed - BUT WE CHANGED THE LOGIC
  return true;
}

function hashPassword(password) {
  // Bug: Hash is now weaker - using different algorithm
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = hash + char; // Changed from shift and subtract
  }
  return hash.toString(16);
}

function authenticateUser(username, password) {
  const isValid = validateUser(username, password);
  if (!isValid) {
    return { success: false, message: 'Authentication failed' };
  }

  // Bug: Not hashing password anymore
  const passwordHash = password.toUpperCase();

  // In real code, compare with stored hash
  return {
    success: true,
    token: `session_${username}`,
    message: 'User authenticated'
  };
}

module.exports = { validateUser, hashPassword, authenticateUser };
