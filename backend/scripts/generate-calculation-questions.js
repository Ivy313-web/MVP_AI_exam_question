const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "../.env")
});

const Groq = require("groq-sdk");

const {
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
  formulaType: "F_MA",
  numberOfQuestionsWanted: 5,
  maxGenerationAttempts: 3,
  draftScoreThreshold: 6,
  finalScoreThreshold: 8,
  outputFile: path.join(__dirname, "../data/generated-calculation-questions.json")
};

function buildCalculationGenerationPrompt(numberOfQuestions) {
  return `
Create ${numberOfQuestions} A-level Physics calculation questions for MAXI.

Topic:
- ${CONFIG.topic}
- Use only F = ma
- Return only valid JSON. No markdown.

Allowed unknowns:
- forceN: given massKg and accelerationMs2
- accelerationMs2: given forceN and massKg
- massKg: given forceN and accelerationMs2

Rules:
- Use realistic positive values.
- Use simple varied contexts: box, trolley, crate, model car, cyclist.
- Include a mix of unknowns where possible.
- Do not use the same unknown type more than twice in one batch.
- Avoid repeated final answers.
- Prompt must include values and units clearly.
- quizOptions must contain exactly 4 answers with units.
- quizCorrectAnswer must exactly match the correct quiz option.
- Only one quiz option may be numerically correct.
- workedSolution must show formula, substitution, and final answer.
- marks should be 2.
- markScheme must have two 1-mark points:
  1. Uses F = ma.
  2. Substitutes correctly and gives the correct answer with unit.

Draft scoring:
- Give draftQualityScore from 0 to 10.
- Give 8+ only if the scenario is clear, values are realistic, answer is correct, and quiz options are good.
- Include draftQualityIssues.

Return this exact JSON:
{
  "questions": [
    {
      "id": "draft_calc_q1",
      "questionType": "calculation",
      "formulaType": "F_MA",
      "topic": {
        "level1": "${CONFIG.level1}",
        "level2": "${CONFIG.subject}",
        "level3": "${CONFIG.topic}"
      },
      "prompt": "A 2 kg object accelerates at 3 m/s². Calculate the resultant force acting on the object.",
      "givenValues": {
        "massKg": 2,
        "accelerationMs2": 3,
        "forceN": null
      },
      "unknown": "forceN",
      "quizOptions": ["6 N", "1.5 N", "5 N", "9 N"],
      "quizCorrectAnswer": "6 N",
      "answer": {
        "value": 6,
        "unit": "N"
      },
      "shortAcceptedAnswers": [],
      "markScheme": [
        {
          "point": "Uses F = ma.",
          "marks": 1
        },
        {
          "point": "Substitutes the values correctly and gives the correct answer with unit.",
          "marks": 1
        }
      ],
      "marks": 2,
      "workedSolution": "Use F = ma. F = 2 × 3 = 6 N.",
      "draftQualityScore": 8,
      "draftQualityIssues": []
    }
  ]
}
`;
}

