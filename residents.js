/* ==================================================
   RESIDENTS (staff only)

   GET /api/residents    every registered resident
   ================================================== */

const express = require("express");

const db = require("../database");
const { requireLogin, requireStaff } = require("../middleware/requireLogin");

const {
    asyncHandler,
    checkDatabase,
    toUser
} = require("../helpers");


const router = express.Router();

router.use(requireLogin, requireStaff);


router.get("/", asyncHandler(async function(req, res) {

    let result = await db
        .from("accounts")
        .select("*")
        .eq("role", "resident")
        .order("created_at", { ascending: false });

    checkDatabase(result.error);

    res.json(result.data.map(toUser));

}));


module.exports = router;
