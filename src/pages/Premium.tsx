import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Crown, CheckCircle, Clock, XCircle } from "lucide-react";
import { User } from "@supabase/supabase-js";

const Premium = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      setEmail(session.user.email || "");
      
      // Check premium status
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, is_premium")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setUsername(profile.username);
        setIsPremium(profile.is_premium || false);
      }
      
      // Check for pending requests
      const { data: requests } = await supabase
        .from("premium_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (requests && requests.length > 0) {
        setPendingRequest(requests[0]);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file (screenshot)",
          variant: "destructive",
        });
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !email || !username) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields and upload a screenshot",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload screenshot
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from("payment-screenshots")
        .getPublicUrl(filePath);
      
      // Create premium request
      const { error: insertError } = await supabase
        .from("premium_requests")
        .insert({
          user_id: user.id,
          email,
          username,
          screenshot_url: filePath,
        });
      
      if (insertError) throw insertError;
      
      toast({
        title: "Request Submitted!",
        description: "Your premium request is being reviewed by admin.",
      });
      
      // Refresh to show pending status
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center">
            <Crown className="w-16 h-16 mx-auto text-primary mb-4" />
            <h1 className="text-4xl font-bold mb-2">Premium Access</h1>
            <p className="text-muted-foreground">
              Unlock unlimited flashcard generation and Memory Mode
            </p>
          </div>

          {isPremium ? (
            <Card className="border-primary">
              <CardContent className="pt-6 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-green-500 mb-2">You're Premium!</h2>
                <p className="text-muted-foreground">
                  Enjoy unlimited flashcard generation and all premium features.
                </p>
              </CardContent>
            </Card>
          ) : pendingRequest?.status === "pending" ? (
            <Card className="border-yellow-500">
              <CardContent className="pt-6 text-center">
                <Clock className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-yellow-500 mb-2">Request Pending</h2>
                <p className="text-muted-foreground">
                  Your payment is being verified by admin. Please wait.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted: {new Date(pendingRequest.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ) : pendingRequest?.status === "rejected" ? (
            <>
              <Card className="border-destructive">
                <CardContent className="pt-6 text-center">
                  <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
                  <h2 className="text-2xl font-bold text-destructive mb-2">Request Rejected</h2>
                  <p className="text-muted-foreground mb-2">
                    {pendingRequest.admin_notes || "Your payment could not be verified. Please try again."}
                  </p>
                </CardContent>
              </Card>
              <PaymentForm
                email={email}
                setEmail={setEmail}
                username={username}
                setUsername={setUsername}
                file={file}
                handleFileChange={handleFileChange}
                handleSubmit={handleSubmit}
                uploading={uploading}
              />
            </>
          ) : (
            <PaymentForm
              email={email}
              setEmail={setEmail}
              username={username}
              setUsername={setUsername}
              file={file}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              uploading={uploading}
            />
          )}

          {/* Premium Benefits */}
          <Card>
            <CardHeader>
              <CardTitle>Premium Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Unlimited flashcard generation</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Memory Mode (Spaced Repetition)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Quiz Mode with auto-generated questions</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span>Priority support</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

interface PaymentFormProps {
  email: string;
  setEmail: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  file: File | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  uploading: boolean;
}

const PaymentForm = ({
  email,
  setEmail,
  username,
  setUsername,
  file,
  handleFileChange,
  handleSubmit,
  uploading,
}: PaymentFormProps) => (
  <>
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
        <CardDescription>Send 100 Birr/month to activate premium</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="font-bold text-lg">CBE Account Number:</p>
          <p className="text-2xl font-mono text-primary">1000723323529</p>
          <p className="text-sm text-muted-foreground mt-2">
            Commercial Bank of Ethiopia
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          After sending payment, upload your screenshot below.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Submit Payment Proof</CardTitle>
        <CardDescription>
          Upload your payment screenshot and verify your details
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshot">Payment Screenshot</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="screenshot"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-8 h-8 text-muted-foreground" />
                {file ? (
                  <span className="text-primary font-medium">{file.name}</span>
                ) : (
                  <span className="text-muted-foreground">
                    Click to upload payment screenshot
                  </span>
                )}
              </label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={uploading || !file}
          >
            {uploading ? "Submitting..." : "Submit Payment Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  </>
);

export default Premium;
