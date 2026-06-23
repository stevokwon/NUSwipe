"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Employer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail, User, Save, RefreshCw } from "lucide-react";

export default function EmployerProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setProfile] = useState<Employer | null>(null);

  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: "",
    email: "",
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/employer/login");
        return;
      }

      const { data, error } = await supabase
        .from("employers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      if (data) {
       const emp = data as Employer;
        setProfile(emp as Employer);
        setFormData({
          company_name: emp.company_name || "",
          contact_name: emp.contact_name || "",
          email: emp.email || "",
        });
      }
    } catch (err: unknown) {
      toast.error("Failed to load profile");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("employers")
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name,
        })
        .eq("id", user.id);

      if (error) throw error;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              company_name: formData.company_name,
              contact_name: formData.contact_name,
            }
          : prev
      );
      toast.success("Profile updated successfully");
      await loadProfile();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recruiter Profile</h1>
        <p className="text-slate-400 mt-1">Manage your company details and contact information.</p>
      </div>

      <div className="grid gap-8">
        <Card className="bg-slate-900/40 border-white/5 shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-6">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-400" />
              Company Information
            </CardTitle>
            <CardDescription>This information will be shown on your job postings.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name" className="text-slate-400 text-xs font-bold uppercase tracking-wider">Company Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="e.g. Goldman Sachs"
                      className="pl-10 bg-slate-950 border-white/10 focus:border-indigo-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_name" className="text-slate-400 text-xs font-bold uppercase tracking-wider">NAME</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="contact_name"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="Full Name"
                      className="pl-10 bg-slate-950 border-white/10 focus:border-indigo-500/50"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-slate-400 text-xs font-bold uppercase tracking-wider">Work Email (Read-only)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      value={formData.email}
                      disabled
                      className="pl-10 bg-slate-900/50 border-white/5 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] shadow-lg shadow-indigo-500/20 gap-2"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Section Placeholder */}
        <Card className="bg-slate-900/40 border-white/5">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Account Security</CardTitle>
            <CardDescription className="text-xs">Manage your password and authentication settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="border-white/10 text-xs h-9 hover:bg-white/5">
              Change Password
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
