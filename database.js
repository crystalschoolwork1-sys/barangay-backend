/* ==================================================
   DATABASE (Supabase)
   The service_role key bypasses row level security,
   so this file must only ever run on the server.
   ================================================== */

const { createClient } = require("@supabase/supabase-js");

const config = require("./config");


module.exports = createClient(config.supabaseUrl, config.supabaseServiceKey, {

    auth: {
        persistSession: false,
        autoRefreshToken: false
    }

});
