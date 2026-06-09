import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkUsers() {
  const { data: employers, error: empErr } = await supabase.from("employers").select("id, email, company_name");
  const { data: candidates, error: candErr } = await supabase.from("candidates").select("id, email");
  
  if (empErr) console.error("Employers Error:", empErr);
  if (candErr) console.error("Candidates Error:", candErr);
  
  console.log("Employers:", employers);
  console.log("Candidates:", candidates);
}

checkUsers();
