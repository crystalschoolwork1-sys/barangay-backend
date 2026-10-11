/* ==================================================
   BARANGAY DOCUMENT PROCESSING - BACKEND
   Start it with:  npm start
   ================================================== */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const config = require("./config");
const { HttpError } = require("./helpers");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const requestRoutes = require("./routes/requests");
const residentRoutes = require("./routes/residents");


const app = express();


app.use(helmet());

// Only the pages listed in ALLOWED_ORIGINS may call this API
app.use(cors({

    origin: function(origin, callback) {

        // No origin means a tool like curl, not a web page
        if (!origin || config.allowedOrigins.includes(origin)) {

            return callback(null, true);

        }

        callback(new HttpError(403, "This page is not allowed to use the API."));

    }

}));

app.use(express.json({ limit: "50kb" }));


/* ----- routes ----- */

app.get("/api/health", function(req, res) {

    res.json({ ok: true });

});

app.use("/api", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/residents", residentRoutes);


app.use("/api", function(req, res) {

    res.status(404).json({ message: "Not found." });

});


/* ----- errors ----- */

app.use(function(error, req, res, next) {

    if (error instanceof HttpError) {

        return res.status(error.status).json({ message: error.message });

    }

    // Broken JSON in the request body
    if (error.type === "entity.parse.failed") {

        return res.status(400).json({ message: "Bad request." });

    }

    console.error(error);

    res.status(500).json({ message: "Something went wrong. Try again." });

});


app.listen(config.port, function() {

    console.log("API running at http://localhost:" + config.port);

});
