import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Upload, BookOpen, LogOut, Crown, Shield, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  flashcards: { count: number }[];
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check auth status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadFlashcardSets(session.user.id);
        checkUserStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserStatus = async (userId: string) => {
    // Check premium status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .single();
    
    if (profile) {
      setIsPremium(profile.is_premium || false);
    }

    // Check admin status
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");
    
    if (roles && roles.length > 0) {
      setIsAdmin(true);
      setIsPremium(true); // Admin always has premium
    }
  };

  const loadFlashcardSets = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("flashcard_sets")
        .select(`
          id,
          title,
          description,
          created_at,
          flashcards(count)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSets(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load flashcard sets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-primary">Ethiocard AI</h1>
              {isPremium && (
                <Badge className="gap-1 text-xs">
                  <Crown className="w-3 h-3" />
                  Premium
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Shield className="w-3 h-3" />
                  Admin
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="flex-1 sm:flex-none">
                  <Shield className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Admin Panel</span>
                </Button>
              )}
              {!isPremium && (
                <Button variant="outline" size="sm" onClick={() => navigate("/premium")} className="flex-1 sm:flex-none">
                  <Crown className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Get Premium</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex-1 sm:flex-none">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Your Flashcard Sets</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Create new sets or review existing ones
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/upload")}
              className="gap-2 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              Upload Files
            </Button>
          </div>

          {/* Flashcard Sets Grid */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading your flashcards...</p>
            </div>
          ) : sets.length === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No flashcard sets yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first file to get started with AI-generated flashcards
              </p>
              <Button onClick={() => navigate("/upload")}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Now
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {sets.map((set) => (
                <Card
                  key={set.id}
                  className="p-6 hover:shadow-[var(--shadow-elevated)] transition-shadow"
                >
                  <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                    {set.title}
                  </h3>
                  {set.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {set.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-muted-foreground">
                      {set.flashcards[0]?.count || 0} cards
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(set.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/study/${set.id}`)}
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      Study
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/quiz/${set.id}`)}
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      Quiz
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
