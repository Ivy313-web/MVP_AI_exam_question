const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env")
});

const Groq = require("groq-sdk");

const {
  validateQuestionStructure,
  removeDuplicateQuestions
} = require("./question-validator");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const CONFIG = {
  subject: "Physics",
  level: "A-level",
  topic: "Forces and Newton's Laws",
  level1: "Forces and Motion",
  numberOfQuestionsWanted: 5,
  maxGenerationAttempts: 2,
  draftScoreThreshold: 6,
  finalScoreThreshold: 8,
  outputFile: path.join(__dirname, "../data/generated-concept-questions.json")
};

function buildConceptGenerationPrompt(numberOfQuestions) {
  return `
You are creating concept-based exam-style short-answer questions for MAXI.

Target:
- Subject: ${CONFIG.subject}
- Level: ${CONFIG.level}
- Topic: ${CONFIG.topic}
- Number of questions: ${numberOfQuestions}

Return only valid JSON. Do not include markdown.
Do not create numerical calculation questions or diagram-based questions.
Do not over-simplify final questions into 1-mark recall questions.
Keep explanation, comparison, and cause-effect questions as 2 marks when they contain two genuinely markable ideas.
Avoid flashcard-style questions that only ask "What type of force..." unless the concept is genuinely being defined.
Prefer exam-style prompts that require applying or distinguishing the concept in a simple situation.

Question rules:
- The prompt must be an exam-style question or task, not the answer itself.
- Do not reveal the answer in the prompt.
- Do not start prompts with "State that", "Explain that", "Describe that", or "Identify that".
- Each question must test one narrow concept.
- Use a mix of definition, explanation, comparison, and cause-effect questions.
- If the answer depends on a condition, include that condition in the prompt.
- Do not make every final question 1 mark. Keep 2-mark questions when the prompt asks for explanation, comparison, or cause-effect reasoning.
- Avoid vague correct answers such as "is linked to". Prefer precise relationships such as "is proportional to", with required conditions.

Question mix requirement:
- In each batch, generate at least:
  - 1 definition or state question
  - 1 explanation question worth 2 marks
  - 1 comparison question worth 2 marks
  - 1 cause-effect question worth 2 marks
- Do not make more than half of the batch simple 1-mark recall questions.
- A question should not be accepted as strong only because it is easy and safe.

Quiz rules:
- Include exactly 4 quizOptions.
- quizCorrectAnswer must appear exactly inside quizOptions.
- There must be exactly one clearly best answer.
- Wrong options must be clearly wrong for this exact prompt.
- All options should answer the same type of question.
- Wrong quiz options must be clearly wrong, not just less complete versions of the correct answer.

Marking rules:
- marks must be 1, 2, or 3.
- Each markScheme point must be worth exactly 1 mark.
- marks must equal the number of markScheme points.
- Multi-mark questions must use shortAcceptedAnswers: [].
- MarkScheme points must be specific and markable.
- Do not use vague points such as "correct explanation" or "shows understanding".
- Do not use circular explanations. For example, do not explain "zero resultant force" by saying "because the net force is zero".
- workedSolution must explain the idea in 1 to 3 clear sentences.

Physics rules:
- Newton's First Law: zero resultant force means rest or constant velocity.
- Newton's Second Law: resultant force is linked to acceleration.
- For acceleration proportional to resultant force, include "when mass is constant".
- Normal contact force acts perpendicular to the surface.
- Friction acts between surfaces in contact; air resistance is drag through air.
- Friction opposes relative motion or the tendency of relative motion between surfaces in contact.
- Do not simply say friction always causes deceleration.

Draft scoring:
- Give each draft a draftQualityScore from 0 to 10.
- 8-10 = strong draft.
- 6-7 = usable but needs improvement.
- Below 6 = serious quality issue.
- Be strict. Do not give 8+ to shallow, circular, ambiguous, or answer-leaking questions.
- Include short draftQualityIssues.

Return this exact JSON structure:
{
  "questions": [
    {
      "id": "draft_concept_q1",
      "topic": {
        "level1": "${CONFIG.level1}",
        "level2": "${CONFIG.subject}",
        "level3": "${CONFIG.topic}"
      },
      "prompt": "Question text",
      "quizOptions": ["Option A", "Option B", "Option C", "Option D"],
      "quizCorrectAnswer": "Correct option",
      "shortAcceptedAnswers": [],
      "markScheme": [
        {
          "point": "Specific mark scheme point",
          "marks": 1
        }
      ],
      "marks": 1,
      "workedSolution": "Brief explanation of the expected answer.",
      "draftQualityScore": 7,
      "draftQualityIssues": ["Brief issue if any"]
    }
  ]
}
`;
}

