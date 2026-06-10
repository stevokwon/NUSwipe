import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const code = searchParams.get('code')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'
  
  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('code')
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

      // Create or update the user row in the correct table now that we are authenticated
      if (role === 'employer') {
        await supabase.from("employers").upsert({
          id: data.user.id,
          email: data.user.email,
          company_name: metadata.company_name || "",
          contact_name: metadata.contact_name || "",
        })
        
        await supabase.auth.signOut()
        redirectTo.pathname = '/employer/login'
      } else {
        await supabase.from("candidates").upsert({ 
          id: data.user.id, 
          email: data.user.email
        })
        
        await supabase.auth.signOut()
        redirectTo.pathname = '/login'
      }
      
      return NextResponse.redirect(redirectTo)
    }
  } else if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      const metadata = data.user.user_metadata
      const role = metadata.role || 'candidate'

      if (role === 'employer') {
        await supabase.from("employers").upsert({
          id: data.user.id,
          email: data.user.email,
          company_name: metadata.company_name || "",
          contact_name: metadata.contact_name || "",
        })
        
        await supabase.auth.signOut()
        redirectTo.pathname = '/employer/login'
      } else {
        await supabase.from("candidates").upsert({ 
          id: data.user.id, 
          email: data.user.email
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
