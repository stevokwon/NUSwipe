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

export default function EmployerSignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    console.log("Initializing Supabase with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabase = createClient();
    console.log("Attempting signUp for:", email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          role: "employer",
          company_name: companyName,
          contact_name: contactName,
        },
      },
    });

    if (error) {
      console.error("SignUp Error:", error);
      toast.error(error.message);
      setLoading(false);
      return;
    }
    console.log("SignUp Success:", data);

    if (data.user) {
      // Create the employer row in the new 'employers' table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upsertError } = await (supabase as any).from("employers").upsert({
        id: data.user.id,
        email,
        company_name: companyName,
        contact_name: contactName,
      });

      if (upsertError) {
        console.error("Employer Upsert Error:", upsertError);
        toast.error(`Employer profile creation failed: ${upsertError.message}`);
        setLoading(false);
        return;
      }
    }

    if (!data.session) {
      setIsSubmitted(true);
      setLoading(false);
      toast.success("Check your corporate email to confirm your registration!");
    } else {
      toast.success("Employer account created! Welcome to NUSwipe.");
      router.push("/employer/dashboard");
      router.refresh();
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-sm text-white text-center">
          <CardHeader>
            <div className="text-4xl mb-4">📧</div>
            <CardTitle className="text-2xl font-bold">Confirm your Corporate Email</CardTitle>
            <CardDescription className="text-slate-300">
              We've sent a verification link to <span className="text-white font-medium">{email}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Please click the link in the email to activate your employer account. This helps us ensure the security of our corporate partners.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-white/20 hover:bg-white/10 text-white"
              onClick={() => setIsSubmitted(false)}
            >
              Back to Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-sm text-white">
        <CardHeader className="text-center pb-2">
          <div className="text-4xl mb-2">🏢</div>
          <CardTitle className="text-2xl font-bold">NUSwipe for Employers</CardTitle>
          <CardDescription className="text-slate-300">
            Post job openings and swipe right on elite candidate profiles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-slate-200">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="e.g. Grab, Shopee, Stripe"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactName" className="text-slate-200">Contact Person Name</Label>
              <Input
                id="contactName"
                type="text"
                placeholder="e.g. Sarah Tan"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-200">Corporate Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="recruiting@company.com"
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
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Employer Account"}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-4">
            Already registered?{" "}
            <Link href="/employer/login" className="text-indigo-400 hover:underline">
              Employer Login
            </Link>
          </p>
          <div className="border-t border-white/10 mt-6 pt-4 text-center">
            <Link href="/login" className="text-xs text-slate-400 hover:text-white">
              Are you a Candidate? Go to Candidate Portal →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
