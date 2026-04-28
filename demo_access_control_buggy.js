// Demo scenario: modified access control logic with a subtle but dangerous bug
// Replace the safe version with this content to trigger VectorGit.

function validateSession(session) {
  if (!session || session.isExpired) {
    return false;
  }

  // Bug: weaker check. This now allows a session through if either
  // trust OR MFA is present, instead of requiring both.
  if (!session.isTrusted && !session.mfaPassed) {
    return false;
  }

  // Bug: guest guard removed
  return true;
}

function canViewSensitiveRecords(session) {
  if (!validateSession(session)) {
    return false;
  }

  return session.permissions.includes('records:read');
}

module.exports = { validateSession, canViewSensitiveRecords };
