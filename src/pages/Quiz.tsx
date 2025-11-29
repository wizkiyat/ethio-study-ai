import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle, XCircle, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Flashcard {
  question: string;
  answer: string;
}

const Quiz = () => {
  const { setId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [setTitle, setSetTitle] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    generateQuiz();
  }, [setId]);

  const generateQuiz = async () => {
    try {
      // Get flashcard set
      const { data: setData, error: setError } = await supabase
        .from("flashcard_sets")
        .select("title")
        .eq("id", setId)
        .single();

      if (setError) throw setError;
      setSetTitle(setData.title);

      // Get flashcards
      const { data: flashcards, error: cardsError } = await supabase
        .from("flashcards")
        .select("question, answer")
        .eq("set_id", setId);

      if (cardsError) throw cardsError;

      if (!flashcards || flashcards.length < 4) {
        toast({
          title: "Not Enough Cards",
          description: "Need at least 4 flashcards to generate a quiz",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Generate quiz questions from flashcards
      const generatedQuestions = generateQuestionsFromFlashcards(flashcards);
      setQuestions(generatedQuestions);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate quiz",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const generateQuestionsFromFlashcards = (flashcards: Flashcard[]): QuizQuestion[] => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    const numQuestions = Math.min(10, flashcards.length);

    return shuffled.slice(0, numQuestions).map((card, index) => {
      // Get wrong answers from other cards
      const otherAnswers = flashcards
        .filter((f) => f.answer !== card.answer)
        .map((f) => f.answer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      // Create options array with correct answer
      const options = [...otherAnswers, card.answer].sort(() => Math.random() - 0.5);
      const correctAnswer = options.indexOf(card.answer);

      return {
        question: card.question,
        options,
        correctAnswer,
      };
    });
  };

  const handleAnswer = (index: number) => {
    if (answered) return;

    setSelectedAnswer(index);
    setAnswered(true);
    setShowResult(true);

    if (index === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswered(false);
    setQuizComplete(false);
    // Regenerate questions with new random order
    generateQuiz();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Generating quiz...</p>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);

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
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-8 text-center space-y-6">
              <Trophy className={`w-20 h-20 mx-auto ${percentage >= 70 ? "text-yellow-500" : "text-muted-foreground"}`} />
              <h1 className="text-3xl font-bold">Quiz Complete!</h1>
              <div className="space-y-2">
                <p className="text-5xl font-bold text-primary">{percentage}%</p>
                <p className="text-muted-foreground">
                  You got {score} out of {questions.length} correct
                </p>
              </div>
              <div className="space-y-2">
                {percentage >= 90 && <p className="text-green-500 font-medium">Excellent! You've mastered this material!</p>}
                {percentage >= 70 && percentage < 90 && <p className="text-primary font-medium">Great job! Keep practicing!</p>}
                {percentage < 70 && <p className="text-yellow-500 font-medium">Keep studying! You'll get there!</p>}
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={restartQuiz}>Try Again</Button>
                <Button variant="outline" onClick={() => navigate(`/study/${setId}`)}>
                  Study Cards
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <p className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{setTitle} - Quiz</h1>
            <Progress value={progress} className="h-2" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{question.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, index) => {
                let buttonClass = "w-full justify-start text-left h-auto py-4 px-4";
                
                if (showResult) {
                  if (index === question.correctAnswer) {
                    buttonClass += " border-green-500 bg-green-500/10";
                  } else if (index === selectedAnswer && index !== question.correctAnswer) {
                    buttonClass += " border-destructive bg-destructive/10";
                  }
                }

                return (
                  <Button
                    key={index}
                    variant="outline"
                    className={buttonClass}
                    onClick={() => handleAnswer(index)}
                    disabled={answered}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && index === question.correctAnswer && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {showResult && index === selectedAnswer && index !== question.correctAnswer && (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                    </span>
                  </Button>
                );
              })}
            </CardContent>
          </Card>

          {showResult && (
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">
                Score: {score}/{currentQuestion + 1}
              </p>
              <Button onClick={handleNext}>
                {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;