function buildConceptOptimisationPrompt(questions) {
  return `
You are a strict A-level Physics exam-question optimiser for MAXI.

Improve each draft into a final high-quality exam-style question.
Return only valid JSON. Do not include markdown.
Do not create unrelated new questions.

Optimise each question:
- Fix physics errors and wrong law references.
- Fix answer-leaking prompts.
- Fix circular explanations.
- If an "Explain why" question cannot be meaningfully explained, rewrite it as a "State" or "Define" question.
- For "Explain why" questions, include a real cause-effect link, law, equation, or principle.
- Make quizOptions clear, parallel, and with exactly one best answer.
- Make markScheme points specific, independently markable, and worth 1 mark each.
- You may change marks between 1 and 3.
- Compare questions should usually use separate markScheme points for each side of the comparison.
- Ensure quizCorrectAnswer and markScheme credit the same scientific idea.
- Improve workedSolution so it explains the idea clearly.
- Give finalQualityScore from 0 to 10.
- Only give 8+ if the final question is accurate, clear, non-leaking, exam-style, and suitable for stable AI marking.

Examples of good final questions:

Good 1-mark definition:
Prompt: "What is meant by the resultant force acting on an object?"
Mark scheme:
- "States that the resultant force is the vector sum of all forces acting on the object."

Good 2-mark explanation:
Prompt: "Explain why an object moving at constant velocity has zero resultant force."
Mark scheme:
- "States that constant velocity means zero acceleration."
- "Links zero acceleration to zero resultant force using Newton's First Law or F = ma."

Good 2-mark comparison:
Prompt: "Compare friction and air resistance."
Mark scheme:
- "States that friction acts between surfaces in contact and opposes relative motion."
- "States that air resistance is a drag force that opposes motion through air."

Physics checks:
- Newton's First Law applies to zero resultant force with rest or constant velocity.
- Newton's Second Law links resultant force and acceleration.
- For acceleration proportional to resultant force, include "when mass is constant".
- A non-zero resultant force causes acceleration in the direction of the resultant force.
- Normal contact force acts perpendicular to the surface.
- Do not say normal contact force equals weight unless the prompt states horizontal surface and no vertical acceleration.
- Friction acts between surfaces in contact; air resistance is drag through air.

Return this exact JSON structure:
{
  "optimisedQuestions": [
    {
      "originalId": "draft_concept_q1",
      "finalQualityScore": 9,
      "changesMade": ["Improved mark scheme", "Fixed worked solution"],
      "question": {
        "id": "draft_concept_q1",
        "topic": {
          "level1": "${CONFIG.level1}",
          "level2": "${CONFIG.subject}",
          "level3": "${CONFIG.topic}"
        },
        "prompt": "Question text",
        "quizOptions": ["Option A", "Option B", "Option C", "Option D"],
        "quizCorrectAnswer": "Correct option",
        "shortAcceptedAnswers": [],
        "markScheme": [
          {
            "point": "Specific mark scheme point",
            "marks": 1
          }
        ],
        "marks": 1,
        "workedSolution": "Brief explanation of the expected answer."
      }
    }
  ]
}

Questions to optimise:
${JSON.stringify(questions, null, 2)}
`;
}

