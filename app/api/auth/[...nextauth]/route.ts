import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      console.log("🔐 signIn - Account:", !!account?.access_token);

      if (account?.access_token && user.email) {
        try {
          const supabase = createServiceRoleClient();
          const { error } = await supabase.from("calendar_connections").upsert({
            employer_id: user.id,
            google_calendar_token: account.access_token,
            google_calendar_refresh_token: account.refresh_token || null,
            provider_account_email: user.email,
            token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any);

          console.log("✅ Saved - Error?", !!error);
        } catch (err) {
          console.error("❌ Error:", err);
          return false;
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };