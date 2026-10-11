/* ==================================================
   PROFILE

   GET /api/profile    the signed-in person's details
   PUT /api/profile    change name, address and contact number
   ================================================== */

const express = require("express");

const db = require("../database");
const { requireLogin } = require("../middleware/requireLogin");

const {
    HttpError,
    asyncHandler,
    cleanText,
    checkDatabase,
    toUser
} = require("../helpers");


const router = express.Router();

router.use(requireLogin);


router.get("/", function(req, res) {

    res.json(toUser(req.user));

});


router.put("/", asyncHandler(async function(req, res) {

    let name = cleanText(req.body.name, 100);
    let address = cleanText(req.body.address, 200);
    let contact = cleanText(req.body.contact, 30);

    if (!name) {

        throw new HttpError(400, "Please enter your name.");

    }


    let result = await db
        .from("accounts")
        .update({ name: name, address: address, contact: contact })
        .eq("id", req.user.id)
        .select()
        .single();

    checkDatabase(result.error);

    res.json(toUser(result.data));

}));


module.exports = router;
