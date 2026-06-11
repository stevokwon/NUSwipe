import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkProfileRole() {
  const { data: profiles, error } = await supabase.from("profiles").select("id, role");
  
  if (error) console.error("Error:", error);
  console.log("Profiles:", profiles);
}

checkProfileRole();
