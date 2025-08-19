// httpStatus.js
const Http_Status = Object.freeze({
  OK: 200,              // General success
  CREATED: 201,         // Resource created
  NO_CONTENT: 204,      // No content
  BAD_REQUEST: 400,     // Invalid input
  UNAUTHORIZED: 401,    // Auth failure
  FORBIDDEN: 403,       // No permission
  NOT_FOUND: 404,       // Resource not found
  CONFLICT: 409,        // Duplicate
  INTERNAL_SERVER_ERROR: 500, // Server error
  UNPROCESSABLE_ENTITY: 422,
});

module.exports = Http_Status;
