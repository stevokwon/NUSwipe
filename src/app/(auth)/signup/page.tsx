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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      }
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Create the profile row manually (more reliable than a DB trigger)
    if (data.user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("profiles").upsert({ id: data.user.id, email });
    }

    if (!data.session) {
      setIsSubmitted(true);
      setLoading(false);
      toast.success("Check your email to confirm your account!");
    } else {
      toast.success("Account created! Complete your profile to start swiping.");
      router.push("/profile");
      router.refresh();
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <Card className="w-full max-w-sm border-white/10 bg-white/5 backdrop-blur-sm text-white text-center">
          <CardHeader>
            <div className="text-4xl mb-4">📧</div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription className="text-slate-300">
              We've sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Please click the link in the email to activate your account. If you don't see it, check your spam folder.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-white/20 hover:bg-white/10 text-white"
              onClick={() => setIsSubmitted(false)}
            >
              Back to Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <Card className="w-full max-w-sm border-white/10 bg-white/5 backdrop-blur-sm text-white">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl mb-2">🚀</div>
          <CardTitle className="text-2xl font-bold">Join NUSwipe</CardTitle>
          <CardDescription className="text-slate-300">
            Built by NUS students for APAC grads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-200">University Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@u.nus.edu"
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
                placeholder="min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-400 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
