"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Verify role - prevent employers from logging into candidate portal
    if (data.user) {
      // 1. Check metadata (instant and reliable)
      const userRole = data.user.user_metadata?.role;
      
      // 2. Fallback check profile table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const finalRole = userRole || profile?.role;

      if (finalRole === "employer") {
        await supabase.auth.signOut();
        toast.error("This account is registered as an Employer. Please use the Employer Portal.");
        setLoading(false);
        return;
      }
    }

    router.push("/swipe");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <Card className="w-full max-w-sm border-white/10 bg-white/5 backdrop-blur-sm text-white">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl mb-2">💼</div>
          <CardTitle className="text-2xl font-bold">NUSwipe</CardTitle>
          <CardDescription className="text-slate-300">
            Swipe right, get hired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@nus.edu.sg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-4">
            No account?{" "}
            <Link href="/signup" className="text-purple-400 hover:underline">
              Sign up free
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
