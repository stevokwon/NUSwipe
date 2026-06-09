import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-sm text-white text-center">
        <CardHeader>
          <div className="text-4xl mb-4">⚠️</div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription className="text-slate-300">
            Something went wrong while verifying your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-400">
            This could be because the link has expired or has already been used. Please try signing up again or contact support if the problem persists.
          </p>
          <div className="flex flex-col gap-2">
            <Link 
              href="/signup" 
              className={cn(buttonVariants({ variant: "default" }), "bg-purple-600 hover:bg-purple-700 w-full")}
            >
              Back to Candidate Sign Up
            </Link>
            <Link 
              href="/employer/signup" 
              className={cn(buttonVariants({ variant: "outline" }), "border-white/20 hover:bg-white/10 w-full")}
            >
              Back to Employer Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
