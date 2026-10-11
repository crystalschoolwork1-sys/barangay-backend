/* ==================================================
   CREATE A STAFF ACCOUNT
   Staff cannot register on the website. A barangay
   administrator creates their accounts with this command:

   npm run create-staff -- "Full Name" email@example.com password123
   ================================================== */

const bcrypt = require("bcryptjs");

const db = require("../database");

const {
    cleanText,
    normalizeEmail,
    isEmail
} = require("../helpers");


async function main() {

    let name = cleanText(process.argv[2], 100);
    let email = normalizeEmail(process.argv[3]);
    let password = process.argv[4] || "";

    if (!name || !isEmail(email) || password.length < 8) {

        console.log('Use:  npm run create-staff -- "Full Name" email@example.com password');

        console.log("The password needs at least 8 characters.");

        process.exit(1);

    }


    let passwordHash = await bcrypt.hash(password, 10);

    let result = await db.from("accounts").insert({

        role: "staff",
        name: name,
        email: email,
        password_hash: passwordHash

    });

    if (result.error && result.error.code === "23505") {

        console.log("That email already has an account.");

        process.exit(1);

    }

    if (result.error) {

        console.log("Could not create the account:", result.error.message);

        process.exit(1);

    }

    console.log("Staff account created for " + email);

}


main();
