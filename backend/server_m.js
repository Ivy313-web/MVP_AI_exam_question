
// API
require("dotenv").config();

const Groq = require("groq-sdk");

// body
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MAXI mock backend"
  });
});

// ATTEMPT STORE

const attempts = new Map();

function getOrCreateAttempt(attemptId) {
  if (!attempts.has(attemptId)) {
    attempts.set(attemptId, {
      gradedResults: [],
      pendingAIAnswers: []
    });
  }

  return attempts.get(attemptId);
}

function saveOrReplaceByQuestionId(list, item) {
  const existingIndex = list.findIndex((existingItem) => {
    return existingItem.questionId === item.questionId;
  });

  if (existingIndex >= 0) {
    list[existingIndex] = item;
  } else {
    list.push(item);
  }
}

function removeByQuestionId(list, questionId) {
  return list.filter((item) => {
    return item.questionId !== questionId;
  });
}

//QUESTION

const questionBank = [
    {
    id: "q1",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "Which component of velocity remains constant in ideal projectile motion when air resistance is ignored?",
    quizOptions: ["Horizontal velocity", "Vertical velocity", "Resultant velocity", "Terminal velocity"],
    quizCorrectAnswer: "Horizontal velocity",
    shortAcceptedAnswers: ["horizontal velocity", "horizontal component of velocity", "x velocity"],
    marks: 1
  },
  {
  id: "q2",
  topic: {
    level1: "Topic",
    level2: "Physics",
    level3: "Projectile Motion"
  },
  prompt: "Explain the acceleration of a projectile near Earth's surface when air resistance is ignored.",
  quizOptions: ["0 m/s^2", "9.8 m/s^2 downward", "9.8 m/s upward", "It changes with speed"],
  quizCorrectAnswer: "9.8 m/s^2 downward",
  shortAcceptedAnswers: ["9.8 m/s^2 downward", "9.8 metres per second squared downward", "g downward", "gravity downward"],
  markScheme: [
    {
      point: "States that the acceleration has magnitude 9.8 m/s^2 or g.",
      marks: 1
    },
    {
      point: "States that the acceleration is downward or towards Earth.",
      marks: 1
    }
  ],
  marks: 2
  },
  {
    id: "q3",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "At the highest point of a projectile's path, what is its vertical velocity?",
    quizOptions: ["Zero", "Maximum", "Equal to horizontal velocity", "Equal to acceleration"],
    quizCorrectAnswer: "Zero",
    shortAcceptedAnswers: ["zero", "0", "0 m/s"],
    marks: 1
  },
  {
    id: "q4",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "What shape is the path of an ideal projectile?",
    quizOptions: ["Parabola", "Circle", "Ellipse", "Straight line"],
    quizCorrectAnswer: "Parabola",
    shortAcceptedAnswers: ["parabola", "parabolic", "a parabola"],
    marks: 1
  },
  {
    id: "q5",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "Which force acts on an ideal projectile after launch when air resistance is ignored?",
    quizOptions: ["Weight", "Thrust", "Drag", "Normal reaction"],
    quizCorrectAnswer: "Weight",
    shortAcceptedAnswers: ["weight", "gravity", "gravitational force"],
    marks: 1
  },
  {
    id: "q6",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "For launch and landing at the same height, which launch angle gives maximum range?",
    quizOptions: ["45 degrees", "30 degrees", "60 degrees", "90 degrees"],
    quizCorrectAnswer: "45 degrees",
    shortAcceptedAnswers: ["45 degrees", "45"],
    marks: 1
  },
  {
    id: "q7",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "If initial speed is fixed, what happens to time of flight when the vertical launch component increases?",
    quizOptions: ["It increases", "It decreases", "It becomes zero", "It is unaffected"],
    quizCorrectAnswer: "It increases",
    shortAcceptedAnswers: ["it increases", "increases", "gets longer", "time of flight increases"],
    marks: 1
  },
  {
    id: "q8",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "Which initial velocity component determines the range when time of flight is known?",
    quizOptions: ["Horizontal component", "Vertical component", "Acceleration component", "Resultant component"],
    quizCorrectAnswer: "Horizontal component",
    shortAcceptedAnswers: ["horizontal component", "horizontal velocity", "horizontal component of velocity"],
    marks: 1
  },
  {
    id: "q9",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "What assumption allows horizontal acceleration to be zero in projectile motion?",
    quizOptions: ["No air resistance", "Constant mass", "Small launch angle", "High launch speed"],
    quizCorrectAnswer: "No air resistance",
    shortAcceptedAnswers: ["no air resistance", "air resistance ignored", "ignore air resistance", "no drag"],
    marks: 1
  },
  {
    id: "q10",
    topic: {
      level1: "Topic",
      level2: "Physics",
      level3: "Projectile Motion"
    },
    prompt: "What is the horizontal displacement of a projectile commonly called?",
    quizOptions: ["Range", "Height", "Amplitude", "Period"],
    quizCorrectAnswer: "Range",
    shortAcceptedAnswers: ["range", "horizontal range"],
    marks: 1
  }
];

