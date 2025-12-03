import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Users, CreditCard, FileText, Crown } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface PremiumRequest {
  id: string;
  user_id: string;
  email: string;
  username: string;
  screenshot_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  is_premium: boolean;
  created_at: string;
}

interface Upload {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  processing_status: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    // Load premium requests
    const { data: requestsData } = await supabase
      .from("premium_requests")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (requestsData) setRequests(requestsData);

    // Load all users
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (usersData) setUsers(usersData);

    // Load all uploads
    const { data: uploadsData } = await supabase
      .from("uploads")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (uploadsData) setUploads(uploadsData);
  };

  const handleApprove = async (request: PremiumRequest) => {
    setProcessingId(request.id);
    try {
      // Update request status
      const { error: requestError } = await supabase
        .from("premium_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // Update user premium status
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          premium_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .eq("id", request.user_id);

      if (profileError) throw profileError;

      toast({
        title: "Approved!",
        description: `Premium activated for ${request.username}`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: PremiumRequest, reason?: string) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from("premium_requests")
        .update({
          status: "rejected",
          admin_notes: reason || "Payment could not be verified",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Rejected",
        description: `Request from ${request.username} rejected`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const togglePremium = async (profile: UserProfile) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_premium: !profile.is_premium,
          premium_expires_at: !profile.is_premium
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: `${profile.username} premium status updated`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from("uploads")
        .delete()
        .eq("id", uploadId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Upload deleted successfully",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getScreenshotUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("payment-screenshots")
      .createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const viewScreenshot = async (path: string) => {
    const url = await getScreenshotUrl(path);
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Crown className="w-3 h-3" />
            Admin
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <CreditCard className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Crown className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{users.filter((u) => u.is_premium).length}</p>
                  <p className="text-sm text-muted-foreground">Premium Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <FileText className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{uploads.length}</p>
                  <p className="text-sm text-muted-foreground">Total Uploads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requests" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="uploads" className="gap-2">
              <FileText className="w-4 h-4" />
              Uploads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            {requests.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No payment requests yet
                </CardContent>
              </Card>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className={request.status === "pending" ? "border-yellow-500" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{request.username}</span>
                          <Badge
                            variant={
                              request.status === "approved"
                                ? "default"
                                : request.status === "rejected"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{request.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted: {new Date(request.created_at).toLocaleString()}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewScreenshot(request.screenshot_url)}
                        >
                          View Screenshot
                        </Button>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(request)}
                            disabled={processingId === request.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(request)}
                            disabled={processingId === request.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {users.map((profile) => (
              <Card key={profile.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold break-all">{profile.username}</span>
                        {profile.is_premium && (
                          <Badge className="gap-1 flex-shrink-0">
                            <Crown className="w-3 h-3" />
                            Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground break-all">{profile.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined: {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant={profile.is_premium ? "destructive" : "default"}
                      size="sm"
                      onClick={() => togglePremium(profile)}
                      className="flex-shrink-0 w-full sm:w-auto"
                    >
                      {profile.is_premium ? "Remove Premium" : "Grant Premium"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="uploads" className="space-y-4">
            {uploads.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No uploads yet
                </CardContent>
              </Card>
            ) : (
              uploads.map((upload) => (
                <Card key={upload.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium break-words">{upload.file_name}</p>
                        <p className="text-sm text-muted-foreground break-words">
                          Type: {upload.file_type} | Status: {upload.processing_status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {new Date(upload.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteUpload(upload.id)}
                        className="flex-shrink-0 w-full sm:w-auto"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
