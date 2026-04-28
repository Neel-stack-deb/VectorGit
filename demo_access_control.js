// Demo scenario: safe access control logic
// Use this as the baseline version.

function validateSession(session) {
  if (!session || session.isExpired) {
    return false;
  }

  // Deny access unless the session is trusted and MFA passed
  if (!session.isTrusted || !session.mfaPassed) {
    return false;
  }

  // Guests should not reach sensitive actions
  if (session.role === 'guest') {
    return false;
  }

  return true;
}

function canViewSensitiveRecords(session) {
  if (!validateSession(session)) {
    return false;
  }

  return session.permissions.includes('records:read');
}

module.exports = { validateSession, canViewSensitiveRecords };
