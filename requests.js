/* ==================================================
   DOCUMENT REQUESTS

   POST /api/requests              resident sends a new request
   GET  /api/requests              residents see their own, staff see all
   GET  /api/requests/:id          one request
   PUT  /api/requests/:id/status   staff change the status
   ================================================== */

const express = require("express");

const db = require("../database");
const { requireLogin, requireStaff } = require("../middleware/requireLogin");

const {
    DOCUMENT_TYPES,
    RELEASE_METHODS,
    STATUSES,
    HttpError,
    asyncHandler,
    cleanText,
    checkDatabase,
    toRequest
} = require("../helpers");


const router = express.Router();

router.use(requireLogin);


// A request together with the resident who sent it
const WITH_RESIDENT =
    "*, resident:accounts!resident_id(name, email, address, contact)";


function checkId(value) {

    if (!/^\d{1,15}$/.test(value)) {

        throw new HttpError(404, "Request not found.");

    }

    return Number(value);

}


/* --------------------------------------------------
   NEW REQUEST (residents only)
   -------------------------------------------------- */

router.post("/", asyncHandler(async function(req, res) {

    if (req.user.role !== "resident") {

        throw new HttpError(403, "Only residents can request documents.");

    }

    let documentType = req.body.documentType;
    let releaseMethod = req.body.releaseMethod;
    let purpose = cleanText(req.body.purpose, 500);

    if (!DOCUMENT_TYPES.includes(documentType)) {

        throw new HttpError(400, "Please choose a document.");

    }

    if (!purpose) {

        throw new HttpError(400, "Please enter the purpose.");

    }

    if (!RELEASE_METHODS.includes(releaseMethod)) {

        throw new HttpError(400, "Please choose how you want to receive it.");

    }


    let result = await db
        .from("requests")
        .insert({
            resident_id: req.user.id,
            document_type: documentType,
            purpose: purpose,
            release_method: releaseMethod,
            status: "Pending"
        })
        .select(WITH_RESIDENT)
        .single();

    checkDatabase(result.error);

    res.status(201).json(toRequest(result.data));

}));


/* --------------------------------------------------
   LIST
   -------------------------------------------------- */

router.get("/", asyncHandler(async function(req, res) {

    let query = db
        .from("requests")
        .select(WITH_RESIDENT)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });

    // Residents only ever see their own requests
    if (req.user.role !== "staff") {

        query = query.eq("resident_id", req.user.id);

    }

    let result = await query;

    checkDatabase(result.error);

    res.json(result.data.map(toRequest));

}));


/* --------------------------------------------------
   ONE REQUEST
   -------------------------------------------------- */

router.get("/:id", asyncHandler(async function(req, res) {

    let id = checkId(req.params.id);

    let result = await db
        .from("requests")
        .select(WITH_RESIDENT)
        .eq("id", id)
        .maybeSingle();

    checkDatabase(result.error);

    let row = result.data;

    // Someone else's request looks the same as one that does not exist
    let allowed = row &&
        (req.user.role === "staff" || row.resident_id === req.user.id);

    if (!allowed) {

        throw new HttpError(404, "Request not found.");

    }

    res.json(toRequest(row));

}));


/* --------------------------------------------------
   CHANGE STATUS (staff only)
   -------------------------------------------------- */

router.put("/:id/status", requireStaff, asyncHandler(async function(req, res) {

    let id = checkId(req.params.id);

    if (!STATUSES.includes(req.body.status)) {

        throw new HttpError(400, "That status is not valid.");

    }


    let result = await db
        .from("requests")
        .update({
            status: req.body.status,
            updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .select(WITH_RESIDENT)
        .maybeSingle();

    checkDatabase(result.error);

    if (!result.data) {

        throw new HttpError(404, "Request not found.");

    }

    res.json(toRequest(result.data));

}));


module.exports = router;