function normaliseText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function scoreQuestionQuality(question) {
  let score = 10;
  const reasons = [];

  const prompt = normaliseText(question?.prompt);
  const answer = normaliseText(question?.quizCorrectAnswer);
  const solution = normaliseText(question?.workedSolution);

  const markSchemeText = Array.isArray(question?.markScheme)
    ? question.markScheme.map((point) => normaliseText(point?.point)).join(" ")
    : "";

  if (answer.includes("linked to") || markSchemeText.includes("linked to")) {
    score -= 2;
    reasons.push("Uses vague phrase 'linked to' instead of a precise relationship.");
  }

  if (
    markSchemeText.includes("correct condition") ||
    markSchemeText.includes("correctly referenced") ||
    markSchemeText.includes("is specified") ||
    markSchemeText.includes("correct explanation") ||
    markSchemeText.includes("shows understanding")
  ) {
    score -= 3;
    reasons.push("Mark scheme contains vague or non-markable wording.");
  }

  if (prompt.includes("explain why") && question.marks < 2) {
    score -= 2;
    reasons.push("Explain-why question is probably too shallow for 1 mark.");
  }

  const circularPatterns = [
    "because the net force is zero",
    "because the net force acting on it is zero",
    "because the resultant force is zero",
    "because the resultant force is non-zero",
    "because the force is non-zero",
    "because it is exerted perpendicular",
    "because it is exerted by the surface",
    "because it acts in the direction of the acceleration"
  ];

  if (
    prompt.includes("explain") &&
    circularPatterns.some((pattern) => {
      return solution.includes(pattern) || markSchemeText.includes(pattern);
    })
  ) {
    score -= 3;
    reasons.push("Explanation appears circular or shallow.");
  }

  if (
    prompt.startsWith("state") &&
    question.marks > 1 &&
    markSchemeText.includes("law")
  ) {
    score -= 2;
    reasons.push("Simple state question may be inflated into too many marks.");
  }

  return {
    score: Math.max(0, score),
    reasons
  };
}

async function callGroq(prompt) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.1,
    response_format: {
      type: "json_object"
    }
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function generateConceptQuestions(numberOfQuestions) {
  const parsed = await callGroq(buildConceptGenerationPrompt(numberOfQuestions));

  if (!Array.isArray(parsed.questions)) {
    throw new Error("Groq returned JSON, but questions is not an array.");
  }

  return parsed.questions;
}

async function optimiseConceptQuestions(questions) {
  const parsed = await callGroq(buildConceptOptimisationPrompt(questions));

  if (!Array.isArray(parsed.optimisedQuestions)) {
    throw new Error("Groq returned JSON, but optimisedQuestions is not an array.");
  }

  return parsed.optimisedQuestions;
}

function loadExistingAcceptedQuestions() {
  if (!fs.existsSync(CONFIG.outputFile)) {
    return [];
  }

  const rawText = fs.readFileSync(CONFIG.outputFile, "utf8");

  if (!rawText.trim()) {
    return [];
  }

  const parsed = JSON.parse(rawText);
  return Array.isArray(parsed) ? parsed : [];
}

function saveAcceptedQuestions(questions) {
  fs.mkdirSync(path.dirname(CONFIG.outputFile), {
    recursive: true
  });

  fs.writeFileSync(
    CONFIG.outputFile,
    JSON.stringify(questions, null, 2),
    "utf8"
  );
}

function getScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(10, score));
}

function cleanQuestionForSaving(question, id) {
  const {
    draftQualityScore,
    draftQualityIssues,
    finalQualityScore,
    changesMade,
    ...cleanQuestion
  } = question;

  return {
    ...cleanQuestion,
    id
  };
}

function giveFinalIds(questions, existingQuestions) {
  const existingCount = existingQuestions.length;

  return questions.map((question, index) => {
    return cleanQuestionForSaving(
      question,
      `gen_concept_q${existingCount + index + 1}`
    );
  });
}

function rejectItem(list, item) {
  list.push(item);
}

