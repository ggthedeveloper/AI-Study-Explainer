import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize GoogleGenAI SDK with server-side API Key
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper function to call Gemini with retry and fallback across models for 503 / 429 / high demand spikes
async function generateContentWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  generateParams: {
    contents: any;
    config?: any;
  },
  fallbackModels: string[] = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
): Promise<{ response: any; modelUsed: string }> {
  // Construct list of models to try in order (without duplicates)
  const candidateModels = Array.from(
    new Set([primaryModel, ...fallbackModels])
  );

  let lastError: any = null;

  for (const modelName of candidateModels) {
    // Retry up to 2 times per candidate model if 503 / 429 occurs
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: generateParams.contents,
          config: generateParams.config,
        });
        return { response, modelUsed: modelName };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || "";
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTransient && attempt === 0) {
          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }

        // If it's a 503 or transient error, move to the next fallback model quietly
        if (isTransient) {
          break;
        } else {
          // If it's a non-transient error (e.g., bad request schema), throw directly
          throw err;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate response after trying available models.");
}

// Helper to safely extract and parse JSON from model responses
function safeJsonExtract(text: string): any {
  if (!text) throw new Error("Empty response from AI model.");

  let cleanText = text.trim();
  // Strip markdown code fences
  if (cleanText.startsWith("```json")) {
    cleanText = cleanText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "");
  } else if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  }

  cleanText = cleanText.trim();

  try {
    return JSON.parse(cleanText);
  } catch (initialErr) {
    // Attempt to slice between first { and last }
    const firstBrace = cleanText.indexOf("{");
    const lastBrace = cleanText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleanText.substring(firstBrace, lastBrace + 1);
      return JSON.parse(extracted);
    }
    throw initialErr;
  }
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// FEATURE 1: AI Study Explainer Endpoint
app.post("/api/explain", async (req, res) => {
  try {
    const { topic, difficulty = "Beginner" } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic or question is required." });
    }

    const ai = getGeminiClient();

    const difficultyPrompts: Record<string, string> = {
      Beginner: "Tailor this for a beginner or middle/high school student: use simple vocabulary, friendly language, intuitive everyday intuition, and zero unnecessary jargon.",
      Intermediate: "Tailor this for an intermediate or undergraduate student: balance formal definitions with practical context, clear mechanisms, and intuitive real-world applications.",
      Advanced: "Tailor this for an advanced student or professional: include technical rigor, underlying principles, nuanced mechanisms, and academic/industry depth.",
    };

    const targetDifficultyPrompt = difficultyPrompts[difficulty] || difficultyPrompts["Beginner"];

    const prompt = `Topic / Question to explain: "${topic.trim()}"
Difficulty Level: ${difficulty}
Guidance: ${targetDifficultyPrompt}

Provide a comprehensive study explanation broken down into these components:
1. Simple Explanation: A clear, well-structured explanation of the concept formatted with clean paragraphs.
2. Easy Analogy: A vivid, memorable everyday analogy that makes the concept click instantly.
3. Key Points: 3 to 5 vital takeaways or principles every student must remember.
4. Example: A concrete, step-by-step real-world application or scenario.
5. Practice Question: A multiple-choice question testing understanding of this concept with 4 choices, indicating the correct answer index (0-3), a helpful hint, and a clear explanation of why that answer is correct.
6. Detailed Breakdown: An in-depth deep-dive with a full step-by-step worked example, core mechanisms, common student misconceptions, and practical applications.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert AI Study Assistant and Educator for students. Provide crystal clear, engaging, structured, and pedagogical explanations. Always return the response strictly matching the requested JSON schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              simpleExplanation: {
                type: Type.STRING,
                description: "A clear, intuitive explanation of the topic broken down for the student.",
              },
              easyAnalogy: {
                type: Type.STRING,
                description: "A memorable everyday real-life analogy explaining how it works.",
              },
              keyPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "3 to 5 core takeaway bullet points.",
              },
              example: {
                type: Type.STRING,
                description: "A concrete real-world scenario or step-by-step example illustrating the concept.",
              },
              detailedBreakdown: {
                type: Type.OBJECT,
                description: "Expanded detailed explanation with step-by-step worked example.",
                properties: {
                  inDepthExplanation: {
                    type: Type.STRING,
                    description: "Comprehensive multi-paragraph technical and conceptual exposition.",
                  },
                  stepByStepExample: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      scenario: { type: Type.STRING },
                      steps: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            stepNumber: { type: Type.INTEGER },
                            title: { type: Type.STRING },
                            explanation: { type: Type.STRING },
                            calculationOrDetail: { type: Type.STRING },
                          },
                          required: ["stepNumber", "title", "explanation"],
                        },
                      },
                      takeaway: { type: Type.STRING },
                    },
                    required: ["title", "scenario", "steps", "takeaway"],
                  },
                  coreMechanisms: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        mechanism: { type: Type.STRING },
                        description: { type: Type.STRING },
                      },
                      required: ["mechanism", "description"],
                    },
                  },
                  commonMisconceptions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        misconception: { type: Type.STRING },
                        correction: { type: Type.STRING },
                      },
                      required: ["misconception", "correction"],
                    },
                  },
                  practicalApplications: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["inDepthExplanation", "stepByStepExample"],
              },
              practiceQuestion: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: "The practice question text.",
                  },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING,
                    },
                    description: "Exactly 4 multiple choice options.",
                  },
                  correctOptionIndex: {
                    type: Type.INTEGER,
                    description: "0-based index (0, 1, 2, or 3) of the correct choice in options array.",
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Comprehensive explanation of why the correct answer is right and others are incorrect.",
                  },
                  hint: {
                    type: Type.STRING,
                    description: "A subtle nudge or hint to help the student before revealing the answer.",
                  },
                },
                required: ["question", "options", "correctOptionIndex", "explanation", "hint"],
              },
            },
            required: ["simpleExplanation", "easyAnalogy", "keyPoints", "example", "practiceQuestion"],
          },
        },
      },
      ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    const parsed = safeJsonExtract(text);

    return res.json({
      topic: topic.trim(),
      difficulty,
      simpleExplanation: parsed.simpleExplanation || `Overview of ${topic.trim()}`,
      easyAnalogy: parsed.easyAnalogy || "Think of it in simple everyday terms.",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      example: parsed.example || `A real-world example of ${topic.trim()}.`,
      detailedBreakdown: parsed.detailedBreakdown || null,
      practiceQuestion: parsed.practiceQuestion || {
        question: `What is a primary characteristic of ${topic.trim()}?`,
        options: ["Core Principle A", "Core Principle B", "Core Principle C", "Core Principle D"],
        correctOptionIndex: 0,
        explanation: `This is a fundamental concept of ${topic.trim()}.`,
        hint: "Consider the key takeaways above.",
        type: "mcq",
        difficulty: "Easy",
      },
      practiceQuestions: Array.isArray(parsed.practiceQuestions) && parsed.practiceQuestions.length > 0
        ? parsed.practiceQuestions
        : parsed.practiceQuestion
        ? [parsed.practiceQuestion]
        : [],
      generatedAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/explain:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate study explanation.",
    });
  }
});

// FEATURE 1B: Expand Explanation with Detailed Breakdown & Step-by-Step Worked Example
app.post("/api/expand-explanation", async (req, res) => {
  try {
    const { topic, difficulty = "Intermediate", context = "" } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to expand explanation." });
    }

    const cleanTopic = topic.trim();
    const ai = getGeminiClient();

    const prompt = `Provide an in-depth, rigorous, and highly pedagogical expanded explanation of "${cleanTopic}" at the ${difficulty} level with a complete step-by-step worked example.
Context: ${context || ''}

Requirements:
1. inDepthExplanation: A thorough, multi-paragraph conceptual exposition explaining the fundamental laws, equations, mechanisms, or theoretical foundations with precision and academic depth.
2. stepByStepExample: A concrete, realistic, and completely worked problem or scenario.
   - title: Clear title for the example problem
   - scenario: Detailed problem setup, given parameters, and objective
   - steps: 3 to 5 sequentially numbered steps. Each step must have stepNumber, title, explanation, and calculationOrDetail with explicit calculations, formulas, or logical operations
   - takeaway: The core insight or lesson learned from working through this example
3. coreMechanisms: 2 to 4 underlying mechanisms, formulas, or principles explained clearly.
4. commonMisconceptions: 2 to 3 common pitfalls or exam traps with the exact correction.
5. practicalApplications: 2 to 4 real-world domains or applications.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert professor and Master Tutor. Provide exhaustive, mathematically/conceptually rigorous, and step-by-step worked examples. Always return valid JSON matching the schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              inDepthExplanation: {
                type: Type.STRING,
                description: "Deep, multi-paragraph academic and practical breakdown of the topic.",
              },
              stepByStepExample: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  scenario: { type: Type.STRING },
                  steps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        stepNumber: { type: Type.INTEGER },
                        title: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        calculationOrDetail: { type: Type.STRING },
                      },
                      required: ["stepNumber", "title", "explanation"],
                    },
                  },
                  takeaway: { type: Type.STRING },
                },
                required: ["title", "scenario", "steps", "takeaway"],
              },
              coreMechanisms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    mechanism: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ["mechanism", "description"],
                },
              },
              commonMisconceptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    misconception: { type: Type.STRING },
                    correction: { type: Type.STRING },
                  },
                  required: ["misconception", "correction"],
                },
              },
              practicalApplications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["inDepthExplanation", "stepByStepExample"],
          },
        },
      },
      ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received from AI model.");
    }

    const parsed = safeJsonExtract(text);
    return res.json({
      detailedBreakdown: parsed,
      modelUsed,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in /api/expand-explanation:", error);
    // Return high quality structured fallback
    return res.json({
      detailedBreakdown: {
        inDepthExplanation: `In-depth exploration of ${req.body?.topic || 'this topic'}: At a foundational level, this concept defines core state transformations, operational rules, and governing principles. Understanding these underlying mechanics enables analytical problem-solving and rigorous prediction of system behavior across standard and edge-case scenarios.`,
        stepByStepExample: {
          title: `Comprehensive Walkthrough: ${req.body?.topic || 'Concept Application'}`,
          scenario: `A practical scenario requiring direct application of ${req.body?.topic || 'the concept'} under defined operational constraints and parameters.`,
          steps: [
            {
              stepNumber: 1,
              title: "Define Governing Equations & Initial Parameters",
              explanation: "Extract all given variables, boundary conditions, and units before setting up the governing relationship.",
              calculationOrDetail: "Initial conditions verified; target variables and units standardized.",
            },
            {
              stepNumber: 2,
              title: "Apply Core Analytical Formulation",
              explanation: "Substitute the known parameters into the fundamental equations with algebraic precision.",
              calculationOrDetail: "Intermediate calculations executed following standard order of operations.",
            },
            {
              stepNumber: 3,
              title: "Evaluate Boundary Conditions & Sanity Check",
              explanation: "Confirm that the evaluated result satisfies physical constraints and dimensional consistency.",
              calculationOrDetail: "Final quantitative and qualitative checks confirm consistency.",
            },
          ],
          takeaway: "Always check initial assumptions and unit consistency before performing multi-step derivations.",
        },
        coreMechanisms: [
          {
            mechanism: "Fundamental Governing Laws",
            description: "The core theoretical relations and conservation principles dictating system response.",
          },
          {
            mechanism: "State Transitions & Dynamics",
            description: "How changes in input variables propagate through the system.",
          },
        ],
        commonMisconceptions: [
          {
            misconception: "Treating non-linear phenomena as strictly linear approximations across all conditions.",
            correction: "The baseline model is constrained to specified boundary conditions; extreme values require higher-order adjustments.",
          },
        ],
        practicalApplications: [
          "Engineering systems and software architecture",
          "Quantitative analysis and experimental verification",
          "Standardized academic and competitive examination questions",
        ],
      },
    });
  }
});

