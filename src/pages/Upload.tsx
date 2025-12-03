import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Upload as UploadIcon, ArrowLeft, FileText, Crown, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FREE_UPLOAD_LIMIT = 6;

const Upload = () => {
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
        checkUserStatusAndUploads(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/auth");
        } else {
          setUser(session.user);
          checkUserStatusAndUploads(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserStatusAndUploads = async (userId: string) => {
    setLoading(true);
    try {
      // Check premium status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_premium')
        .eq('id', userId)
        .maybeSingle();

      setIsPremium(profile?.is_premium || false);

      // Count user's uploads
      const { count } = await supabase
        .from('uploads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setUploadCount(count || 0);
    } catch (error) {
      console.error('Error checking user status:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasReachedLimit = !isPremium && uploadCount >= FREE_UPLOAD_LIMIT;
  const remainingUploads = FREE_UPLOAD_LIMIT - uploadCount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'image/jpg'];

      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or image file (PNG, JPEG)",
          variant: "destructive",
        });
        return;
      }

      if (selectedFile.size > 20 * 1024 * 1024) { // 20MB limit
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 20MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    // Double-check limit before upload
    if (hasReachedLimit) {
      toast({
        title: "Upload Limit Reached",
        description: "Upgrade to Premium for unlimited uploads!",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      setProgress(30);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      setProgress(60);

      // Create upload record
      const { data: uploadRecord, error: recordError } = await supabase
        .from('uploads')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_url: publicUrl,
          processing_status: 'processing',
        })
        .select()
        .single();

      if (recordError) throw recordError;

      setProgress(80);

      // Call edge function to process
      const { data: processData, error: processError } = await supabase.functions
        .invoke('process-upload', {
          body: {
            uploadId: uploadRecord.id,
            fileUrl: publicUrl,
            fileName: file.name,
          },
        });

      if (processError) throw processError;

      setProgress(100);

      toast({
        title: "Success!",
        description: "Your file has been processed. Flashcards are ready!",
      });

      // Navigate to the new flashcard set
      if (processData?.setId) {
        navigate(`/study/${processData.setId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process your file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!user || loading) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <Card className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 shadow-[var(--shadow-elevated)]">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Upload Your Files</h2>
          
          {/* Upload limit info for free users */}
          {!isPremium && (
            <Card className={`p-4 mb-6 ${hasReachedLimit ? 'bg-destructive/10 border-destructive' : 'bg-secondary/50'}`}>
              <div className="flex items-start gap-3">
                {hasReachedLimit ? (
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                ) : (
                  <Crown className="w-5 h-5 text-amber-500 mt-0.5" />
                )}
                <div className="flex-1">
                  {hasReachedLimit ? (
                    <>
                      <p className="font-medium text-destructive">Upload Limit Reached</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You've used all {FREE_UPLOAD_LIMIT} free uploads. Upgrade to Premium for unlimited uploads!
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        className="mt-3"
                        onClick={() => navigate('/premium')}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Free Plan: {remainingUploads} uploads remaining</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You've used {uploadCount} of {FREE_UPLOAD_LIMIT} free uploads. Upgrade to Premium for unlimited uploads.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {isPremium && (
            <Card className="p-4 mb-6 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-amber-500" />
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Premium Member - Unlimited Uploads
                </p>
              </div>
            </Card>
          )}
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="file-upload" className="text-base mb-2 block">
                Select File
              </Label>
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  hasReachedLimit || uploading
                    ? 'border-muted bg-muted/20 cursor-not-allowed'
                    : 'border-primary/30 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 active:bg-secondary/60'
                }`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadIcon className={`w-8 h-8 mb-2 ${hasReachedLimit ? 'text-muted-foreground' : 'text-primary'}`} />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold">Tap to upload</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, PNG, JPEG (max 20MB)
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,.pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  disabled={uploading || hasReachedLimit}
                  className="sr-only"
                />
              </label>
            </div>

            {file && (
              <Card className="p-4 bg-secondary/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {uploading && (
              <div>
                <Progress value={progress} className="mb-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {progress < 50 ? "Uploading..." : "Processing with AI..."}
                </p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleUpload}
              disabled={!file || uploading || hasReachedLimit}
            >
              <UploadIcon className="w-5 h-5 mr-2" />
              {uploading ? "Processing..." : "Generate Flashcards"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
