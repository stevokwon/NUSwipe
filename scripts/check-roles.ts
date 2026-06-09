import { createClient } from "@supabase/supabase-js";
require("dotenv").config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkRoles() {
  const { data, error } = await supabase.from("profiles").select("id, email, role");
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Profiles:", data);
}

checkRoles();