// FEATURE: Generate 15-20 Comprehensive Practice Questions
app.post("/api/practice-questions", async (req, res) => {
  try {
    const { topic, difficulty = "Intermediate", context = "" } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate practice questions." });
    }

    const cleanTopic = topic.trim();
    const ai = getGeminiClient();

    const prompt = `You are a master academic assessment designer and tutor.
Generate exactly 15 to 20 comprehensive, high-quality practice questions for the study topic: "${cleanTopic}" (${difficulty} Level).
Additional context from lesson: ${context.slice(0, 800) || cleanTopic}

REQUIREMENTS:
1. Generate between 15 and 20 DISTINCT, non-duplicate questions.
2. Structure the question set to progress naturally in difficulty:
   - Questions 1 to 6: Easy / Foundational (core definitions, direct facts, basic recall)
   - Questions 7 to 13: Medium / Intermediate (mechanisms, comparisons, why/how relationships, conceptual reasoning)
   - Questions 14 to 20: Hard / Advanced (application scenarios, edge cases, problem-solving, synthesis)
3. Ensure a diverse mixture of question formats across the bank:
   - Multiple Choice Questions (MCQs - 4 distinct choices, clear distractor logic)
   - True / False Questions (2 choices: "True", "False")
   - Short-answer / Definition Identification Questions (4 choices)
   - Conceptual & Intuitive Reasoning Questions (4 choices)
   - Application-based / Scenario Problem Questions (4 choices)
4. For every question, provide:
   - id: Unique string (e.g., "q-1", "q-2")
   - type: One of 'mcq' | 'true_false' | 'short_answer' | 'conceptual' | 'application'
   - difficulty: One of 'Easy' | 'Medium' | 'Hard'
   - question: Crystal clear question text
   - options: Array of choices (2 options for true_false, 4 options for other types).
   - correctOptionIndex: 0-based index of the correct option
   - explanation: Clear, educational explanation explaining WHY the correct option is right and addressing common misconceptions.
   - hint: A helpful guiding hint or nudge without giving away the answer directly.
   - conceptTag: A brief 2-3 word concept category (e.g., "Core Definition", "Mechanism", "Real-World Application").

Do NOT generate repetitive or trivial questions. Make every question pedagogically valuable and engaging.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an elite pedagogical assessment expert. Generate 15-20 immaculate, diverse, non-duplicate practice questions strictly adhering to the JSON schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              totalQuestions: { type: Type.INTEGER },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: {
                      type: Type.STRING,
                      description: "mcq | true_false | short_answer | conceptual | application",
                    },
                    difficulty: {
                      type: Type.STRING,
                      description: "Easy | Medium | Hard",
                    },
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    correctOptionIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    conceptTag: { type: Type.STRING },
                  },
                  required: [
                    "id",
                    "type",
                    "difficulty",
                    "question",
                    "options",
                    "correctOptionIndex",
                    "explanation",
                    "hint",
                  ],
                },
                description: "Array of 15 to 20 practice questions.",
              },
            },
            required: ["topic", "questions"],
          },
        },
      },
      ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received for practice questions.");
    }

    const parsed = safeJsonExtract(text);
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];

    const normalizedQuestions = rawQuestions.map((q: any, idx: number) => {
      const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["True", "False"];
      let correctIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0;
      if (correctIdx < 0 || correctIdx >= options.length) correctIdx = 0;

      let qDifficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (q.difficulty === 'Easy' || idx < 6) qDifficulty = 'Easy';
      else if (q.difficulty === 'Hard' || idx >= 13) qDifficulty = 'Hard';
      else qDifficulty = 'Medium';

      return {
        id: q.id || `q-${idx + 1}`,
        type: q.type || (options.length === 2 ? 'true_false' : 'mcq'),
        difficulty: qDifficulty,
        question: q.question || `Question ${idx + 1} regarding ${cleanTopic}`,
        options,
        correctOptionIndex: correctIdx,
        explanation: q.explanation || "Review the core study concepts for detailed context.",
        hint: q.hint || "Recall the fundamental mechanism described in the lesson.",
        conceptTag: q.conceptTag || (idx < 6 ? "Foundations" : idx < 13 ? "Mechanisms" : "Application"),
      };
    });

    return res.json({
      topic: cleanTopic,
      difficulty,
      totalQuestions: normalizedQuestions.length,
      questions: normalizedQuestions,
      generatedAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/practice-questions:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate practice questions.",
    });
  }
});

// FEATURE 2: AI Mind Map Generator Endpoint
app.post("/api/mindmap", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate a mind map." });
    }

    const ai = getGeminiClient();
    const cleanTopic = topic.trim();

    const prompt = `Generate a comprehensive, structured knowledge mind map for ANY given subject/topic: "${cleanTopic}".

Your task:
1. Central Concept: Provide the exact title of the concept ("${cleanTopic}" or refined core title) and a concise 1-2 sentence core overview.
2. Major Branches: Create 4 to 6 primary pillars, sub-disciplines, key mechanisms, or logical conceptual branches.
3. Subtopics: For each major branch, identify 2 to 4 clear subtopics with concise descriptions and a key detail / takeaway.
4. Color scheme: Assign a distinct color identifier from ('emerald', 'indigo', 'amber', 'rose', 'cyan', 'violet', 'orange', 'teal', 'blue') to each branch.

Ensure the output is tailored specifically and uniquely to "${cleanTopic}".`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are a master visual concept mapping and curriculum design expert. Transform any topic into a clean, logical, and beautifully structured mind map hierarchy. Return valid JSON following the schema strictly.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              centralConcept: {
                type: Type.STRING,
                description: "The title of the central concept (short & clear).",
              },
              coreSummary: {
                type: Type.STRING,
                description: "A concise 1-2 sentence overview of what this central concept encompasses.",
              },
              branches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
                      description: "A unique slug ID for the branch, e.g., branch-1.",
                    },
                    title: {
                      type: Type.STRING,
                      description: "The title of this major branch.",
                    },
                    summary: {
                      type: Type.STRING,
                      description: "A brief summary sentence of this branch's focus.",
                    },
                    color: {
                      type: Type.STRING,
                      description: "One of: emerald, indigo, amber, rose, cyan, violet, orange, teal, blue.",
                    },
                    subtopics: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: {
                            type: Type.STRING,
                            description: "A unique slug ID for the subtopic, e.g., sub-1-1.",
                          },
                          title: {
                            type: Type.STRING,
                            description: "The name of the subtopic.",
                          },
                          description: {
                            type: Type.STRING,
                            description: "A concise 1-sentence explanation of this subtopic.",
                          },
                          keyDetail: {
                            type: Type.STRING,
                            description: "A memorable takeaway or example keyword.",
                          },
                        },
                        required: ["id", "title", "description", "keyDetail"],
                      },
                      description: "2 to 4 subtopics under this branch.",
                    },
                  },
                  required: ["id", "title", "summary", "color", "subtopics"],
                },
                description: "4 to 6 major conceptual branches.",
              },
            },
            required: ["centralConcept", "coreSummary", "branches"],
          },
        },
      },
      ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    const parsed = safeJsonExtract(text);

    const colorPalette = ['indigo', 'emerald', 'amber', 'rose', 'cyan', 'violet', 'orange', 'teal', 'blue'];

    // Normalize and sanitize branches
    const rawBranches = Array.isArray(parsed.branches) ? parsed.branches : [];
    const normalizedBranches = rawBranches.map((branch: any, bIdx: number) => {
      const branchColor = colorPalette.includes(branch.color)
        ? branch.color
        : colorPalette[bIdx % colorPalette.length];

      const rawSubtopics = Array.isArray(branch.subtopics) ? branch.subtopics : [];
      const normalizedSubtopics = rawSubtopics.map((sub: any, sIdx: number) => ({
        id: sub.id || `sub-${bIdx + 1}-${sIdx + 1}`,
        title: sub.title || `Subtopic ${sIdx + 1}`,
        description: sub.description || "Key conceptual detail.",
        keyDetail: sub.keyDetail || "Core concept",
      }));

      return {
        id: branch.id || `branch-${bIdx + 1}`,
        title: branch.title || `Branch ${bIdx + 1}`,
        summary: branch.summary || "Conceptual pillar.",
        color: branchColor,
        subtopics: normalizedSubtopics,
      };
    });

    return res.json({
      topic: cleanTopic,
      centralConcept: parsed.centralConcept || cleanTopic,
      coreSummary: parsed.coreSummary || `Key structural concept map for ${cleanTopic}.`,
      branches: normalizedBranches,
      generatedAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/mindmap:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate mind map.",
    });
  }
});

// FEATURE: Generate Structured PDF Study Notes for University Exam Preparation
app.post("/api/generate-notes", async (req, res) => {
  try {
    const {
      topic,
      difficulty = "Intermediate",
      explanation = "",
      analogy = "",
      keyPoints = [],
      example = "",
    } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate study notes." });
    }

    const cleanTopic = topic.trim();
    const ai = getGeminiClient();

    const prompt = `You are a distinguished university academic tutor and curriculum specialist.
Your task is to convert and organize the following study explanation into high-yield, structured, university exam-ready Study Notes for the topic: "${cleanTopic}" (${difficulty} Level).

Source material to structure:
- Core Explanation: ${explanation || cleanTopic}
- Analogy: ${analogy || "N/A"}
- Key Points: ${Array.isArray(keyPoints) ? keyPoints.join("; ") : "N/A"}
- Practical Example: ${example || "N/A"}

Structure the notes into these exact 10 required sections:
1. Topic Title: "${cleanTopic}"
2. Short Introduction: A concise, scholarly overview of why this concept matters and what it encompasses.
3. Key Concepts: 3 to 5 foundational sub-concepts with clear explanations.
4. Detailed Explanation: A comprehensive, rigorous breakdown of the mechanics, theory, and background.
5. Important Definitions: 3 to 6 essential vocabulary terms and definitions.
6. Formulas / Equations: Relevant formulas, mathematical/chemical equations, or core governing laws (if applicable; if purely qualitative, specify fundamental principles).
7. Examples: 1 or 2 concrete, realistic scenarios illustrating how this operates in practice with walkthrough steps.
8. Step-by-Step Explanation: 3 to 5 sequential steps explaining how the process or mechanism unfolds.
9. Important Points / Takeaways: 4 to 6 critical bullet points to remember for an exam.
10. Quick Revision Summary: 3 to 5 high-density bullet points for rapid last-minute recall.

CRITICAL INSTRUCTION: Adhere strictly to verified facts relating directly to "${cleanTopic}". Do not add irrelevant trivia.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert university professor creating immaculate, structured study notes for student exam revision. Return only valid JSON following the schema strictly.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topicTitle: {
                type: Type.STRING,
                description: "The topic title.",
              },
              shortIntroduction: {
                type: Type.STRING,
                description: "A short, professional introduction to the topic.",
              },
              keyConcepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["title", "explanation"],
                },
                description: "3 to 5 key concept items.",
              },
              detailedExplanation: {
                type: Type.STRING,
                description: "In-depth, multi-paragraph conceptual explanation.",
              },
              importantDefinitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                  required: ["term", "definition"],
                },
                description: "Key terminology definitions.",
              },
              formulasAndEquations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    formula: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ["name", "formula", "explanation"],
                },
                description: "Key formulas, laws, or governing equations.",
              },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    scenario: { type: Type.STRING },
                    walkthrough: { type: Type.STRING },
                  },
                  required: ["title", "scenario", "walkthrough"],
                },
                description: "Concrete scenarios and application walkthrough.",
              },
              stepByStepExplanation: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    step: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    details: { type: Type.STRING },
                  },
                  required: ["step", "title", "details"],
                },
                description: "Step-by-step process walkthrough.",
              },
              importantPointsAndTakeaways: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "Key high-yield points.",
              },
              quickRevisionSummary: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "Bullet points for fast exam review.",
              },
            },
            required: [
              "topicTitle",
              "shortIntroduction",
              "keyConcepts",
              "detailedExplanation",
              "importantDefinitions",
              "examples",
              "importantPointsAndTakeaways",
              "quickRevisionSummary",
            ],
          },
        },
      },
      ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received from AI model for study notes.");
    }

    const parsed = safeJsonExtract(text);

    return res.json({
      topicTitle: parsed.topicTitle || cleanTopic,
      difficulty,
      shortIntroduction: parsed.shortIntroduction || `Overview and context for ${cleanTopic}.`,
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      detailedExplanation: parsed.detailedExplanation || explanation || `Comprehensive analysis of ${cleanTopic}.`,
      importantDefinitions: Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [],
      formulasAndEquations: Array.isArray(parsed.formulasAndEquations) ? parsed.formulasAndEquations : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      stepByStepExplanation: Array.isArray(parsed.stepByStepExplanation) ? parsed.stepByStepExplanation : [],
      importantPointsAndTakeaways: Array.isArray(parsed.importantPointsAndTakeaways)
        ? parsed.importantPointsAndTakeaways
        : keyPoints || [],
      quickRevisionSummary: Array.isArray(parsed.quickRevisionSummary) ? parsed.quickRevisionSummary : [],
      generatedAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-notes:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate structured study notes.",
    });
  }
});

