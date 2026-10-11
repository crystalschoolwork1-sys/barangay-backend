/* ==================================================
   SETTINGS
   Everything comes from the ".env" file.
   ================================================== */

require("dotenv").config();


function required(name) {

    let value = process.env[name];

    if (!value) {

        console.error("Missing " + name + " in the .env file.");

        process.exit(1);

    }

    return value;

}


let jwtSecret = required("JWT_SECRET");

if (jwtSecret.length < 32) {

    console.error("JWT_SECRET is too short. Use at least 32 characters.");

    process.exit(1);

}


module.exports = {

    port: Number(process.env.PORT) || 3000,

    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),

    jwtSecret: jwtSecret,
    tokenHours: 8,

    allowedOrigins: (process.env.ALLOWED_ORIGINS ||
        "http://127.0.0.1:5500,http://localhost:5500")
        .split(",")
        .map(function(origin) {
            return origin.trim();
        })
        .filter(Boolean),

    resetCodeMinutes: 15,
    maxResetAttempts: 5,

    isProduction: process.env.NODE_ENV === "production",

    smtp: {
        host: process.env.SMTP_HOST || "",
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
        from: process.env.SMTP_FROM || "Barangay Document System <no-reply@example.com>"
    }

};
