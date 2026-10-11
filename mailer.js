/* ==================================================
   EMAIL
   Sends the password reset code.
   If SMTP is not set up, the code is printed in this
   server's console instead (development only).
   ================================================== */

const nodemailer = require("nodemailer");

const config = require("./config");


let transporter = null;

if (config.smtp.host) {

    transporter = nodemailer.createTransport({

        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,

        auth: config.smtp.user
            ? { user: config.smtp.user, pass: config.smtp.pass }
            : undefined

    });

}


async function sendResetEmail(to, code, portal) {

    if (!transporter) {

        if (config.isProduction) {

            console.error("Email is not set up. Could not send a reset code.");

        } else {

            console.log("[DEV] Reset code for " + to + " (" + portal + "): " + code);

        }

        return;

    }


    await transporter.sendMail({

        from: config.smtp.from,
        to: to,
        subject: "Your password reset code",

        text:
            "Your reset code is " + code + ".\n" +
            "It expires in " + config.resetCodeMinutes + " minutes.\n\n" +
            "If you did not ask for this, you can ignore this email."

    });

}


module.exports = { sendResetEmail };