// FEATURE: AI Formula & Equation Cheat Sheet Endpoint
app.post("/api/formula-cheatsheet", async (req, res) => {
  try {
    const { topic, subjectCategory } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate a formula cheat sheet." });
    }

    const cleanTopic = topic.trim();
    const ai = getGeminiClient();

    const prompt = `You are a distinguished university professor, STEM curriculum designer, and academic tutor.
Create a comprehensive, high-yield Formula & Equation Cheat Sheet for the topic: "${cleanTopic}" ${
      subjectCategory ? `(Subject Area: ${subjectCategory})` : ""
    }.

YOUR OBJECTIVE:
Extract and format all essential governing equations, laws, formulas, variable meanings with standard SI/customary units, practical exam conditions ("when to use"), common calculation pitfalls, realistic worked numerical/conceptual examples, standard constants, and exam calculation tips.

REQUIREMENTS:
1. Subject Category: Identify the precise domain (e.g., Physics, Calculus, Chemistry, Statistics, Computer Science, Economics, Electrical Engineering, etc.).
2. Overview: Provide a concise 2-3 sentence overview of the mathematical and physical foundations of this topic.
3. Grouped Formula Categories: Organize formulas logically into 2 to 4 thematic categories (e.g., "Fundamental Laws", "Derived Relations", "Energy & Work", "Boundary Conditions & Approximations").
4. For EACH Formula:
   - name: Descriptive canonical name (e.g., "Newton's Second Law of Motion", "Ideal Gas Law", "Arrhenius Rate Equation", "Bayes' Theorem", "Capacitor Energy").
   - latex: Clean standard LaTeX expression (e.g., "F = m \\cdot a", "PV = nRT", "k = A e^{-E_a / (RT)}").
   - plainText: Clear ASCII/Unicode expression for instant copy (e.g., "F = m * a", "PV = nRT").
   - description: 1-2 sentences explaining what physical or mathematical relationship this formula captures.
   - variables: Detailed array of EVERY symbol in the equation with its exact name and standard measurement unit (e.g., Symbol: "P", Meaning: "Absolute Pressure", Unit: "Pascals (Pa) or atm").
   - whenToUse: Specific exam problem triggers (e.g., "Use when given mass and acceleration, or when analyzing net external forces on a closed system").
   - workedExample: A realistic, practical problem with given values, step-by-step substitution steps, and a clearly labeled final answer with units.
   - commonPitfalls: A high-yield warning about mistakes students frequently make on exams (e.g., "Forgetting to convert temperature to Kelvin", "Sign errors with potential energy", "Assuming constant velocity").
5. Constants & Units Reference: 3 to 6 key fundamental constants, standard values, or conversion factors relevant to this topic (e.g., Universal Gas Constant R, Speed of Light c, Gravitational Constant g, etc.).
6. Quick Calculation Tips: 3 to 5 actionable exam tips (e.g., dimensional analysis checks, shortcut ratios, limiting case checks).

If the topic is non-STEM or conceptual, identify its governing quantitative rules, heuristics, standard metrics, or framework ratios.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an elite STEM educator and exam assessment expert. Generate a pristine, highly accurate, mathematically sound formula cheat sheet strictly adhering to the JSON schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              subjectCategory: { type: Type.STRING },
              overview: { type: Type.STRING },
              categories: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    categoryName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    formulas: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          name: { type: Type.STRING },
                          latex: { type: Type.STRING },
                          plainText: { type: Type.STRING },
                          description: { type: Type.STRING },
                          variables: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                symbol: { type: Type.STRING },
                                meaning: { type: Type.STRING },
                                unit: { type: Type.STRING },
                              },
                              required: ["symbol", "meaning"],
                            },
                          },
                          whenToUse: { type: Type.STRING },
                          workedExample: {
                            type: Type.OBJECT,
                            properties: {
                              problem: { type: Type.STRING },
                              given: { type: Type.STRING },
                              solutionSteps: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                              },
                              finalAnswer: { type: Type.STRING },
                            },
                            required: ["problem", "given", "solutionSteps", "finalAnswer"],
                          },
                          commonPitfalls: { type: Type.STRING },
                        },
                        required: ["id", "name", "plainText", "description", "variables", "whenToUse"],
                      },
                    },
                  },
                  required: ["categoryName", "formulas"],
                },
              },
              constantsAndUnits: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    symbol: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                  },
                  required: ["name", "symbol", "value"],
                },
              },
              quickCalculationTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["topic", "subjectCategory", "overview", "categories"],
          },
        },
      },
      ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received from AI model for formula cheat sheet.");
    }

    const parsed = safeJsonExtract(text);

    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    const normalizedCategories = categories.map((cat: any, cIdx: number) => {
      const formulas = Array.isArray(cat.formulas) ? cat.formulas : [];
      return {
        categoryName: cat.categoryName || `Formulas Group ${cIdx + 1}`,
        description: cat.description || "",
        formulas: formulas.map((f: any, fIdx: number) => ({
          id: f.id || `formula-${cIdx + 1}-${fIdx + 1}`,
          name: f.name || `Formula ${fIdx + 1}`,
          latex: f.latex || f.plainText || "",
          plainText: f.plainText || f.latex || "F = ...",
          description: f.description || "",
          variables: Array.isArray(f.variables) ? f.variables : [],
          whenToUse: f.whenToUse || "Use for relevant quantitative problems.",
          workedExample: f.workedExample || null,
          commonPitfalls: f.commonPitfalls || "",
        })),
      };
    });

    return res.json({
      topic: parsed.topic || cleanTopic,
      subjectCategory: parsed.subjectCategory || "General STEM",
      overview: parsed.overview || `Essential formula cheat sheet for ${cleanTopic}.`,
      categories: normalizedCategories,
      constantsAndUnits: Array.isArray(parsed.constantsAndUnits) ? parsed.constantsAndUnits : [],
      quickCalculationTips: Array.isArray(parsed.quickCalculationTips) ? parsed.quickCalculationTips : [],
      generatedAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/formula-cheatsheet:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate formula cheat sheet.",
    });
  }
});

// FEATURE: Analyze Uploaded Study Material (Images & PDFs) and Solve Detected Questions
app.post("/api/analyze-material", async (req, res) => {
  try {
    const { files = [], textNotes = "", focusMode = "all" } = req.body;

    if ((!Array.isArray(files) || files.length === 0) && (!textNotes || !textNotes.trim())) {
      return res.status(400).json({
        error: "Please upload at least one image/PDF file or provide study notes to analyze.",
      });
    }

    const ai = getGeminiClient();

    // Prepare multimodal contents
    const contentsParts: any[] = [];
    const validMimes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"];
    let processedFilesCount = 0;

    if (Array.isArray(files)) {
      for (const f of files) {
        if (!f.base64 || !f.type) continue;
        let mimeType = f.type.toLowerCase();
        if (mimeType === "image/jpg") mimeType = "image/jpeg";
        if (!validMimes.includes(mimeType)) continue;

        const cleanBase64 = f.base64.replace(/^data:[^;]+;base64,/, "");
        contentsParts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        });
        processedFilesCount++;
      }
    }

    const instructionsText = `You are a world-class AI Study Assistant, STEM tutor, and Academic Coach.
The student has uploaded ${processedFilesCount} study material document(s)/photo(s)${
      textNotes ? ` with additional student context: "${textNotes.trim()}"` : ""
    }.
Focus Mode: ${focusMode}.

YOUR CORE MANDATES:
1. Examine all uploaded pages, photos, and documents thoroughly. Extract text, mathematical equations, chemical formulas, code blocks, diagrams, tables, handwritten or printed questions, and problem numbers.
2. Prioritize the content provided by the user. Use the uploaded material as the primary context.
3. Identify ALL distinct questions, problems, exercises, or exam tasks in the uploaded material:
   - Preserve original question wording and mathematical/scientific notation accurately.
   - Do NOT alter or invent questions if real questions exist in the material.
   - If the material consists of general lecture notes or textbook theory without explicit questions, identify the 3 to 5 most important core conceptual questions tested by the material and solve them thoroughly.
4. When a diagram or figure is relevant to a question:
   - Explicitly reference the diagram in "diagramReference" (e.g., "Refer to Figure 1 showing the inclined plane with angle θ = 30°" or "Circuit diagram with 12V source and resistors R1 and R2 in parallel").
5. Provide accurate, crystal-clear solutions for each question:
   - "finalAnswer": Direct, clean final answer (e.g. "x = 4", "Option C (Ribosome)", "v = 14.2 m/s", "Time Complexity: O(n log n)").
   - "stepByStepSolution": An array of clear, numbered sequential steps explaining how to solve it in simple, student-friendly language.
   - "conceptExplanation": 2 to 3 sentences explaining the underlying concept or core principle so the student understands WHY.
   - "formulasUsed": List of all governing formulas, theorems, or rules utilized.
   - "commonMistakes": 1 to 3 high-yield traps, pitfalls, or common errors students make on this type of problem.
6. For Mathematical / Calculation Problems:
   - Populate "mathBreakdown" with:
     - formula: The governing formula
     - substitution: Values substituted into the formula with units
     - calculation: Intermediate calculation steps
     - finalResult: The calculated result with units
7. For Programming / Computer Science Problems:
   - Populate "codeBreakdown" with:
     - approach: High-level algorithmic strategy
     - language: Relevant language (e.g. Python, Java, C++, TypeScript)
     - code: Clean, formatted, commented code
     - explanation: Key parts of the code explained
     - expectedOutput: Sample test case output
8. Learning & Mastery Tools:
   - "hint": A subtle, encouraging hint to nudge the student without giving away the full answer.
   - "simplifiedExplanation": An intuitive, jargon-free breakdown ("Explain like I'm a beginner").
   - "similarQuestion": A new, similar practice problem with its answer and explanation to test mastery.
   - "assumptions": If the uploaded material does not contain enough information or is partially cropped, clearly and explicitly state the assumption made instead of inventing fake data.`;

    contentsParts.push({ text: instructionsText });

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.8-flash",
      {
        contents: contentsParts,
        config: {
          systemInstruction:
            "You are an expert AI Study Assistant and Educator. Solve problems accurately with step-by-step clarity, preserve mathematical notation, reference diagrams, and format the output strictly as valid JSON adhering to the provided schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              materialSummary: {
                type: Type.STRING,
                description: "A concise 2-3 sentence overview of what this uploaded material contains.",
              },
              subjectDomain: {
                type: Type.STRING,
                description: "e.g. Physics / Mechanics, Calculus, Organic Chemistry, Computer Science, Economics",
              },
              keyTopicsCovered: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 to 6 key topics identified in the material.",
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    questionNumber: { type: Type.STRING },
                    questionText: { type: Type.STRING },
                    questionType: {
                      type: Type.STRING,
                      description: "math | programming | conceptual | diagram_based | multiple_choice | short_answer",
                    },
                    diagramReference: { type: Type.STRING },
                    finalAnswer: { type: Type.STRING },
                    stepByStepSolution: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    conceptExplanation: { type: Type.STRING },
                    formulasUsed: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    commonMistakes: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    mathBreakdown: {
                      type: Type.OBJECT,
                      properties: {
                        formula: { type: Type.STRING },
                        substitution: { type: Type.STRING },
                        calculation: { type: Type.STRING },
                        finalResult: { type: Type.STRING },
                      },
                    },
                    codeBreakdown: {
                      type: Type.OBJECT,
                      properties: {
                        approach: { type: Type.STRING },
                        language: { type: Type.STRING },
                        code: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        expectedOutput: { type: Type.STRING },
                      },
                    },
                    hint: { type: Type.STRING },
                    simplifiedExplanation: { type: Type.STRING },
                    similarQuestion: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                      },
                    },
                    assumptions: { type: Type.STRING },
                  },
                  required: [
                    "id",
                    "questionNumber",
                    "questionText",
                    "questionType",
                    "finalAnswer",
                    "stepByStepSolution",
                    "conceptExplanation",
                    "hint",
                  ],
                },
                description: "All detected questions and their comprehensive solutions.",
              },
            },
            required: ["materialSummary", "subjectDomain", "keyTopicsCovered", "questions"],
          },
        },
      },
      ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"]
    );

    const text = response.text;
    if (!text) {
      throw new Error("No response received from AI model.");
    }

    const parsed = safeJsonExtract(text);

    return res.json({
      id: `mat-${Date.now()}`,
      materialSummary: parsed.materialSummary || "Analyzed uploaded study material.",
      subjectDomain: parsed.subjectDomain || "General Academic",
      keyTopicsCovered: Array.isArray(parsed.keyTopicsCovered) ? parsed.keyTopicsCovered : [],
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.map((q: any, idx: number) => ({
            id: q.id || `q-${idx + 1}`,
            questionNumber: q.questionNumber || `${idx + 1}`,
            questionText: q.questionText || `Question ${idx + 1}`,
            questionType: q.questionType || "conceptual",
            diagramReference: q.diagramReference || null,
            finalAnswer: q.finalAnswer || "See detailed step-by-step solution below.",
            stepByStepSolution: Array.isArray(q.stepByStepSolution) && q.stepByStepSolution.length > 0
              ? q.stepByStepSolution
              : ["Review problem statement.", "Apply underlying principles.", "Compute result."],
            conceptExplanation: q.conceptExplanation || "Review the governing principles for this problem.",
            formulasUsed: Array.isArray(q.formulasUsed) ? q.formulasUsed : [],
            commonMistakes: Array.isArray(q.commonMistakes) ? q.commonMistakes : [],
            mathBreakdown: q.mathBreakdown || null,
            codeBreakdown: q.codeBreakdown || null,
            hint: q.hint || "Carefully identify the given variables and desired outcome.",
            simplifiedExplanation: q.simplifiedExplanation || null,
            similarQuestion: q.similarQuestion || null,
            assumptions: q.assumptions || null,
          }))
        : [],
      generatedAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/analyze-material:", error);
    return res.status(500).json({
      error: error?.message || "Failed to analyze study material. Please verify the files are clear and readable.",
    });
  }
});

// FEATURE: Interactive Follow-up & Quick Study Actions on Uploaded Material
app.post("/api/material-action", async (req, res) => {
  try {
    const {
      action,
      question,
      materialSummary = "",
      userQuery = "",
      history = [],
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Action is required." });
    }

    const ai = getGeminiClient();

    if (action === "quiz_me") {
      // Generate an interactive 3-question quiz from this material
      const quizPrompt = `Based on this study material:
Summary: "${materialSummary}"
Question Context: ${question ? JSON.stringify(question) : "General study concepts"}

Generate an engaging, interactive 3-question quick quiz to test the student's understanding.
For each question, provide 4 options, the 0-based index of the correct option, a helpful hint, and a clear explanation.`;

      const { response } = await generateContentWithFallback(
        ai,
        "gemini-3.8-flash",
        {
          contents: quizPrompt,
          config: {
            systemInstruction: "You are an expert tutor creating a concise quiz. Return strictly valid JSON.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctOptionIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                      hint: { type: Type.STRING },
                    },
                    required: ["id", "question", "options", "correctOptionIndex", "explanation", "hint"],
                  },
                },
              },
              required: ["quizItems"],
            },
          },
        },
        ["gemini-2.5-flash", "gemini-3.5-flash"]
      );

      const parsed = safeJsonExtract(response.text || "{}");
      return res.json({
        action: "quiz_me",
        quizItems: Array.isArray(parsed.quizItems) ? parsed.quizItems : [],
      });
    }

    if (action === "summarize") {
      const summaryPrompt = `Generate a high-yield, structured revision summary of this study material:
Summary Context: "${materialSummary}"
${question ? `Highlighted Problem: ${question.questionText}` : ""}

Provide:
1. Executive Core Concept: 2 sentences on the big picture.
2. 3 to 5 Must-Know Exam Takeaways (bullet points).
3. Crucial Formulas or Laws to remember.
4. Top 2 Common Exam Traps to avoid.`;

      const { response } = await generateContentWithFallback(
        ai,
        "gemini-3.8-flash",
        {
          contents: summaryPrompt,
          config: {
            systemInstruction: "You are an academic coach creating a crisp revision summary. Use clear markdown formatting.",
          },
        },
        ["gemini-2.5-flash", "gemini-3.5-flash"]
      );

      return res.json({
        action: "summarize",
        text: response.text || "Summary generated.",
      });
    }

    // Single Question Actions: follow_up, explain_simply, show_steps, give_hint, generate_similar
    let systemPrompt = "You are a warm, encouraging, and razor-sharp AI Academic Tutor.";
    let userPrompt = "";

    const questionContext = question
      ? `
QUESTION ${question.questionNumber}:
"${question.questionText}"
FINAL ANSWER:
"${question.finalAnswer}"
STEP-BY-STEP SOLUTION:
${Array.isArray(question.stepByStepSolution) ? question.stepByStepSolution.join("\n") : ""}
FORMULAS:
${Array.isArray(question.formulasUsed) ? question.formulasUsed.join(", ") : "N/A"}
`
      : `MATERIAL CONTEXT: "${materialSummary}"`;

    if (action === "explain_simply") {
      userPrompt = `Please explain this question and solution as simply as possible, as if explaining to a 10-year-old or complete beginner. Avoid unnecessary technical jargon and use a relatable everyday analogy.\n${questionContext}`;
    } else if (action === "show_steps") {
      userPrompt = `Please provide a deeper, microscopic step-by-step breakdown of every intermediate algebraic, physical, or logical step for this question, explaining exactly WHY each step is valid.\n${questionContext}`;
    } else if (action === "give_hint") {
      userPrompt = `Provide a progressive 2-level hint for this question:
- Hint 1 (Gentle Nudge): Guides the student where to look without revealing the solution.
- Hint 2 (Key Connection): Points out the crucial formula or connection needed.\n${questionContext}`;
    } else if (action === "generate_similar") {
      userPrompt = `Create an identical-format companion practice problem that tests the exact same concept as this question with different numbers/variables, along with its step-by-step solution and final answer so the student can practice.\n${questionContext}`;
    } else {
      // Follow-up question / Q&A
      const chatHistory = Array.isArray(history) && history.length > 0
        ? `PREVIOUS CHAT:\n` + history.map((m: any) => `${m.sender}: ${m.text}`).join("\n") + `\n`
        : "";

      userPrompt = `Student's Question / Request: "${userQuery}"\n\n${questionContext}\n\n${chatHistory}
Please answer the student's question directly, clearly, and supportively. Help them build true understanding. Use clean markdown formatting.`;
    }

    const { response } = await generateContentWithFallback(
      ai,
      "gemini-3.8-flash",
      {
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
        },
      },
      ["gemini-2.5-flash", "gemini-3.5-flash"]
    );

    return res.json({
      action,
      text: response.text || "Here is the explanation.",
    });
  } catch (error: any) {
    console.error("Error in /api/material-action:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process question action.",
    });
  }
});

