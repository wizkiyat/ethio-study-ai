import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId, fileUrl, fileName } = await req.json();

    console.log("Processing upload:", { uploadId, fileName });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get upload record
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .single();

    if (uploadError) throw uploadError;

    // Call AI to generate flashcards
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiPrompt = `You are a flashcard creation AI. Analyze the following document and create high-quality study flashcards.

Document: ${fileName}

Generate 10-15 flashcards that:
- Focus on key concepts and important information
- Have clear, concise questions
- Have detailed but focused answers
- Cover different topics from the material

Return ONLY a valid JSON array of flashcards with this exact structure:
[
  {
    "question": "Question text here?",
    "answer": "Answer text here."
  }
]

Important: Return ONLY the JSON array, no other text or explanation.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an expert at creating study flashcards. Return only valid JSON arrays.",
            },
            { role: "user", content: aiPrompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("AI credits depleted. Please add funds to continue.");
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    console.log("AI response received");

    const content = aiData.choices[0].message.content;
    
    // Parse flashcards from AI response
    let flashcardsData;
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        flashcardsData = JSON.parse(jsonMatch[0]);
      } else {
        flashcardsData = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to generate flashcards. Please try again.");
    }

    if (!Array.isArray(flashcardsData) || flashcardsData.length === 0) {
      throw new Error("No flashcards generated");
    }

    // Create flashcard set
    const { data: flashcardSet, error: setError } = await supabase
      .from("flashcard_sets")
      .insert({
        user_id: upload.user_id,
        upload_id: uploadId,
        title: fileName.replace(/\.[^/.]+$/, ""), // Remove file extension
        description: `Generated from ${fileName}`,
      })
      .select()
      .single();

    if (setError) throw setError;

    // Insert flashcards
    const flashcardsToInsert = flashcardsData.map(
      (card: any, index: number) => ({
        set_id: flashcardSet.id,
        question: card.question,
        answer: card.answer,
        order_index: index,
      })
    );

    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(flashcardsToInsert);

    if (cardsError) throw cardsError;

    // Update upload status
    await supabase
      .from("uploads")
      .update({ processing_status: "completed" })
      .eq("id", uploadId);

    console.log("Processing completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        setId: flashcardSet.id,
        flashcardsCount: flashcardsData.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing upload:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