function buildCalculationOptimisationPrompt(questions) {
  return `
Optimise these A-level Physics calculation questions for MAXI.

Return only valid JSON. No markdown.
Keep every question as formulaType "F_MA" using only F = ma.

Optimisation rules:
- Fix unclear wording, unrealistic values, wrong answers, wrong units, and weak quiz options.
- Keep prompt, givenValues, unknown, answer, quizCorrectAnswer, workedSolution, and markScheme fully consistent.
- Preserve a mix of unknowns where possible: forceN, accelerationMs2, massKg.
- Do not turn every question into forceN or accelerationMs2.
- Use exactly 4 quizOptions with units.
- quizCorrectAnswer must exactly match the correct option.
- Only one quiz option may be numerically correct.
- Wrong options should be plausible but clearly wrong.
- workedSolution must show formula, substitution, and final answer.
- marks should be 2 with two 1-mark markScheme points.
- Give finalQualityScore from 0 to 10.
- Give 8+ only if the question is clear, physically reasonable, numerically correct, and stable for marking.

Return this exact JSON:
{
  "optimisedQuestions": [
    {
      "originalId": "draft_calc_q1",
      "finalQualityScore": 9,
      "changesMade": ["Improved wording", "Fixed quiz options"],
      "question": {
        "id": "draft_calc_q1",
        "questionType": "calculation",
        "formulaType": "F_MA",
        "topic": {
          "level1": "${CONFIG.level1}",
          "level2": "${CONFIG.subject}",
          "level3": "${CONFIG.topic}"
        },
        "prompt": "A 2 kg object accelerates at 3 m/s². Calculate the resultant force acting on the object.",
        "givenValues": {
          "massKg": 2,
          "accelerationMs2": 3,
          "forceN": null
        },
        "unknown": "forceN",
        "quizOptions": ["6 N", "1.5 N", "5 N", "9 N"],
        "quizCorrectAnswer": "6 N",
        "answer": {
          "value": 6,
          "unit": "N"
        },
        "shortAcceptedAnswers": [],
        "markScheme": [
          {
            "point": "Uses F = ma.",
            "marks": 1
          },
          {
            "point": "Substitutes the values correctly and gives the correct answer with unit.",
            "marks": 1
          }
        ],
        "marks": 2,
        "workedSolution": "Use F = ma. F = 2 × 3 = 6 N."
      }
    }
  ]
}

Questions:
${JSON.stringify(questions, null, 2)}
`;
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

async function generateCalculationQuestions(numberOfQuestions) {
  const parsed = await callGroq(buildCalculationGenerationPrompt(numberOfQuestions));

  if (!Array.isArray(parsed.questions)) {
    throw new Error("Groq returned JSON, but questions is not an array.");
  }

  return parsed.questions;
}

async function optimiseCalculationQuestions(questions) {
  const parsed = await callGroq(buildCalculationOptimisationPrompt(questions));

  if (!Array.isArray(parsed.optimisedQuestions)) {
    throw new Error("Groq returned JSON, but optimisedQuestions is not an array.");
  }

  return parsed.optimisedQuestions;
}

function getScore(value) {
  const score = Number(value);

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(10, score));
}

function roundToTwoDp(value) {
  return Math.round(value * 100) / 100;
}

function normaliseAnswerText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatExpectedAnswer(value, unit) {
  return `${roundToTwoDp(value)} ${unit}`;
}

function nearlyEqual(a, b, tolerance = 0.01) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

function getExpectedCalculation(question) {
  const mass = Number(question?.givenValues?.massKg);
  const acceleration = Number(question?.givenValues?.accelerationMs2);
  const force = Number(question?.givenValues?.forceN);

  if (question?.unknown === "forceN") {
    if (!Number.isFinite(mass) || !Number.isFinite(acceleration)) {
      return null;
    }

    return {
      value: mass * acceleration,
      unit: "N"
    };
  }

  if (question?.unknown === "accelerationMs2") {
    if (!Number.isFinite(force) || !Number.isFinite(mass) || mass === 0) {
      return null;
    }

    return {
      value: force / mass,
      unit: "m/s²"
    };
  }

  if (question?.unknown === "massKg") {
    if (!Number.isFinite(force) || !Number.isFinite(acceleration) || acceleration === 0) {
      return null;
    }

    return {
      value: force / acceleration,
      unit: "kg"
    };
  }

  return null;
}