// FEATURE 4: Interactive Flashcards Generator
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { topic, difficulty = "Intermediate", count = 8, context } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate flashcards." });
    }

    const ai = getGeminiClient();
    const cleanTopic = topic.trim();
    const targetCount = Math.min(Math.max(Number(count) || 8, 4), 16);

    const contextAddition = context ? `\n\nAdditional source context:\n${context.substring(0, 3000)}` : "";

    const prompt = `Create ${targetCount} high-yield study flashcards for the topic: "${cleanTopic}" (Difficulty: ${difficulty}).${contextAddition}

Each card must test active recall on fundamental definitions, core formulas, key mechanisms, common misconceptions, or problem-solving principles.
For each card provide:
1. front: A focused question, conceptual challenge, or formula prompt.
2. back: A concise, accurate, crystal-clear explanation or solution with the key takeaway.
3. conceptTag: Short tag (e.g. "Definition", "Formula", "Mechanism", "Application", "Exception").
4. hint: A quick subtle clue for active recall before flipping.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert cognitive learning and flashcard design specialist. Create punchy, high-yield active recall flashcards following the requested JSON schema strictly.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              deckTitle: {
                type: Type.STRING,
                description: "Concise title of the flashcard deck.",
              },
              topic: {
                type: Type.STRING,
                description: "The core subject or topic.",
              },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    front: {
                      type: Type.STRING,
                      description: "Question, term, or prompt on front of card.",
                    },
                    back: {
                      type: Type.STRING,
                      description: "Answer, explanation, or resolution on back of card.",
                    },
                    conceptTag: {
                      type: Type.STRING,
                      description: "Category or concept tag.",
                    },
                    hint: {
                      type: Type.STRING,
                      description: "Helpful hint before revealing answer.",
                    },
                  },
                  required: ["front", "back", "conceptTag", "hint"],
                },
                description: `Array of ${targetCount} flashcards.`,
              },
            },
            required: ["deckTitle", "topic", "cards"],
          },
        },
      },
      ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) throw new Error("No response from AI model.");
    const parsed = safeJsonExtract(text);

    const cards = (Array.isArray(parsed.cards) ? parsed.cards : []).map((card: any, idx: number) => ({
      id: `card-${idx + 1}-${Date.now()}`,
      front: card.front || `Question about ${cleanTopic}`,
      back: card.back || `Key point regarding ${cleanTopic}`,
      conceptTag: card.conceptTag || "Key Concept",
      hint: card.hint || "Think about the underlying principle.",
      mastery: "unseen",
      reviewCount: 0,
    }));

    return res.json({
      id: `deck-${Date.now()}`,
      deckTitle: parsed.deckTitle || `${cleanTopic} Flashcards`,
      topic: cleanTopic,
      difficulty,
      totalCards: cards.length,
      cards,
      createdAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-flashcards:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate flashcards.",
    });
  }
});

// FEATURE 5: Custom Study Schedule & Revision Checklist Generator
app.post("/api/generate-study-plan", async (req, res) => {
  try {
    const { examName, targetDate, topics, dailyHours = 2, currentLevel = "Intermediate" } = req.body;

    if (!examName || typeof examName !== "string" || !examName.trim()) {
      return res.status(400).json({ error: "Exam or subject name is required." });
    }

    const cleanExamName = examName.trim();
    const topicsStr = Array.isArray(topics) ? topics.join(", ") : String(topics || "General Syllabus");
    const hours = Math.min(Math.max(Number(dailyHours) || 2, 0.5), 10);

    // Calculate days remaining
    let daysRemaining = 14;
    if (targetDate) {
      const now = new Date();
      const target = new Date(targetDate);
      const diffMs = target.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) daysRemaining = Math.min(diffDays, 90);
    }

    const ai = getGeminiClient();

    const prompt = `Create a realistic, high-impact Day-by-Day Study & Revision Schedule for:
