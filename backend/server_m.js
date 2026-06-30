// API
require("dotenv").config();

const Groq = require("groq-sdk");

//connect to ai question prompt
const fs = require("fs");
const path = require("path");
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

function loadQuestionsFromJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const rawText = fs.readFileSync(filePath, "utf8");

    if (!rawText.trim()) {
      return [];
    }

    const parsed = JSON.parse(rawText);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to load questions from ${filePath}:`, error.message);
    return [];
  }
}

const generatedConceptQuestions = loadQuestionsFromJsonFile(
  path.join(__dirname, "data", "generated-concept-questions.json")
);

const generatedCalculationQuestions = loadQuestionsFromJsonFile(
  path.join(__dirname, "data", "generated-calculation-questions.json")
);

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
  shortAcceptedAnswers: [
    "horizontal velocity",
    "horizontal component of velocity",
    "x velocity"
  ],
  markScheme: [
    {
      point: "Identifies the horizontal component of velocity as the component that remains constant.",
      marks: 1
    }
  ],
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
  shortAcceptedAnswers: [
    "constant 9.8 m/s^2 downward",
    "constant 9.8 metres per second squared downward",
    "constant g downward",
    "constant gravity downward"
  ],
  markScheme: [
  {
    point: "States the acceleration magnitude as 9.8 m/s^2 or g, including a valid acceleration unit or the symbol g.",
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
  shortAcceptedAnswers: [
    "zero",
    "0",
    "0 m/s"
  ],
  markScheme: [
    {
      point: "States that the vertical velocity is zero at the highest point.",
      marks: 1
    }
  ],
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
  shortAcceptedAnswers: [
    "weight",
    "gravity",
    "gravitational force"
  ],
  markScheme: [
    {
      point: "States that weight, gravity, or the gravitational force acts on the projectile after launch.",
      marks: 1
    }
  ],
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
  shortAcceptedAnswers: [
    "no air resistance",
    "air resistance ignored",
    "ignore air resistance",
    "no drag"
  ],
  markScheme: [
    {
      point: "States that air resistance is ignored or that there is no drag.",
      marks: 1
    }
  ],
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
  },
  {
  id: "q11",
  topic: {
    level1: "Topic",
    level2: "Physics",
    level3: "Projectile Motion"
  },
  prompt: "Explain why the horizontal velocity of a projectile remains constant when air resistance is ignored.",
  quizOptions: [
    "There is no horizontal resultant force",
    "Gravity acts horizontally",
    "The vertical velocity is zero",
    "The projectile has no weight"
  ],
  quizCorrectAnswer: "There is no horizontal resultant force",
  shortAcceptedAnswers: [],
  markScheme: [
    {
      point: "States that there is no horizontal resultant force acting on the projectile.",
      marks: 1
    },
    {
      point: "Explicitly links the lack of horizontal resultant force to zero horizontal acceleration or to the horizontal velocity remaining constant.",
      marks: 1
    }
  ],
  marks: 2
  }
];

//return to main
function getPublicQuestion(question) {
  const publicQuestion = {
    id: question.id,
    questionType: question.questionType || "concept",
    formulaType: question.formulaType || null,
    topic: question.topic || null,
    prompt: question.prompt,
    quizOptions: question.quizOptions,
    marks: question.marks
  };

  if (question.questionType === "calculation") {
    publicQuestion.givenValues = question.givenValues || null;
    publicQuestion.unknown = question.unknown || null;
  }

  return publicQuestion;
}

// get question method
app.get("/api/questions", (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? requestedLimit
    : 10;

  const mix = req.query.mix || "random";
  const mode = req.query.mode || "short";

  const allQuestions = getAllQuestions();
  const modeFilteredQuestions = filterQuestionsForMode(allQuestions, mode);

  let selectedQuestions;

  if (mix === "half") {
    selectedQuestions = selectHalfConceptHalfCalculationQuestions(modeFilteredQuestions, {
      limit
    });
  } else {
    selectedQuestions = selectPracticeQuestions(modeFilteredQuestions, {
      limit
    });
  }

  const publicQuestions = selectedQuestions.map(getPublicQuestion);

  res.json({
    questions: publicQuestions,
    totalAvailable: allQuestions.length,
    filteredAvailable: modeFilteredQuestions.length,
    selectedCount: publicQuestions.length,
    selection: {
      strategy: mix === "half" ? "half_concept_half_calculation" : "random",
      mode,
      limit
    }
  });
});

// ---------------------------------------------------------------------------------------

function isValidRuntimeGeneratedQuestion(question) {
  if (!question || typeof question !== "object") {
    return false;
  }

  if (typeof question.id !== "string" || !question.id.trim()) {
    return false;
  }

  if (typeof question.prompt !== "string" || !question.prompt.trim()) {
    return false;
  }

  if (!Array.isArray(question.quizOptions) || question.quizOptions.length !== 4) {
    return false;
  }

  if (
    typeof question.quizCorrectAnswer !== "string" ||
    !question.quizOptions.includes(question.quizCorrectAnswer)
  ) {
    return false;
  }

  if (!Array.isArray(question.shortAcceptedAnswers)) {
    return false;
  }

  if (!Array.isArray(question.markScheme) || question.markScheme.length === 0) {
    return false;
  }

  if (!Number.isInteger(question.marks) || question.marks < 1 || question.marks > 4) {
    return false;
  }

  const markSchemeTotal = question.markScheme.reduce((total, point) => {
    return total + Number(point?.marks || 0);
  }, 0);

  if (markSchemeTotal !== question.marks) {
    return false;
  }

  if (question.questionType === "calculation") {
    if (question.formulaType !== "F_MA") {
      return false;
    }

    if (!question.givenValues || typeof question.givenValues !== "object") {
      return false;
    }

    if (!["forceN", "accelerationMs2", "massKg"].includes(question.unknown)) {
      return false;
    }

    if (!question.answer || typeof question.answer !== "object") {
      return false;
    }

    if (!Number.isFinite(Number(question.answer.value))) {
      return false;
    }

    if (typeof question.answer.unit !== "string" || !question.answer.unit.trim()) {
      return false;
    }
  }

  return true;
}


function filterRuntimeGeneratedQuestions(questions, label) {
  const validQuestions = questions.filter(isValidRuntimeGeneratedQuestion);
  const rejectedCount = questions.length - validQuestions.length;

  if (rejectedCount > 0) {
    console.warn(`Rejected ${rejectedCount} generated ${label} question(s) while loading.`);
  }

  return validQuestions;
}

function getAllQuestions() {
  return [
    ...questionBank,
    ...filterRuntimeGeneratedQuestions(generatedConceptQuestions, "concept"),
    ...filterRuntimeGeneratedQuestions(generatedCalculationQuestions, "calculation")
  ];
}

function shuffleQuestions(questions) {
  const copiedQuestions = [...questions];

  for (let index = copiedQuestions.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const temporaryQuestion = copiedQuestions[index];

    copiedQuestions[index] = copiedQuestions[randomIndex];
    copiedQuestions[randomIndex] = temporaryQuestion;
  }

  return copiedQuestions;
}

function getQuestionsByType(questions, questionType) {
  return questions.filter((question) => {
    const resolvedType = question.questionType || "concept";
    return resolvedType === questionType;
  });
}

function selectPracticeQuestions(questions, options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : 10;

  return shuffleQuestions(questions).slice(0, limit);
}

function filterQuestionsForMode(questions, mode) {
  if (mode === "quiz") {
    return questions.filter((question) => {
      return (question.marks || 1) === 1;
    });
  }

  return questions;
}

// ---------------------------------------------------------------------------------------
// standardize the question
function normaliseAnswer(answer) {
  return String(answer || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findQuestionById(questionId) {
  return getAllQuestions().find((question) => question.id === questionId);
}

function getFinalStatus(isSkipped, marksAwarded, marksAvailable) {
  if (isSkipped) {
    return "skipped";
  }

  if (marksAwarded >= marksAvailable) {
    return "correct";
  }

  if (marksAwarded > 0) {
    return "partial";
  }

  return "incorrect";
}

const aiGradingSchema = {
  type: "object",
  properties: {
    results: {
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
          },
          markBreakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                point: {
                  type: "string"
                },
                awarded: {
                  type: "boolean"
                },
                reason: {
                  type: "string"
                }
              },
              required: ["point", "awarded", "reason"]
            }
          }
        },
        required: ["questionId", "marksAwarded", "feedback", "markBreakdown"]
      }
    }
  },
  required: ["results"]
};
async function gradePendingAnswersWithMockAI(pendingAIAnswers) {
  return pendingAIAnswers.map((pendingAnswer) => {
    const question = findQuestionById(pendingAnswer.questionId);
    const marksAvailable = pendingAnswer.marksAvailable || question?.marks || 1;
    const marksAwarded = 0;
    const status = getFinalStatus(false, marksAwarded, marksAvailable);

    return {
      questionId: pendingAnswer.questionId,
      questionType: pendingAnswer.questionType || "short",
      userAnswer: pendingAnswer.userAnswer || "",
      isSkipped: false,
      prompt: pendingAnswer.prompt || question?.prompt || "",
      correctAnswer: pendingAnswer.correctAnswer || question?.quizCorrectAnswer || "",
      status,
      isCorrect: false,
      marksAwarded,
      marksAvailable,
      percentage: 0,
      feedback: "AI marking was unavailable, so this answer was safely marked as 0 for now.",
      markBreakdown: []
    };
  });
}

function selectHalfConceptHalfCalculationQuestions(questions, options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0
    ? options.limit
    : 10;

  const conceptTargetCount = Math.ceil(limit / 2);
  const calculationTargetCount = Math.floor(limit / 2);

  const conceptQuestions = shuffleQuestions(getQuestionsByType(questions, "concept"));
  const calculationQuestions = shuffleQuestions(getQuestionsByType(questions, "calculation"));

  const selectedConceptQuestions = conceptQuestions.slice(0, conceptTargetCount);
  const selectedCalculationQuestions = calculationQuestions.slice(0, calculationTargetCount);

  let selectedQuestions = [
    ...selectedConceptQuestions,
    ...selectedCalculationQuestions
  ];

  if (selectedQuestions.length < limit) {
    const selectedIds = new Set(selectedQuestions.map((question) => question.id));

    const remainingQuestions = shuffleQuestions(questions).filter((question) => {
      return !selectedIds.has(question.id);
    });

    selectedQuestions = [
      ...selectedQuestions,
      ...remainingQuestions.slice(0, limit - selectedQuestions.length)
    ];
  }

  return shuffleQuestions(selectedQuestions).slice(0, limit);
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
Do not award information ONLY present in the question prompt.

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
      "feedback": "Brief feedback.",
      "markBreakdown": [
        {
          "point": "The mark scheme point being judged.",
          "awarded": true,
          "reason": "Brief reason why this point was or was not awarded."
        }
      ]
    }
  ]
}

Do not output any additional keys.
Each result must include questionId, marksAwarded, feedback, and markBreakdown.
markBreakdown must be an array.
Each markBreakdown item must include point, awarded, and reason.
The number of markBreakdown items should match the markScheme points when markScheme is provided.

MARKING RULES:
- Always return one result for every question given.
- Never skip a question.
- Never invent or change questionIds.
- Award marks only for ideas that are clearly present in the student's answer.
- Do not award marks for information that appears only in the question prompt, correct answer, acceptedAnswers, or markScheme.
- If the question prompt already gives a condition, do not treat that condition as part of the student's answer unless the student also states it.
- Do not infer that the student mentioned an idea just because it appears in the question.
- Do not complete missing reasoning steps for the student.
- If a markScheme point requires a link or explanation, only award it when the student explicitly states that link or explanation.
- Do not award a reasoning mark just because the reasoning can be inferred from a correct statement.
- For example, if the student only states "there is no horizontal resultant force", do not automatically award a separate mark for "zero horizontal acceleration" unless the student also states zero acceleration or explains that the horizontal velocity remains constant.
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
- For each markScheme point, create one markBreakdown item.
- Use the exact or very close wording of the markScheme point in markBreakdown.point.
- markBreakdown.awarded must be true only if that specific point earns marks.
- markBreakdown.reason must briefly explain why the point was awarded or not awarded.
- The sum of awarded markScheme point marks should match marksAwarded.
- If there is no markScheme, return an empty markBreakdown array.

CALCULATION QUESTION MARKING RULES:
- For calculation questions, mark by numerical value, unit meaning, and working shown.
- Do not use exact string matching for units, but do not guess unclear units.
- Accept only clearly recognisable equivalent units.

Unit and magnitude equivalence:
- Force: accept "N", "n", "newton", "newtons".
- Mass: accept "kg", "kilogram", "kilograms".
- Acceleration: accept "m/s²", "m/s^2", "m s-2", "m s^-2", "metres per second squared", "meters per second squared".
- Minor capitalization and spacing differences are acceptable.
- Random, unclear, or heavily misspelled unit-like words are not acceptable.
- Example: "20 newton" is equivalent to "20 N", but "20 nastwn" is not.
- If a markScheme point requires a physical magnitude with a unit, the student must include a correct unit or a recognised symbol such as g.
- Do not award a magnitude mark for a bare number unless the markScheme explicitly allows a bare number.
- For acceleration near Earth's surface, "9.8 m/s^2", "9.8 m/s²", "9.8 metres per second squared", or "g" may earn the magnitude mark.
- The answer "9.8 downward" gives the direction idea but does not give a valid acceleration unit, so it should not earn the magnitude mark.
- If the student gives the number 9.8 but omits the unit or g, the feedback/reason must say that the unit or g is missing, not that the magnitude is missing.
- Distinguish between a missing numerical value and a missing unit.
- If the student writes "9.8" without a unit or g, do not award the acceleration magnitude mark.

For 2-mark calculation questions:
- Award the working mark if the student shows a valid formula, rearrangement, substitution, or calculation method.
- Do not award the working mark just because the student gives a final answer.
- Do not infer that the student used the correct formula unless the formula, substitution, rearrangement, or calculation method is clearly shown in the student's answer.
- If the student only gives an incorrect final answer, award 0 marks.
- If the student only gives a final answer that has the correct unit but the numerical value is wrong, award 0 marks unless valid working is clearly shown.
- For example, if the expected answer is "20 N" and the student only writes "10 N", award 0 marks. Do not say they used F = ma.
- Award the final-answer mark only if the numerical value is correct and the unit is clearly equivalent to the expected unit.
- If the final value and unit are correct but no working is shown, award only the final-answer mark.
- If working is correct but the final value or unit is wrong, award only the working mark.
- If the value is correct but the unit is missing, wrong, or unclear, do not award the final-answer mark.
- Do not give full marks for a final answer only when the mark scheme separately requires working.
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

function normalizeMarkBreakdown(markBreakdown, question) {
  if (!Array.isArray(markBreakdown)) {
    return [];
  }

  return markBreakdown.map((item) => {
    return {
      point:
        typeof item?.point === "string" && item.point.trim()
          ? item.point.trim()
          : "Mark scheme point",
      awarded: item?.awarded === true,
      reason:
        typeof item?.reason === "string" && item.reason.trim()
          ? item.reason.trim()
          : ""
    };
  });
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
    markBreakdown: normalizeMarkBreakdown(aiResult?.markBreakdown, question)
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
  return getAllQuestions()
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