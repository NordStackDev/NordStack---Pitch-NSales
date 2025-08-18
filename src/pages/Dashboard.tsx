import { useState, useEffect } from "react";
import { usePitchSaleRefresh } from "@/hooks/usePitchSaleRefresh";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Target, TrendingUp, Users } from "lucide-react";
import AnimatedLineChart from "@/components/AnimatedLineChart";

type LeaderboardEntry = {
  id: string;
  name: string;
  pitches: number;
  sales: number;
  hitRate: number;
};

const Dashboard = () => {
  const { userProfile, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const { refreshKey, triggerRefresh } = usePitchSaleRefresh();
  // Lokal opdatering: Ingen realtime subscription, kun opdatering via triggerRefresh
  // State hooks (skal deklareres før fetchLeaderboard for at være i scope)
  const [stats, setStats] = useState({
    totalPitches: 0,
    totalSales: 0,
    hitRate: 0,
  });
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "monthly"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [teamChart, setTeamChart] = useState<{
    pitches: number[];
    sales: number[];
    hitRate: number[];
    labels: string[];
  }>({ pitches: [], sales: [], hitRate: [], labels: [] });
  const [sellerName, setSellerName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null
  );
  const [creatingSeller, setCreatingSeller] = useState(false);

  const fetchLeaderboard = async () => {
    if (!userProfile?.company_id) return;
    setLoadingData(true);

    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name")
      .eq("company_id", userProfile.company_id);

    if (usersError) {
      toast({
        title: "Fejl ved hentning af brugere",
        description: usersError.message,
        variant: "destructive",
      });
      setLoadingData(false);
      return;
    }

    const userIds = users.map((u) => u.id);

    // Fetch all pitches and sales for the team, sorted by date
    const { data: pitches } = await supabase
      .from("pitches")
      .select("id, user_id, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: true });
    const { data: sales } = await supabase
      .from("sales")
      .select("id, user_id, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: true });

    // Helper to group by period
    function groupByPeriod(items, period) {
      const map = new Map();
      for (const item of items) {
        const date = new Date(item.created_at);
        let key = "";
        if (period === "daily") {
          key = date.toISOString().slice(0, 10);
        } else if (period === "weekly") {
          // ISO week: yyyy-Www
          const year = date.getUTCFullYear();
          const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
          const pastDaysOfYear = Math.floor(
            (date.getTime() - firstDayOfYear.getTime()) / 86400000
          );
          const week = Math.ceil(
            (pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7
          );
          key = `${year}-W${week.toString().padStart(2, "0")}`;
        } else if (period === "monthly") {
          key = date.toISOString().slice(0, 7); // yyyy-MM
        }
        map.set(key, (map.get(key) || 0) + 1);
      }
      return map;
    }

    // Group pitches and sales by selected period
    const pitchesMap = groupByPeriod(pitches || [], period);
    const salesMap = groupByPeriod(sales || [], period);
    // Get all unique periods
    const allPeriods = Array.from(
      new Set([...pitchesMap.keys(), ...salesMap.keys()])
    ).sort();

    // Build cumulative arrays
    let cumulativePitches = 0;
    let cumulativeSales = 0;
    const pitchesArr: number[] = [];
    const salesArr: number[] = [];
    const hitRateArr: number[] = [];
    allPeriods.forEach((periodKey) => {
      cumulativePitches += pitchesMap.get(periodKey) || 0;
      cumulativeSales += salesMap.get(periodKey) || 0;
      pitchesArr.push(cumulativePitches);
      salesArr.push(cumulativeSales);
      hitRateArr.push(
        cumulativePitches > 0
          ? Math.round((cumulativeSales / cumulativePitches) * 100)
          : 0
      );
    });

    setTeamChart({
      pitches: pitchesArr,
      sales: salesArr,
      hitRate: hitRateArr,
      labels: allPeriods,
    });

    // Leaderboard and stats as before
    const leaderboardData: LeaderboardEntry[] = users.map((user) => {
      const userPitches =
        pitches?.filter((p) => p.user_id === user.id).length || 0;
      const userSales = sales?.filter((s) => s.user_id === user.id).length || 0;
      const hitRate =
        userPitches > 0 ? Math.round((userSales / userPitches) * 100) : 0;
      return {
        id: user.id,
        name: user.name,
        pitches: userPitches,
        sales: userSales,
        hitRate,
      };
    });
    setLeaderboard(leaderboardData);
    const totalPitches = leaderboardData.reduce(
      (sum, entry) => sum + entry.pitches,
      0
    );
    const totalSales = leaderboardData.reduce(
      (sum, entry) => sum + entry.sales,
      0
    );
    const hitRate =
      totalPitches > 0 ? Math.round((totalSales / totalPitches) * 100) : 0;
    setStats({ totalPitches, totalSales, hitRate });

    setLoadingData(false);
  };
  useEffect(() => {
    fetchLeaderboard();
  }, [userProfile, refreshKey, period]);

  const [copied, setCopied] = useState(false);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string } | null>(
    null
  );

  // Hent org info (company navn og id) baseret på userProfile.company_id
  useEffect(() => {
    const fetchOrgInfo = async () => {
      if (!userProfile?.company_id) {
        setOrgInfo(null);
        return;
      }
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", userProfile.company_id)
        .maybeSingle();
      if (error || !data) {
        setOrgInfo(null);
      } else {
        setOrgInfo({ id: data.id, name: data.name });
      }
    };
    fetchOrgInfo();
  }, [userProfile?.company_id]);
  // Helper: generate a strong random password
  function generatePassword(length = 12) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
    let pwd = "";
    for (let i = 0; i < length; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  }

  // Handler: create seller
  const handleCreateSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerName || !sellerEmail) {
      toast({ title: "Udfyld både navn og email", variant: "destructive" });
      return;
    }
    setCreatingSeller(true);
    setGeneratedPassword(null);
    const password = generatePassword();
    try {
      // Find StormGroup company_id
      const { data: companies, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("name", "StormGroup");
      if (companyError || !companies || companies.length === 0) {
        toast({
          title: "Kunne ikke finde StormGroup company_id",
          variant: "destructive",
        });
        setCreatingSeller(false);
        return;
      }
      const stormGroupCompanyId = companies[0].id;
      const { createSellerAsTeamlead } = await import("@/hooks/useAuth");
      const { data, error } = await createSellerAsTeamlead({
        email: sellerEmail,
        password,
        name: sellerName,
        company_id: stormGroupCompanyId,
      });
      if (error) {
        setGeneratedPassword(password); // Vis password selv ved fejl
        // Tjek om error har status property (kan være SupabaseAuthError)
        // @ts-ignore
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 429
        ) {
          toast({
            title: "For mange forsøg",
            description: "Vent et øjeblik og prøv igen.",
            variant: "destructive",
          });
        } else if (error.message?.includes("already registered")) {
          toast({
            title: "Email findes allerede",
            description: "Denne email er allerede i brug.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Fejl ved oprettelse af seller",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (!data?.user) {
        setGeneratedPassword(password);
        toast({
          title: "Ukendt fejl",
          description: "Sælgeren blev ikke oprettet. Prøv igen.",
          variant: "destructive",
        });
      } else {
        setGeneratedPassword(password);
        toast({
          title: "Seller oprettet!",
          description: "En bekræftelsesmail er sendt til ${sellerEmail}.",
          variant: "default",
        });
        setSellerName("");
        setSellerEmail("");
      }
    } catch (err: any) {
      setGeneratedPassword(password); // Vis password selv ved fejl
      toast({
        title: "Uventet fejl",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setCreatingSeller(false);
    }
  };

  // Efter logning af pitch/sale: triggerRefresh + fetchLeaderboard for at sikre UI opdateres straks
  const handleLogPitchOrSale = async () => {
    triggerRefresh();
    await fetchLeaderboard();
  };

  // Filtered leaderboard for search
  const filteredLeaderboard = leaderboard.filter((entry) =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loader data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
            {orgInfo && (
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                Org: <span className="font-semibold">{orgInfo.name}</span> (
                <span className="font-mono">{orgInfo.id}</span>
                <button
                  type="button"
                  className="ml-1 p-1 rounded hover:bg-muted focus:outline-none"
                  title="Copy org-id"
                  onClick={async () => {
                    await navigator.clipboard.writeText(orgInfo.id);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                >
                  <Copy className="inline h-4 w-4" />
                </button>
                {copied && <span className="text-green-600 ml-1">Copied!</span>}
                )
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {userProfile?.name} (Team Leader)
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Opret seller form */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Opret ny seller</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col md:flex-row gap-4 items-end"
              onSubmit={handleCreateSeller}
            >
              <div className="flex-1">
                <Label htmlFor="sellerName">Navn</Label>
                <Input
                  id="sellerName"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  required
                  disabled={creatingSeller}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="sellerEmail">Email</Label>
                <Input
                  id="sellerEmail"
                  type="email"
                  value={sellerEmail}
                  onChange={(e) => setSellerEmail(e.target.value)}
                  required
                  disabled={creatingSeller}
                />
              </div>
              <Button
                type="submit"
                disabled={creatingSeller || !sellerName || !sellerEmail}
                className="h-10"
              >
                Opret seller
              </Button>
            </form>
            {generatedPassword && (
              <div className="mt-4 p-3 bg-muted rounded">
                <div className="font-semibold mb-1">
                  Adgangskode til seller:
                </div>
                <div className="font-mono select-all text-lg">
                  {generatedPassword}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Giv denne adgangskode til sælgeren. De skal bekræfte deres
                  email før login.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pitches
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPitches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hitRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Team performance graf: X = pitches, Y = sales, Hit Rate % */}
        <div className="my-8">
          <div className="mb-4 flex items-center gap-2">
            <label htmlFor="period-select" className="font-medium">
              Periode:
            </label>
            <select
              id="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="border rounded px-2 py-1"
            >
              <option value="daily">Dag</option>
              <option value="weekly">Uge</option>
              <option value="monthly">Måned</option>
            </select>
          </div>
          <AnimatedLineChart
            labels={teamChart.labels}
            datasets={[
              {
                label: "Cumulative Pitches (X)",
                data: teamChart.pitches,
                borderColor: "#FF6384",
                backgroundColor: "rgba(255,99,132,0.2)",
                yAxisID: "y",
              },
              {
                label: "Cumulative Sales (Y)",
                data: teamChart.sales,
                borderColor: "#4BC0C0",
                backgroundColor: "rgba(75,192,192,0.2)",
                yAxisID: "y",
              },
              {
                label: "Hit Rate %",
                data: teamChart.hitRate,
                borderColor: "#36A2EB",
                backgroundColor: "rgba(54,162,235,0.2)",
                yAxisID: "y1",
              },
            ]}
          />
        </div>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Team Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Søg på navn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-2">
              {filteredLeaderboard.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">
                  Ingen brugere matcher søgningen.
                </div>
              ) : (
                filteredLeaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-muted">
                        {index + 1}
                      </div>
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>Pitches: {entry.pitches}</span>
                      <span>Sales: {entry.sales}</span>
                      <Badge>{entry.hitRate}%</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