//return to main
function getPublicQuestion(question) {
  return {
    id: question.id,
    prompt: question.prompt,
    quizOptions: question.quizOptions,
    marks: question.marks
  };
}

// get question method
app.get("/api/questions", (req, res) => {
  const publicQuestions = questionBank.map(getPublicQuestion);
  res.json({
    questions: publicQuestions
  });
});


// standardize the question
function normaliseAnswer(answer) {
  return String(answer || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findQuestionById(questionId) {
  return questionBank.find((question) => question.id === questionId);
}

function getFinalStatus(isSkipped, marksAwarded, marksAvailable) {
  if (isSkipped) {
    return "skipped";
  }

  return marksAwarded >= marksAvailable / 2 ? "correct" : "incorrect";
}

const aiGradingSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      questionId: {
        type: "string"
      },
      marksAwarded: {
        type: "integer"
      },
      feedback: {
        type: "string"
      }
    },
    required: ["questionId", "marksAwarded", "feedback"]
  }
};

async function gradePendingAnswersWithMockAI(pendingAIAnswers) {
  return pendingAIAnswers.map((pendingAnswer) => {
    const question = findQuestionById(pendingAnswer.questionId);
    const marksAvailable = pendingAnswer.marksAvailable || question?.marks || 1;

    const marksAwarded = 0;
    const status = getFinalStatus(false, marksAwarded, marksAvailable);

    return {
      questionId: pendingAnswer.questionId,
      questionType: pendingAnswer.questionType,
      userAnswer: pendingAnswer.userAnswer,
      isSkipped: false,
      prompt: pendingAnswer.prompt,
      correctAnswer: pendingAnswer.correctAnswer,
      status,
      isCorrect: status === "correct",
      marksAwarded,
      marksAvailable,
      percentage: Math.round((marksAwarded / marksAvailable) * 100),
      feedback: "Mock AI checked this answer. This will be replaced by real AI grading later.",
      markBreakdown: []
    };
  });
}

