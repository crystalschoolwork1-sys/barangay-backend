/* ==================================================
   SHARED HELPERS
   ================================================== */

const DOCUMENT_TYPES = [
    "Barangay Clearance",
    "Barangay Certificate",
    "Certificate of Indigency",
    "Certificate of Residency",
    "Business Clearance",
    "Other"
];

const RELEASE_METHODS = [
    "Digital Copy",
    "Physical Copy"
];

const STATUSES = [
    "Pending",
    "Processing",
    "Ready for Release",
    "Completed",
    "Rejected"
];

const PORTALS = [
    "resident",
    "staff"
];


// An error that carries the status code to send back
class HttpError extends Error {

    constructor(status, message) {

        super(message);

        this.status = status;

    }

}


// Lets async route functions send their errors to the error handler
function asyncHandler(handler) {

    return function(req, res, next) {

        Promise.resolve(handler(req, res, next)).catch(next);

    };

}


// Returns trimmed text, or "" when the value is not text
function cleanText(value, maxLength) {

    if (typeof value !== "string") {

        return "";

    }

    return value.trim().slice(0, maxLength);

}


function normalizeEmail(value) {

    return cleanText(value, 254).toLowerCase();

}


function isEmail(value) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

}


// bcrypt only reads the first 72 bytes of a password
function checkPassword(password) {

    if (typeof password !== "string" || password.length < 6) {

        throw new HttpError(400, "Password must be at least 6 characters.");

    }

    if (Buffer.byteLength(password) > 72) {

        throw new HttpError(400, "Password is too long.");

    }

    return password;

}


// Stops the request when the database reported a problem
function checkDatabase(error) {

    if (error) {

        console.error("Database error:", error.message);

        throw new HttpError(500, "Something went wrong. Try again.");

    }

}


// Database row -> what the front end expects (never includes the password)
function toUser(row) {

    return {
        id: row.id,
        role: row.role,
        name: row.name,
        email: row.email,
        address: row.address,
        contact: row.contact,
        createdAt: row.created_at
    };

}


function toRequest(row) {

    let resident = row.resident || {};

    return {
        id: row.id,
        requestNo: row.request_no,
        documentType: row.document_type,
        purpose: row.purpose,
        releaseMethod: row.release_method,
        status: row.status,
        createdAt: row.created_at,
        resident: {
            name: resident.name,
            email: resident.email,
            address: resident.address,
            contact: resident.contact
        }
    };

}


module.exports = {
    DOCUMENT_TYPES,
    RELEASE_METHODS,
    STATUSES,
    PORTALS,
    HttpError,
    asyncHandler,
    cleanText,
    normalizeEmail,
    isEmail,
    checkPassword,
    checkDatabase,
    toUser,
    toRequest
};
