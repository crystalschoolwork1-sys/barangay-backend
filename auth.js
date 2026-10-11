/* ==================================================
   REGISTER, LOGIN AND FORGOT PASSWORD

   POST /api/register
   POST /api/login
   POST /api/forgot-password
   POST /api/reset-password
   ================================================== */

const crypto = require("crypto");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const config = require("../config");
const db = require("../database");
const { sendResetEmail } = require("../mailer");

const {
    PORTALS,
    HttpError,
    asyncHandler,
    cleanText,
    normalizeEmail,
    isEmail,
    checkPassword,
    checkDatabase,
    toUser
} = require("../helpers");


const router = express.Router();


// Slows down people who keep guessing passwords or codes
const authLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." }

});


// Compared against when the email does not exist, so a wrong email
// and a wrong password take the same time to answer
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const BAD_CODE = "That code is not valid or has expired.";


function hashCode(code) {

    return crypto
        .createHmac("sha256", config.jwtSecret)
        .update(code)
        .digest("hex");

}


function sameText(a, b) {

    let first = Buffer.from(a);

    let second = Buffer.from(b);

    return first.length === second.length &&
           crypto.timingSafeEqual(first, second);

}


async function findAccount(email, role) {

    let result = await db
        .from("accounts")
        .select("*")
        .eq("email", email)
        .eq("role", role)
        .maybeSingle();

    checkDatabase(result.error);

    return result.data;

}


/* --------------------------------------------------
   REGISTER (residents only)
   -------------------------------------------------- */

router.post("/register", authLimiter, asyncHandler(async function(req, res) {

    let name = cleanText(req.body.name, 100);
    let email = normalizeEmail(req.body.email);
    let address = cleanText(req.body.address, 200);
    let contact = cleanText(req.body.contact, 30);

    if (!name || !address || !contact || !isEmail(email)) {

        throw new HttpError(400, "Please fill in every field correctly.");

    }

    let password = checkPassword(req.body.password);

    let passwordHash = await bcrypt.hash(password, 10);


    let result = await db.from("accounts").insert({

        role: "resident",
        name: name,
        email: email,
        password_hash: passwordHash,
        address: address,
        contact: contact

    });

    // 23505 means the email already exists
    if (result.error && result.error.code === "23505") {

        throw new HttpError(409, "That email is already registered.");

    }

    checkDatabase(result.error);

    res.status(201).json({ message: "Account created" });

}));


/* --------------------------------------------------
   LOGIN
   "portal" is the sign-in page that was used. The account's
   role must match it, so staff cannot sign in on the resident
   page and residents cannot sign in on the staff page.
   -------------------------------------------------- */

router.post("/login", authLimiter, asyncHandler(async function(req, res) {

    let email = normalizeEmail(req.body.email);
    let portal = req.body.portal;
    let password = typeof req.body.password === "string" ? req.body.password : "";

    let account = null;

    if (PORTALS.includes(portal) && isEmail(email)) {

        account = await findAccount(email, portal);

    }

    let passwordIsRight = await bcrypt.compare(
        password,
        account ? account.password_hash : DUMMY_HASH
    );

    // The same message for every kind of failure
    if (!account || !passwordIsRight) {

        throw new HttpError(401, "Wrong email or password.");

    }


    let token = jwt.sign({ role: account.role }, config.jwtSecret, {

        subject: String(account.id),
        expiresIn: config.tokenHours + "h"

    });

    res.json({ token: token, user: toUser(account) });

}));


/* --------------------------------------------------
   FORGOT PASSWORD, step 1
   Always answers the same way, so nobody can use it to find
   out which emails are registered.
   -------------------------------------------------- */

router.post("/forgot-password", authLimiter, asyncHandler(async function(req, res) {

    let email = normalizeEmail(req.body.email);
    let portal = req.body.portal;

    res.json({
        message: "If that email is registered, a reset code was sent."
    });


    // The work below happens after the answer was sent
    try {

        if (!PORTALS.includes(portal) || !isEmail(email)) {

            return;

        }

        let account = await findAccount(email, portal);

        if (!account) {

            return;

        }

        let code = String(crypto.randomInt(100000, 1000000));

        let expires = new Date(Date.now() + config.resetCodeMinutes * 60 * 1000);

        let result = await db.from("accounts").update({

            reset_code_hash: hashCode(code),
            reset_expires_at: expires.toISOString(),
            reset_attempts: 0

        }).eq("id", account.id);

        checkDatabase(result.error);

        await sendResetEmail(account.email, code, portal);

    } catch (error) {

        console.error("Forgot password failed:", error.message);

    }

}));


/* --------------------------------------------------
   FORGOT PASSWORD, step 2
   -------------------------------------------------- */

router.post("/reset-password", authLimiter, asyncHandler(async function(req, res) {

    let email = normalizeEmail(req.body.email);
    let portal = req.body.portal;
    let code = cleanText(req.body.code, 6);

    if (!PORTALS.includes(portal) || !isEmail(email) || !/^\d{6}$/.test(code)) {

        throw new HttpError(400, BAD_CODE);

    }

    let newPassword = checkPassword(req.body.newPassword);


    let account = await findAccount(email, portal);

    let usable = account &&
        account.reset_code_hash &&
        account.reset_expires_at &&
        new Date(account.reset_expires_at) > new Date() &&
        account.reset_attempts < config.maxResetAttempts;

    if (!usable) {

        throw new HttpError(400, BAD_CODE);

    }


    // Wrong code: count the try, and lock the code after too many
    if (!sameText(hashCode(code), account.reset_code_hash)) {

        let counted = await db.from("accounts").update({

            reset_attempts: account.reset_attempts + 1

        }).eq("id", account.id);

        checkDatabase(counted.error);

        throw new HttpError(400, BAD_CODE);

    }


    let passwordHash = await bcrypt.hash(newPassword, 10);

    let result = await db.from("accounts").update({

        password_hash: passwordHash,
        reset_code_hash: null,
        reset_expires_at: null,
        reset_attempts: 0

    }).eq("id", account.id);

    checkDatabase(result.error);

    res.json({ message: "Password changed" });

}));


module.exports = router;
