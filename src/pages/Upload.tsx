import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Upload as UploadIcon, ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Upload = () => {
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
      } else {
        setUser(session.user);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto p-8 shadow-[var(--shadow-elevated)]">
          <h2 className="text-3xl font-bold mb-6">Upload Your Files</h2>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="file" className="text-base mb-2 block">
                Select File
              </Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Supported formats: PDF, PNG, JPEG (max 20MB)
              </p>
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
              disabled={!file || uploading}
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
