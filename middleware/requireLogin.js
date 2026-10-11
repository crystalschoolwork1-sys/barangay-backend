/* ==================================================
   LOGIN CHECKS
   requireLogin: the request must carry a valid token.
   requireStaff: the signed-in account must be staff.
   ================================================== */

const jwt = require("jsonwebtoken");

const config = require("../config");
const db = require("../database");

const {
    HttpError,
    asyncHandler,
    checkDatabase
} = require("../helpers");


const requireLogin = asyncHandler(async function(req, res, next) {

    // The front end sends:  Authorization: Bearer <token>
    let header = req.headers.authorization || "";

    let token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {

        throw new HttpError(401, "Please sign in again.");

    }


    let payload;

    try {

        payload = jwt.verify(token, config.jwtSecret);

    } catch (error) {

        throw new HttpError(401, "Please sign in again.");

    }


    // Load the account every time, so a deleted account stops working
    let result = await db
        .from("accounts")
        .select("*")
        .eq("id", payload.sub)
        .maybeSingle();

    checkDatabase(result.error);

    if (!result.data) {

        throw new HttpError(401, "Please sign in again.");

    }

    req.user = result.data;

    next();

});


function requireStaff(req, res, next) {

    if (req.user.role !== "staff") {

        return next(new HttpError(403, "Staff only."));

    }

    next();

}


module.exports = { requireLogin, requireStaff };