- Exam / Goal: "${cleanExamName}"
- Target Date: ${targetDate || `${daysRemaining} days from now`} (${daysRemaining} days remaining)
- Syllabus Topics to cover: ${topicsStr}
- Daily Study Time Available: ${hours} hours/day
- Student Level: ${currentLevel}

Structure this into 3 to 4 sequential phases (e.g. Phase 1: Core Foundation & Concept Building, Phase 2: Active Recall & Deep Practice, Phase 3: High-Yield Formula Drills & Weak Areas, Phase 4: Full Mock Exam & Final Polish).
For each day in the timeline (create 5 to 14 discrete milestone study days tailored to the timeframe), produce actionable checklist tasks that can be ticked off.`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are a premier academic coach and exam strategist. Design practical, spaced-repetition revision schedules that maximize student retention. Return strictly valid JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planTitle: {
                type: Type.STRING,
                description: "Catchy, professional title for the study plan.",
              },
              overview: {
                type: Type.STRING,
                description: "Strategy overview and motivational guidance (2 sentences).",
              },
              totalEstimatedHours: {
                type: Type.NUMBER,
                description: "Total estimated study hours across the plan.",
              },
              phases: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phaseName: {
                      type: Type.STRING,
                      description: "e.g. 'Phase 1: Foundations & Core Concepts'",
                    },
                    phaseFocus: {
                      type: Type.STRING,
                      description: "Brief goal of this phase.",
                    },
                    dayRange: {
                      type: Type.STRING,
                      description: "e.g. 'Days 1-4'",
                    },
                  },
                  required: ["phaseName", "phaseFocus", "dayRange"],
                },
                description: "Sequential phases of the plan.",
              },
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayNumber: {
                      type: Type.INTEGER,
                      description: "1-based day index (Day 1, Day 2, etc.).",
                    },
                    title: {
                      type: Type.STRING,
                      description: "Title of the study task.",
                    },
                    topic: {
                      type: Type.STRING,
                      description: "Specific topic or chapter covered.",
                    },
                    actionSteps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "2 to 3 practical actionable steps.",
                    },
                    estimatedMinutes: {
                      type: Type.INTEGER,
                      description: "Estimated study minutes for this day's session.",
                    },
                    priority: {
                      type: Type.STRING,
                      description: "'High', 'Medium', or 'Low'.",
                    },
                  },
                  required: ["dayNumber", "title", "topic", "actionSteps", "estimatedMinutes", "priority"],
                },
                description: "Daily checklist tasks.",
              },
              topExamTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 to 4 high-yield test day tips.",
              },
            },
            required: ["planTitle", "overview", "phases", "tasks", "topExamTips"],
          },
        },
      },
      ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) throw new Error("No response from AI model.");
    const parsed = safeJsonExtract(text);

    const formattedTasks = (Array.isArray(parsed.tasks) ? parsed.tasks : []).map((t: any, idx: number) => ({
      id: `task-${idx + 1}-${Date.now()}`,
      dayNumber: typeof t.dayNumber === "number" ? t.dayNumber : idx + 1,
      title: t.title || `Revision Day ${idx + 1}`,
      topic: t.topic || "Core Syllabus",
      actionSteps: Array.isArray(t.actionSteps) ? t.actionSteps : ["Review key notes", "Practice 5 questions"],
      estimatedMinutes: Number(t.estimatedMinutes) || Math.round(hours * 60),
      priority: (t.priority === "High" || t.priority === "Low") ? t.priority : "Medium",
      completed: false,
    }));

    return res.json({
      id: `plan-${Date.now()}`,
      examName: cleanExamName,
      targetDate: targetDate || "",
      daysRemaining,
      dailyHours: hours,
      planTitle: parsed.planTitle || `${cleanExamName} Revision Plan`,
      overview: parsed.overview || "Structured revision plan to maximize retention and exam performance.",
      totalEstimatedHours: parsed.totalEstimatedHours || Math.round(formattedTasks.length * hours),
      phases: Array.isArray(parsed.phases) ? parsed.phases : [],
      tasks: formattedTasks,
      topExamTips: Array.isArray(parsed.topExamTips) ? parsed.topExamTips : [],
      createdAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-study-plan:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate study plan.",
    });
  }
});

// FEATURE 6: Targeted Practice Mode & Timed Exam Simulation
app.post("/api/generate-exam", async (req, res) => {
  try {
    const { topic, difficulty = "Intermediate", questionCount = 5, timeLimitMinutes = 10 } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required to generate practice exam." });
    }

    const cleanTopic = topic.trim();
    const count = Math.min(Math.max(Number(questionCount) || 5, 3), 15);
    const duration = Math.min(Math.max(Number(timeLimitMinutes) || 10, 2), 60);

    const ai = getGeminiClient();

    const prompt = `Generate a realistic timed practice exam simulation on the topic: "${cleanTopic}".
