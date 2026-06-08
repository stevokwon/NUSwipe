import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-xl space-y-6">
        <div className="text-7xl">💼</div>
        <h1 className="text-5xl font-black text-white leading-tight">
          Swipe Right.<br />Get Hired.
        </h1>
        <p className="text-lg text-slate-300 max-w-md mx-auto">
          The first job application app built for APAC university students.
          Swipe right on your dream MNC role — we submit the application automatically.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          {[
            "🇸🇬 SG & 🇭🇰 HK focused",
            "Greenhouse & Lever support",
            "Auto-submits on swipe",
            "Built by NUS students",
          ].map((f) => (
            <span
              key={f}
              className="bg-white/10 text-slate-300 border border-white/10 rounded-full px-3 py-1"
            >
              {f}
            </span>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex gap-3 justify-center pt-2">
          <Link
            href="/signup"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-7 py-3 rounded-xl transition-colors text-sm"
          >
            Get Started — Free
          </Link>
          <Link
            href="/login"
            className="bg-white/10 hover:bg-white/20 text-white font-medium px-7 py-3 rounded-xl transition-colors text-sm border border-white/10"
          >
            Sign In
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/employer/login"
            className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition-all"
          >
            Are you a Recruiter? Hire on NUSwipe →
          </Link>
        </div>

        <p className="text-xs text-slate-600 pt-2">
          Built for NUS · NTU · HKU · HKUST · CUHK
        </p>
      </div>
    </main>
  );
}
