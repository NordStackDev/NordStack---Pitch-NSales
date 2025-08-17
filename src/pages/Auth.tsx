import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  const { signIn, signUp, error } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message?.includes("Email not confirmed")) {
            setPendingConfirmation(true);
          }
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive",
          });
        } else {
          // Vent på at userProfile er sat før redirect
          setTimeout(() => navigate("/"), 100);
        }
      } else {
        // Signup flow: team_lead (StormGroup logik håndteres i useAuth)
        const { error: signUpError } = await signUp(email, password, name, 'team_lead');
        if (signUpError) {
          toast({
            title: "Signup failed",
            description: signUpError.message,
            variant: "destructive",
          });
        } else {
          setPendingConfirmation(true);
          toast({
            title: "Account created",
            description:
              "Check din email og bekræft din konto før du logger ind.",
          });
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const showConfirmation =
    pendingConfirmation || error === "Email not confirmed";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            Nordstack Pitch'nSales
          </CardTitle>
          <CardDescription>
            {showConfirmation
              ? "Tjek din email for bekræftelse"
              : isLogin
              ? "Log ind"
              : "Opret teamlead"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && !showConfirmation && (
            <div className="mb-4 text-center text-red-600 text-sm font-medium">
              {error}
            </div>
          )}
          {showConfirmation ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Vi har sendt en bekræftelsesmail til <b>{email}</b>. Bekræft din
                konto og log derefter ind.
              </p>
              <Button onClick={() => setPendingConfirmation(false)}>
                Tilbage til login
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Navn</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Adgangskode</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Button
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm"
                >
                  {isLogin
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;