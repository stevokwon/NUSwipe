import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  
  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')

  if (token_hash && type) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!error && data.user) {
      const metadata = data.user.user_metadata
      const role = metadata.role || 'candidate'

      // Create or update the profile row now that we are authenticated
      if (role === 'employer') {
        const nameParts = (metadata.contact_name || "").split(" ")
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email,
          role: "employer",
          first_name: nameParts[0] || "",
          last_name: nameParts.slice(1).join(" ") || "",
          preferred_name: metadata.company_name || "",
        })
        
        await supabase.auth.signOut()
        redirectTo.pathname = '/employer/login'
      } else {
        await supabase.from("profiles").upsert({ 
          id: data.user.id, 
          email: data.user.email,
          role: "candidate"
        })
        
        await supabase.auth.signOut()
        redirectTo.pathname = '/login'
      }
      
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = '/error'
  return NextResponse.redirect(redirectTo)
}
