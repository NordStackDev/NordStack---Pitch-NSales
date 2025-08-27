// Utility: Teamlead creates a seller without logging out
export async function createSellerAsTeamlead({
  email,
  password,
  name,
  company_id,
}: {
  email: string;
  password: string;
  name: string;
  company_id: string;
}) {
  const { createClient } = await import("@supabase/supabase-js");
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sikrer at company_id er en streng og ikke tom/null
  const companyIdStr = String(company_id);
  if (
    !companyIdStr ||
    companyIdStr === "null" ||
    companyIdStr === "undefined"
  ) {
    const error = new Error("company_id er ikke sat. Seller oprettes ikke.");
    console.error(error.message);
    return { data: null, error };
  }

  console.log("Starting createSellerAsTeamlead", {
    email,
    name,
    company_id: companyIdStr,
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: "seller", company_id: companyIdStr },
      emailRedirectTo: window.location.origin + "/auth",
    },
  });

  if (error) {
    console.error("Error in createSellerAsTeamlead", error);
  } else {
    console.log("Seller created successfully", data);
  }

  return { data, error };
}
import { useState, useEffect, createContext, useContext, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// UserProfile matches the shape of the users table
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "team_lead" | "seller";
  company_id: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role: "team_lead" | "seller"
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Prevent multiple fetches/upserts per session
  const fetchedProfileRef = useRef<string | null>(null);

  /**
   * Fetches or creates a user profile in the users table for the given auth user.
   * Only runs once per session/user.
   */
  const fetchUserProfile = async (authUser: User) => {
    if (fetchedProfileRef.current === authUser.id) return;
    fetchedProfileRef.current = authUser.id;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        // Hent AMSales company_id (forventes at være oprettet én gang i companies-tabellen)
        const { data: companies, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("name", "AMSales");
        if (companyError || !companies || companies.length === 0) {
          setUserProfile(null);
          setError("Kunne ikke finde AMSales company_id");
          return;
        }
        const amsalesCompanyId = companies[0].id;
        // Create user profile if not exists
        const { data: newUser, error: upsertError } = await supabase
          .from("users")
          .upsert(
            {
              id: authUser.id,
              email: authUser.email?.toLowerCase() || "",
              name: authUser.email?.split("@")[0] || "Demo User",
              role: "team_lead",
              company_id: amsalesCompanyId,
            },
            { onConflict: "id" }
          )
          .select()
          .maybeSingle();
        if (upsertError) {
          console.error("[Auth] users upsert error:", upsertError);
          setUserProfile(null);
          setError("Kunne ikke oprette brugerprofil: " + upsertError.message);
          return;
        }
        if (!newUser) {
          console.error("[Auth] users upsert returned no data");
          setUserProfile(null);
          setError("Kunne ikke oprette brugerprofil: Ingen data fra upsert.");
          return;
        }
        setUserProfile(newUser as UserProfile);
      } else {
        setUserProfile(data as UserProfile);
      }
      setError(null);
    } catch (err: any) {
      console.error("[Auth] fetchUserProfile error:", err);
      setUserProfile(null);
      setError(err?.message || String(err));
    }
  };

  useEffect(() => {
    // Only run on mount
    let mounted = true;
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (!mounted) return;
        if (error) {
          setUser(null);
          setUserProfile(null);
          setError(error.message);
          setLoading(false);
          return;
        }
        const session = data.session;
        if (session?.user) {
          setUser(session.user);
          fetchUserProfile(session.user);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    initSession();
    // Listen for auth state changes (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign in user and fetch profile
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        return { error };
      }
      if (data?.user) {
        setUser(data.user);
        await fetchUserProfile(data.user);
      }
      setError(null);
      return { error: null };
    } catch (err: any) {
      setError(err?.message || String(err));
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign up user (team_lead or seller)
  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: "team_lead" | "seller"
  ): Promise<{ error: Error | null }> => {
    setLoading(true);
    try {
      // Teamlead signup: company_id sættes i backend eller efterfølgende, ikke her
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, role },
        },
      });
      if (res.error) {
        setError(res.error.message);
        return { error: res.error };
      }
      setError(null);
      return { error: null };
    } catch (err: any) {
      setError(err?.message || String(err));
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Sign out user and clear state
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    setError(null);
    fetchedProfileRef.current = null;
  };

  // Provide auth context to children
  return (
    <AuthContext.Provider
      value={{ user, userProfile, loading, error, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for consuming auth context
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
