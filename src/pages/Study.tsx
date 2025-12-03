import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  order_index: number;
}

interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
}

const Study = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlashcardSet();
  }, [setId]);

  const loadFlashcardSet = async () => {
    try {
      // Load set details
      const { data: setData, error: setError } = await supabase
        .from("flashcard_sets")
        .select("id, title, description")
        .eq("id", setId)
        .single();

      if (setError) throw setError;
      // Decode URL-encoded characters and replace + with spaces
      setSet({
        ...setData,
        title: decodeURIComponent(setData.title.replace(/\+/g, ' ')),
      });

      // Load flashcards
      const { data: cardsData, error: cardsError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("set_id", setId)
        .order("order_index", { ascending: true });

      if (cardsError) throw cardsError;
      setFlashcards(cardsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Loading flashcards...</p>
      </div>
    );
  }

  if (!set || flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No flashcards found</p>
          <Button onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

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
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center overflow-hidden">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{set.title}</h1>
            {set.description && (
              <p className="text-sm sm:text-base text-muted-foreground break-words">{set.description}</p>
            )}
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
              Card {currentIndex + 1} of {flashcards.length}
            </p>
          </div>

          {/* Flashcard */}
          <div
            className="relative h-64 sm:h-80 md:h-96 cursor-pointer perspective-1000"
            onClick={handleFlip}
          >
            <div
              className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* Front */}
              <Card
                className={`absolute inset-0 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-[var(--shadow-elevated)] backface-hidden overflow-hidden ${
                  isFlipped ? "invisible" : "visible"
                }`}
              >
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">QUESTION</p>
                <p className="text-lg sm:text-xl md:text-2xl font-medium px-4 break-words w-full overflow-hidden">{currentCard.question}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-6 sm:mt-8">
                  Click to reveal answer
                </p>
              </Card>

              {/* Back */}
              <Card
                className={`absolute inset-0 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-[var(--shadow-elevated)] rotate-y-180 backface-hidden overflow-hidden ${
                  isFlipped ? "visible" : "invisible"
                }`}
              >
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">ANSWER</p>
                <p className="text-lg sm:text-xl md:text-2xl font-medium px-4 break-words w-full overflow-hidden">{currentCard.answer}</p>
              </Card>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleFlip} className="flex-1 sm:flex-none">
              <RotateCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Flip Card</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === flashcards.length - 1}
              className="flex-1 sm:flex-none"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4 sm:ml-2" />
            </Button>
          </div>

          {/* Take Quiz Button */}
          <div className="text-center pt-2 sm:pt-4">
            <Button
              onClick={() => navigate(`/quiz/${setId}`)}
              className="gap-2 w-full sm:w-auto"
              size="sm"
            >
              <Brain className="w-4 h-4" />
              Take Quiz
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default Study;
