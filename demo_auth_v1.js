// Demo file version 1: Correct authentication logic

function validateUser(username, password) {
  // Validate username is not empty
  if (!username || username.trim().length === 0) {
    return false;
  }

  // Validate password is at least 8 characters
  if (!password || password.length < 8) {
    return false;
  }

  // Check username format
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return false;
  }

  // All checks passed
  return true;
}

function hashPassword(password) {
  // In real code, use bcrypt, but for demo use simple hash
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
  }
  return Math.abs(hash).toString(16);
}

function authenticateUser(username, password) {
  const isValid = validateUser(username, password);
  if (!isValid) {
    return { success: false, message: 'Invalid credentials' };
  }

  // Hash the password
  const passwordHash = hashPassword(password);

  // In real code, compare with stored hash in database
  return {
    success: true,
    token: `token_${username}_${passwordHash}`,
    message: 'Authentication successful'
  };
}

module.exports = { validateUser, hashPassword, authenticateUser };
