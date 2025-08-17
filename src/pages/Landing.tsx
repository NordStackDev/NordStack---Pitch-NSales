// Custom hook til count up animation
function useCountUp(target: number, duration = 500) {
  const [value, setValue] = useState(target);
  const raf = useRef<number>();

  useEffect(() => {
    const start = value;
    const change = target - start;
    if (change === 0) return;
    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(start + change * progress));
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      }
    }
    raf.current = requestAnimationFrame(animate);
    return () => raf.current && cancelAnimationFrame(raf.current);
    // eslint-disable-next-line
  }, [target]);

  return value;
}
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { usePitchSaleRefresh } from "@/hooks/usePitchSaleRefresh";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Target } from "lucide-react";



const Landing = () => {
  const [actionLoading, setActionLoading] = useState(false);
  const { userProfile, loading, signOut } = useAuth();
  const { triggerRefresh } = usePitchSaleRefresh();
  const { toast } = useToast();

  // State til brugerens egne stats og animation
  const [myStats, setMyStats] = useState({ totalPitches: 0, totalSales: 0, hitRate: 0 });
  const [statsKey, setStatsKey] = useState(0); // For at trigge animation

  // Hent brugerens egne stats
  useEffect(() => {
    const fetchMyStats = async () => {
      if (!userProfile) return;
      // Hent pitches
      const { data: pitches, error: pitchError } = await supabase
        .from("pitches")
        .select("id")
        .eq("user_id", userProfile.id);
      // Hent sales
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id")
        .eq("user_id", userProfile.id);
      const totalPitches = pitches?.length || 0;
      const totalSales = sales?.length || 0;
      const hitRate = totalPitches > 0 ? Math.round((totalSales / totalPitches) * 100) : 0;
  setMyStats({ totalPitches, totalSales, hitRate });
  setStatsKey(k => k + 1); // Trigger animation
    };
    fetchMyStats();
  }, [userProfile, triggerRefresh]);



  const handleLogPitch = async () => {
    if (!userProfile) return;
    setActionLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0]; // UTC-dato
      const { data, error } = await supabase
        .from("pitches")
        .insert({
          user_id: userProfile.id,
          content: "1",
          created_at: new Date().toISOString(),
        });
      console.log("Pitch insert response", { data, error });
      if (error) throw error;
      toast({ title: "Pitch logget!", description: `Din pitch er gemt.` });
      // Opdater stats lokalt for live feedback
      setMyStats(prev => {
        const totalPitches = prev.totalPitches + 1;
        const totalSales = prev.totalSales;
        const hitRate = totalPitches > 0 ? Math.round((totalSales / totalPitches) * 100) : 0;
        return { totalPitches, totalSales, hitRate };
      });
      setStatsKey(k => k + 1);
      triggerRefresh();
    } catch (error: any) {
      console.error("Pitch insert error", error);
      toast({ title: "Fejl ved logning af pitch", description: JSON.stringify(error), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogSale = async () => {
    if (!userProfile) return;
    setActionLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sales")
        .insert({
          user_id: userProfile.id,
          amount: 1,
          created_at: new Date().toISOString(),
        });
      console.log("Sale insert response", { data, error });
      if (error) throw error;
      toast({ title: "Salg logget!", description: `Dit salg er gemt.` });
      // Opdater stats lokalt for live feedback
      setMyStats(prev => {
        const totalPitches = prev.totalPitches;
        const totalSales = prev.totalSales + 1;
        const hitRate = totalPitches > 0 ? Math.round((totalSales / totalPitches) * 100) : 0;
        return { totalPitches, totalSales, hitRate };
      });
      setStatsKey(k => k + 1);
      triggerRefresh();
    } catch (error: any) {
      console.error("Sale insert error", error);
      toast({ title: "Fejl ved logning af salg", description: JSON.stringify(error), variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center h-screen"><p>Loader...</p></div>;
  }

  if (!userProfile) {
    return <Navigate to="/auth" replace />;
  }

  // Animated values
  const animatedPitches = useCountUp(myStats.totalPitches);
  const animatedSales = useCountUp(myStats.totalSales);
  const animatedHitRate = useCountUp(myStats.hitRate);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border p-4">
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-primary">Nordstack Pitch'nSales</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {userProfile?.name}</span>
            <Button variant="outline" onClick={signOut}>Sign Out</Button>
          </div>
        </div>
      </header>
      {/* Brugerens egne stats */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Velkommen til salgsoversigten</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Log pitches og salg hurtigt.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <Button onClick={handleLogPitch} className="flex-1 h-16 text-lg font-medium" variant="outline" disabled={actionLoading} aria-busy={actionLoading}>
              <Target className="mr-2 h-6 w-6" />
              Log pitch
            </Button>
            <Button onClick={handleLogSale} className="flex-1 h-16 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90" disabled={actionLoading} aria-busy={actionLoading}>
              <TrendingUp className="mr-2 h-6 w-6" />
              Log salg
            </Button>
          </div>
          {/* Stats med animation under knapperne */}
          <div
            key={statsKey}
            className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 animate-fade-in"
            style={{
              animation: 'fadeInUp 0.5s',
            }}
          >
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center transition-all duration-500">
              <div className="text-xs text-muted-foreground mb-1">Dine pitches</div>
              <div className="text-2xl font-bold">{animatedPitches}</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center transition-all duration-500">
              <div className="text-xs text-muted-foreground mb-1">Dine salg</div>
              <div className="text-2xl font-bold">{animatedSales}</div>
            </div>
            <div className="bg-muted rounded-lg p-4 flex flex-col items-center transition-all duration-500">
              <div className="text-xs text-muted-foreground mb-1">Din hitrate</div>
              <div className="text-2xl font-bold">{animatedHitRate}%</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
