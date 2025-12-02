import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BookOpen, Brain, Zap } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-16 sm:pb-24 md:pb-32">
        <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 rounded-full text-primary text-xs sm:text-sm font-medium">
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            AI-Powered Study Tool
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight px-4">
            Turn Your Notes Into
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Smart Flashcards
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Upload PDFs, slides, or images. Our AI instantly creates study flashcards. 
            Stop wasting time on manual note conversion.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
                Get Started Free
              </Button>
            </Link>
            <Link to="/auth" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Upload Anything</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              PDFs, PowerPoint slides, or images of handwritten notes. We handle it all.
            </p>
          </div>

          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">AI Extraction</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Advanced AI detects key concepts and generates perfect Q&A flashcards automatically.
            </p>
          </div>

          <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-success/10 rounded-xl flex items-center justify-center mb-3 sm:mb-4">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-success" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Study Smart</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Review flashcards with a clean, distraction-free interface designed for learning.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Ethiocard AI. Built for students who value their time.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
