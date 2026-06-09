import { createClient } from "@supabase/supabase-js";
// Using require directly for better compatibility in script runner
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testCandidateInsert() {
  const testId = "00000000-0000-0000-0000-000000000000"; // Dummy UUID
  const { data, error } = await supabase.from("candidates").upsert({
    id: testId,
    email: "test@example.com"
  });

  if (error) {
    console.error("Test Insert Error:", error);
  } else {
    console.log("Test Insert Success");
  }
}

testCandidateInsert();