async function collectDraftQuestions() {
  let draftQuestions = [];
  const rejectedBeforeOptimisation = [];

  for (let attempt = 1; attempt <= CONFIG.maxGenerationAttempts; attempt += 1) {
    const remainingNeeded = CONFIG.numberOfQuestionsWanted - draftQuestions.length;

    if (remainingNeeded <= 0) {
      break;
    }

    console.log(`\nGeneration attempt ${attempt}/${CONFIG.maxGenerationAttempts}`);
    console.log(`Need ${remainingNeeded} more draft question(s).`);

    const generatedQuestions = await generateConceptQuestions(remainingNeeded + 1);

    generatedQuestions.forEach((question) => {
      const validation = validateQuestionStructure(question);
      const draftQualityScore = getScore(question?.draftQualityScore);

      if (!validation.isValid) {
        rejectItem(rejectedBeforeOptimisation, {
          id: question?.id || "unknown",
          prompt: question?.prompt || "",
          draftQualityScore,
          errors: validation.errors
        });
        return;
      }

      if (draftQualityScore < CONFIG.draftScoreThreshold) {
        rejectItem(rejectedBeforeOptimisation, {
          id: question?.id || "unknown",
          prompt: question?.prompt || "",
          draftQualityScore,
          errors: question?.draftQualityIssues || [
            `Draft quality score was below ${CONFIG.draftScoreThreshold}.`
          ]
        });
        return;
      }

      draftQuestions.push(question);
    });

    draftQuestions = removeDuplicateQuestions(draftQuestions);
    draftQuestions = draftQuestions.slice(0, CONFIG.numberOfQuestionsWanted);
  }

  return {
    draftQuestions,
    rejectedBeforeOptimisation
  };
}

function selectFinalQuestions(optimisedResults) {
  const acceptedQuestions = [];
  const rejectedAfterOptimisation = [];

  optimisedResults.forEach((result) => {
    const finalQualityScore = getScore(result?.finalQualityScore);
    const finalQuestion = result?.question;

    if (!finalQuestion || finalQualityScore < CONFIG.finalScoreThreshold) {
      rejectItem(rejectedAfterOptimisation, {
        originalId: result?.originalId || "unknown",
        finalQualityScore,
        issues: result?.changesMade || [
          `Final quality score was below ${CONFIG.finalScoreThreshold}.`
        ]
      });
      return;
    }

    const validation = validateQuestionStructure(finalQuestion);

    if (!validation.isValid) {
      rejectItem(rejectedAfterOptimisation, {
        originalId: result?.originalId || "unknown",
        finalQualityScore,
        issues: validation.errors
      });
      return;
    }
    const localQuality = scoreQuestionQuality(finalQuestion);

    if (localQuality.score < CONFIG.finalScoreThreshold) {
      rejectItem(rejectedAfterOptimisation, {
        originalId: result?.originalId || "unknown",
        finalQualityScore,
        localQualityScore: localQuality.score,
        issues: localQuality.reasons
      });
      return;
    }

    acceptedQuestions.push(finalQuestion);
  });

  return {
    acceptedQuestions,
    rejectedAfterOptimisation
  };
}

async function runPipeline() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in .env");
  }

  const {
    draftQuestions,
    rejectedBeforeOptimisation
  } = await collectDraftQuestions();

  console.log(`\nDraft questions passing local gate: ${draftQuestions.length}`);

  const optimisedResults = draftQuestions.length > 0
    ? await optimiseConceptQuestions(draftQuestions)
    : [];

  const {
    acceptedQuestions,
    rejectedAfterOptimisation
  } = selectFinalQuestions(optimisedResults);

  const existingAcceptedQuestions = loadExistingAcceptedQuestions();

  const finalNewQuestions = giveFinalIds(
    removeDuplicateQuestions(acceptedQuestions),
    existingAcceptedQuestions
  );

  const allAcceptedQuestions = removeDuplicateQuestions([
    ...existingAcceptedQuestions,
    ...finalNewQuestions
  ]);

  saveAcceptedQuestions(allAcceptedQuestions);

  const summary = {
    requested: CONFIG.numberOfQuestionsWanted,
    draftsPassingLocalGate: draftQuestions.length,
    acceptedAfterOptimisation: finalNewQuestions.length,
    totalSavedQuestions: allAcceptedQuestions.length,
    rejectedBeforeOptimisation,
    rejectedAfterOptimisation,
    savedTo: CONFIG.outputFile
  };

  console.log("\nFINAL SUMMARY:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nNEW ACCEPTED QUESTIONS:");
  console.log(JSON.stringify(finalNewQuestions, null, 2));
}

runPipeline().catch((error) => {
  console.error("Concept question pipeline failed:", error);
});