function validateCalculationDraft(question) {
  const errors = [];

  if (!question || typeof question !== "object") {
    return {
      isValid: false,
      errors: ["Question is missing or not an object."]
    };
  }

  if (!question.id) errors.push("Missing id.");
  if (question.questionType !== "calculation") errors.push("questionType must be calculation.");
  if (question.formulaType !== "F_MA") errors.push("formulaType must be F_MA.");

  if (!question.prompt || typeof question.prompt !== "string") {
    errors.push("Missing prompt.");
  }

  if (!question.givenValues || typeof question.givenValues !== "object") {
    errors.push("Missing givenValues.");
  }

  if (!["forceN", "accelerationMs2", "massKg"].includes(question.unknown)) {
    errors.push("unknown must be forceN, accelerationMs2, or massKg.");
  }

  if (!Array.isArray(question.quizOptions) || question.quizOptions.length !== 4) {
    errors.push("quizOptions must contain exactly 4 options.");
  }

  if (!question.quizCorrectAnswer || typeof question.quizCorrectAnswer !== "string") {
    errors.push("Missing quizCorrectAnswer.");
  }

  if (
    Array.isArray(question.quizOptions) &&
    question.quizCorrectAnswer &&
    !question.quizOptions.includes(question.quizCorrectAnswer)
  ) {
    errors.push("quizCorrectAnswer must exactly match one quiz option.");
  }

  if (!question.answer || typeof question.answer !== "object") {
    errors.push("Missing answer.");
  }

  if (!Array.isArray(question.markScheme) || question.markScheme.length === 0) {
    errors.push("Missing markScheme.");
  }

  if (!Number.isInteger(question.marks) || question.marks < 1 || question.marks > 4) {
    errors.push("marks must be an integer from 1 to 4.");
  }

  if (!question.workedSolution || typeof question.workedSolution !== "string") {
    errors.push("Missing workedSolution.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function validateCalculationAnswer(question) {
  const errors = [];

  const draftValidation = validateCalculationDraft(question);

  if (!draftValidation.isValid) {
    return draftValidation;
  }

  const expected = getExpectedCalculation(question);

  if (!expected) {
    errors.push("Could not calculate expected answer from givenValues.");
    return {
      isValid: false,
      errors
    };
  }

  const answerValue = Number(question?.answer?.value);
  const answerUnit = question?.answer?.unit;

  if (!Number.isFinite(answerValue)) {
    errors.push("answer.value must be a valid number.");
  }

  if (answerUnit !== expected.unit) {
    errors.push(`Incorrect unit: expected ${expected.unit}, got ${answerUnit}.`);
  }

  if (Number.isFinite(answerValue) && !nearlyEqual(answerValue, expected.value)) {
    errors.push(`Incorrect answer value: expected ${expected.value}, got ${answerValue}.`);
  }

  const expectedAnswerText = normaliseAnswerText(
    formatExpectedAnswer(expected.value, expected.unit)
  );

  const quizCorrectText = normaliseAnswerText(question.quizCorrectAnswer);

  if (quizCorrectText !== expectedAnswerText) {
    errors.push(
      `quizCorrectAnswer should be "${formatExpectedAnswer(expected.value, expected.unit)}".`
    );
  }

  const matchingCorrectOptions = question.quizOptions.filter((option) => {
    return normaliseAnswerText(option) === expectedAnswerText;
  });

  if (matchingCorrectOptions.length !== 1) {
    errors.push("quizOptions must contain exactly one option matching the correct answer.");
  }

  if (question.marks !== question.markScheme.length) {
    errors.push("marks must equal the number of markScheme points.");
  }

  const allMarkPointsOneMark = question.markScheme.every((point) => {
    return point && point.marks === 1;
  });

  if (!allMarkPointsOneMark) {
    errors.push("Each markScheme point must be worth exactly 1 mark.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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

function removeDuplicateCalculationQuestions(questions) {
  const seen = new Set();

  return questions.filter((question) => {
    const key = [
      question.unknown,
      question.answer?.value,
      question.answer?.unit
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function giveFinalIds(questions, existingQuestions) {
  const existingCount = existingQuestions.length;

  return questions.map((question, index) => {
    return cleanQuestionForSaving(
      question,
      `gen_calc_q${existingCount + index + 1}`
    );
  });
}

function rejectItem(list, item) {
  list.push(item);
}

async function collectDraftQuestions() {
  let draftQuestions = [];
  const rejectedBeforeAnswerCheck = [];

  for (let attempt = 1; attempt <= CONFIG.maxGenerationAttempts; attempt += 1) {
    const remainingNeeded = CONFIG.numberOfQuestionsWanted - draftQuestions.length;

    if (remainingNeeded <= 0) {
      break;
    }

    console.log(`\nGeneration attempt ${attempt}/${CONFIG.maxGenerationAttempts}`);
    console.log(`Need ${remainingNeeded} more draft calculation question(s).`);

    const generatedQuestions = await generateCalculationQuestions(remainingNeeded + 2);

    generatedQuestions.forEach((question) => {
      const draftValidation = validateCalculationDraft(question);
      const draftQualityScore = getScore(question?.draftQualityScore);

      if (!draftValidation.isValid) {
        rejectItem(rejectedBeforeAnswerCheck, {
          id: question?.id || "unknown",
          prompt: question?.prompt || "",
          draftQualityScore,
          errors: draftValidation.errors
        });
        return;
      }

      if (draftQualityScore < CONFIG.draftScoreThreshold) {
        rejectItem(rejectedBeforeAnswerCheck, {
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
    rejectedBeforeAnswerCheck
  };
}

function checkDraftAnswers(draftQuestions) {
  const answerCheckedQuestions = [];
  const rejectedByAnswerCheck = [];

  draftQuestions.forEach((question) => {
    const answerValidation = validateCalculationAnswer(question);

    if (!answerValidation.isValid) {
      rejectItem(rejectedByAnswerCheck, {
        id: question?.id || "unknown",
        prompt: question?.prompt || "",
        errors: answerValidation.errors
      });
      return;
    }

    answerCheckedQuestions.push(question);
  });

  return {
    answerCheckedQuestions,
    rejectedByAnswerCheck
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

    const answerValidation = validateCalculationAnswer(finalQuestion);

    if (!answerValidation.isValid) {
      rejectItem(rejectedAfterOptimisation, {
        originalId: result?.originalId || "unknown",
        finalQualityScore,
        issues: answerValidation.errors
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
    rejectedBeforeAnswerCheck
  } = await collectDraftQuestions();

  console.log(`\nDraft questions passing local quality gate: ${draftQuestions.length}`);

  const {
    answerCheckedQuestions,
    rejectedByAnswerCheck
  } = checkDraftAnswers(draftQuestions);

  console.log(`Answer-checked draft questions: ${answerCheckedQuestions.length}`);

  const optimisedResults = answerCheckedQuestions.length > 0
    ? await optimiseCalculationQuestions(answerCheckedQuestions)
    : [];

  const {
    acceptedQuestions,
    rejectedAfterOptimisation
  } = selectFinalQuestions(optimisedResults);

  const existingAcceptedQuestions = loadExistingAcceptedQuestions();

  const finalNewQuestions = giveFinalIds(
    removeDuplicateCalculationQuestions(removeDuplicateQuestions(acceptedQuestions)),
    existingAcceptedQuestions
  );
  const allAcceptedQuestions = removeDuplicateQuestions([
    ...existingAcceptedQuestions,
    ...finalNewQuestions
  ]);

  saveAcceptedQuestions(allAcceptedQuestions);

  const summary = {
    requested: CONFIG.numberOfQuestionsWanted,
    draftsPassingLocalQualityGate: draftQuestions.length,
    draftsPassingAnswerCheck: answerCheckedQuestions.length,
    acceptedAfterOptimisation: finalNewQuestions.length,
    totalSavedQuestions: allAcceptedQuestions.length,
    rejectedBeforeAnswerCheck,
    rejectedByAnswerCheck,
    rejectedAfterOptimisation,
    savedTo: CONFIG.outputFile
  };

  console.log("\nFINAL SUMMARY:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nNEW ACCEPTED CALCULATION QUESTIONS:");
  console.log(JSON.stringify(finalNewQuestions, null, 2));
}

runPipeline().catch((error) => {
  console.error("Calculation question pipeline failed:", error);
});