//AI marking-----------------------------------------------------------------------------
async function gradePendingAnswersWithGroq(pendingAIAnswers) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in .env");
  }

  if (!Array.isArray(pendingAIAnswers) || pendingAIAnswers.length === 0) {
    return [];
  }

  const gradingItems = pendingAIAnswers.map((pendingAnswer) => {
    const question = findQuestionById(pendingAnswer.questionId);

    return {
      questionId: pendingAnswer.questionId,
      prompt: pendingAnswer.prompt || question?.prompt || "",
      userAnswer: pendingAnswer.userAnswer || "",
      correctAnswer: pendingAnswer.correctAnswer || question?.quizCorrectAnswer || "",
      acceptedAnswers: question?.shortAcceptedAnswers || [],
      marksAvailable: pendingAnswer.marksAvailable || question?.marks || 1,
      markScheme: question?.markScheme || []
    };
  });

  const prompt = `
You are an experienced A-level Physics examiner.

Your only job is to mark student answers.
You are not a tutor.
You are not a chatbot.
Follow the mark scheme and marking rules exactly.

OUTPUT FORMAT:
Return only one valid JSON object.
Do not include markdown.
Do not include code fences.
Do not include comments.
Do not include extra text.

The JSON object must exactly follow this structure:
{
  "results": [
    {
      "questionId": "q1",
      "marksAwarded": 1,
      "feedback": "Brief feedback."
    }
  ]
}

Do not output any additional keys.

MARKING RULES:
- Always return one result for every question given.
- Never skip a question.
- Never invent or change questionIds.
- marksAwarded must be an integer.
- marksAwarded must be between 0 and marksAvailable.
- Award marks based on scientific meaning, not exact wording.
- Do not reward vague, irrelevant, or copied-looking answers.
- Feedback must be brief, student-friendly, and only about the answer.
- If markScheme is provided, award marks according to the markScheme points.
- Each markScheme point is worth the number of marks shown.
- Award a markScheme point if the student clearly expresses the same scientific idea, even if the wording is different.
- Accept common student wording such as "downwards" for "towards Earth", and "g" for "9.8 m/s^2".
- If the answer is ambiguous but likely shows the correct idea, award the mark.
- Be exam-style fair, not overly strict.

EXAMPLES:

Input:
{
  "questionId": "q1",
  "prompt": "Which component of velocity remains constant in ideal projectile motion when air resistance is ignored?",
  "userAnswer": "the sideways speed stays the same",
  "correctAnswer": "Horizontal velocity",
  "acceptedAnswers": ["horizontal velocity", "horizontal component of velocity", "x velocity"],
  "marksAvailable": 1
}

Output:
{
  "results": [
    {
      "questionId": "q1",
      "marksAwarded": 1,
      "feedback": "Correct. You identified the horizontal component of velocity."
    }
  ]
}

Input:
{
  "questionId": "q2",
  "prompt": "What is the vertical acceleration of a projectile near Earth's surface, ignoring air resistance?",
  "userAnswer": "it moves faster",
  "correctAnswer": "9.8 m/s^2 downward",
  "acceptedAnswers": ["9.8 m/s^2 downward", "g downward", "gravity downward"],
  "marksAvailable": 1
}

Output:
{
  "results": [
    {
      "questionId": "q2",
      "marksAwarded": 0,
      "feedback": "This is too vague. You need to state the downward acceleration due to gravity."
    }
  ]
}

Questions to mark:
${JSON.stringify(gradingItems, null, 2)}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0,
    response_format: {
      type: "json_object"
    }
  });

  const rawText = completion.choices[0].message.content;
  const parsed = JSON.parse(rawText);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.results)) {
    return parsed.results;
  }

  throw new Error("Groq returned JSON but not an array or results array");
}

function normalizeAIGradingResult(aiResult, pendingAnswer) {
  const question = findQuestionById(pendingAnswer.questionId);
  const marksAvailable = pendingAnswer.marksAvailable || question?.marks || 1;

  let marksAwarded = Number(aiResult?.marksAwarded);

  if (!Number.isFinite(marksAwarded)) {
    marksAwarded = 0;
  }

  marksAwarded = Math.round(marksAwarded);
  marksAwarded = Math.max(0, Math.min(marksAwarded, marksAvailable));

  const status = getFinalStatus(false, marksAwarded, marksAvailable);
  const percentage = marksAvailable > 0
    ? Math.round((marksAwarded / marksAvailable) * 100)
    : 0;

  return {
    questionId: pendingAnswer.questionId,
    questionType: pendingAnswer.questionType,
    userAnswer: pendingAnswer.userAnswer,
    isSkipped: false,
    prompt: pendingAnswer.prompt || question?.prompt || "",
    correctAnswer: pendingAnswer.correctAnswer || question?.quizCorrectAnswer || "",
    status,
    isCorrect: status === "correct",
    marksAwarded,
    marksAvailable,
    percentage,
    feedback:
      typeof aiResult?.feedback === "string" && aiResult.feedback.trim()
        ? aiResult.feedback.trim()
        : "AI checked this answer, but no feedback was returned.",
    markBreakdown: []
  };
}

// -----------------------------------------------------------------------------------------
function createAttemptSummary(results) {
  const totalMarksAwarded = results.reduce((total, result) => {
    return total + (result.marksAwarded || 0);
  }, 0);

  const totalMarksAvailable = results.reduce((total, result) => {
    return total + (result.marksAvailable || 0);
  }, 0);

  return {
    totalMarksAwarded,
    totalMarksAvailable,
    percentage: totalMarksAvailable > 0
      ? Math.round((totalMarksAwarded / totalMarksAvailable) * 100)
      : 0
  };
}

function sortResultsByQuestionOrder(results) {
  return questionBank
    .map((question) => {
      return results.find((result) => result.questionId === question.id);
    })
    .filter(Boolean);
}

//quiz
function gradeQuizAnswer(question, userAnswer) {
  const isCorrect = normaliseAnswer(userAnswer) === normaliseAnswer(question.quizCorrectAnswer);
  const marksAvailable = question.marks || 1;
  const marksAwarded = isCorrect ? marksAvailable : 0;

  return {
    status: isCorrect ? "correct" : "incorrect",
    isCorrect,
    marksAwarded,
    marksAvailable,
    percentage: Math.round((marksAwarded / marksAvailable) * 100),
    correctAnswer: question.quizCorrectAnswer,
    feedback: isCorrect
      ? "Correct answer."
      : `The correct answer is ${question.quizCorrectAnswer}.`,
    markBreakdown: []
  };
}

//short
function gradeShortAnswer(question, userAnswer) {
  const acceptedAnswers = question.shortAcceptedAnswers.map(normaliseAnswer);
  const isLocalMatch = acceptedAnswers.includes(normaliseAnswer(userAnswer));

  const marksAvailable = question.marks || 1;
  const marksAwarded = isLocalMatch ? marksAvailable : 0;

  return {
    isLocalMatch,
    status: isLocalMatch ? "correct" : "incorrect",
    isCorrect: isLocalMatch,
    marksAwarded,
    marksAvailable,
    percentage: Math.round((marksAwarded / marksAvailable) * 100),
    correctAnswer: question.quizCorrectAnswer,
    feedback: isLocalMatch
      ? "Correct answer."
      : `This answer needs AI checking at the end.`,
    markBreakdown: []
  };
}

// end point
app.post("/api/grade-answer", (req, res) => {
  const { attemptId, questionId, questionType, userAnswer, isSkipped } = req.body;

  if (!attemptId || !questionId || !questionType) {
    return res.status(400).json({
      error: "Missing attemptId, questionId or questionType"
    });
  }

const question = findQuestionById(questionId);

if (!question) {
  return res.status(404).json({
    error: "Question not found"
  });
}

const attempt = getOrCreateAttempt(attemptId);

if (isSkipped) {
  const skippedResult = {
    questionId: question.id,
    questionType,
    userAnswer: "Skipped",
    isSkipped: true,
    prompt: question.prompt,
    correctAnswer: question.quizCorrectAnswer,
    status: "skipped",
    isCorrect: false,
    marksAwarded: 0,
    marksAvailable: question.marks || 1,
    percentage: 0,
    feedback: "This question was skipped.",
    markBreakdown: []
  };

  saveOrReplaceByQuestionId(attempt.gradedResults, skippedResult);
  attempt.pendingAIAnswers = removeByQuestionId(attempt.pendingAIAnswers, question.id);

  return res.json(skippedResult);
}


  if (questionType === "quiz") {
  const grading = gradeQuizAnswer(question, userAnswer);

  const result = {
    questionId: question.id,
    questionType,
    userAnswer,
    isSkipped: false,
    prompt: question.prompt,
    ...grading
  };

  saveOrReplaceByQuestionId(attempt.gradedResults, result);
  attempt.pendingAIAnswers = removeByQuestionId(attempt.pendingAIAnswers, question.id);

  return res.json(result);
}

if (questionType === "short") {
  const grading = gradeShortAnswer(question, userAnswer);

  if (grading.isLocalMatch) {
    const result = {
      questionId: question.id,
      questionType,
      userAnswer,
      isSkipped: false,
      prompt: question.prompt,
      status: grading.status,
      isCorrect: grading.isCorrect,
      marksAwarded: grading.marksAwarded,
      marksAvailable: grading.marksAvailable,
      percentage: grading.percentage,
      correctAnswer: grading.correctAnswer,
      feedback: grading.feedback,
      markBreakdown: grading.markBreakdown
    };

    saveOrReplaceByQuestionId(attempt.gradedResults, result);
    attempt.pendingAIAnswers = removeByQuestionId(attempt.pendingAIAnswers, question.id);

    return res.json(result);
  }

  const pendingResult = {
    questionId: question.id,
    questionType,
    userAnswer,
    isSkipped: false,
    prompt: question.prompt,
    correctAnswer: question.quizCorrectAnswer,
    marksAvailable: question.marks || 1
  };

  saveOrReplaceByQuestionId(attempt.pendingAIAnswers, pendingResult);
  attempt.gradedResults = removeByQuestionId(attempt.gradedResults, question.id);

  return res.json({
    questionId: question.id,
    questionType,
    userAnswer,
    isSkipped: false,
    prompt: question.prompt,
    correctAnswer: "",
    status: "pending_ai",
    isCorrect: false,
    marksAwarded: 0,
    marksAvailable: question.marks || 1,
    percentage: 0,
    feedback: "This answer will be checked at the end.",
    markBreakdown: []
  });
}

return res.status(400).json({
  error: "Unsupported questionType"
});
});

app.post("/api/finalize-attempt", async (req, res) => {
  const { attemptId } = req.body;

  if (!attemptId) {
    return res.status(400).json({
      error: "Missing attemptId"
    });
  }

  const attempt = attempts.get(attemptId);

  if (!attempt) {
    return res.status(404).json({
      error: "Attempt not found"
    });
  }

let aiGradedResults = [];

if (attempt.pendingAIAnswers.length > 0) {
  try {
    console.log("Using Groq to grade pending short answers...");

    const rawAIResults = await gradePendingAnswersWithGroq(attempt.pendingAIAnswers);

    aiGradedResults = attempt.pendingAIAnswers.map((pendingAnswer) => {
      const matchingAIResult = rawAIResults.find((aiResult) => {
        return aiResult.questionId === pendingAnswer.questionId;
      });

      return normalizeAIGradingResult(matchingAIResult, pendingAnswer);
    });
  } catch (error) {
    console.error("Groq grading failed. Falling back to mock AI:", error.message);

    aiGradedResults = await gradePendingAnswersWithMockAI(attempt.pendingAIAnswers);
  }
}

aiGradedResults.forEach((result) => {
  saveOrReplaceByQuestionId(attempt.gradedResults, result);
});

attempt.pendingAIAnswers = [];

  const finalResults = sortResultsByQuestionOrder(attempt.gradedResults);
  const summary = createAttemptSummary(finalResults);

  return res.json({
    attemptId,
    results: finalResults,
    summary
  });
});

app.listen(PORT, () => {
  console.log(`MAXI mock backend running at http://localhost:${PORT}`);
});