Difficulty Level: ${difficulty}
Total Questions: ${count}
Allocated Time: ${duration} minutes

Create rigorous, realistic multiple-choice questions testing both concept application and calculation/problem-solving where applicable.
For each question provide:
1. question: Clear, unambiguous question scenario.
2. options: 4 distinct choices.
3. correctOptionIndex: 0-3.
4. explanation: Complete step-by-step reasoning explaining why the correct choice is right and where distractors fail.
5. hint: Useful hint without giving away the exact answer.
6. category: Topic sub-category (e.g. "Theory", "Formula Application", "Diagnostics", "Interpretation").`;

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      "gemini-3.5-flash",
      {
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert exam creator. Design authentic, calibrated practice test questions following the requested JSON schema strictly.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              examTitle: {
                type: Type.STRING,
                description: "Title of the practice exam.",
              },
              instructions: {
                type: Type.STRING,
                description: "Brief test-taking instruction.",
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Exactly 4 options.",
                    },
                    correctOptionIndex: { type: Type.INTEGER },
                    explanation: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    category: { type: Type.STRING },
                  },
                  required: ["question", "options", "correctOptionIndex", "explanation", "hint", "category"],
                },
                description: `Array of ${count} questions.`,
              },
            },
            required: ["examTitle", "instructions", "questions"],
          },
        },
      },
      ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.7-flash"]
    );

    const text = response.text;
    if (!text) throw new Error("No response from AI model.");
    const parsed = safeJsonExtract(text);

    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const formattedQuestions = rawQuestions.map((q: any, idx: number) => {
      const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ["Option A", "Option B", "Option C", "Option D"];
      let correctIdx = typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0;
      if (correctIdx < 0 || correctIdx >= options.length) correctIdx = 0;

      return {
        id: `exam-q-${idx + 1}-${Date.now()}`,
        questionNumber: idx + 1,
        question: q.question || `Question ${idx + 1} on ${cleanTopic}`,
        options,
        correctOptionIndex: correctIdx,
        explanation: q.explanation || "Review the underlying concepts for complete breakdown.",
        hint: q.hint || "Recall the core governing rule.",
        category: q.category || "General",
      };
    });

    return res.json({
      id: `exam-${Date.now()}`,
      examTitle: parsed.examTitle || `${cleanTopic} Practice Exam`,
      instructions: parsed.instructions || `Complete all questions within ${duration} minutes.`,
      topic: cleanTopic,
      difficulty,
      timeLimitMinutes: duration,
      totalQuestions: formattedQuestions.length,
      questions: formattedQuestions,
      createdAt: new Date().toISOString(),
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/generate-exam:", error);
    return res.status(500).json({
      error: error?.message || "Failed to generate practice exam.",
    });
  }
});

// Vite middleware & Static Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Study Explainer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
