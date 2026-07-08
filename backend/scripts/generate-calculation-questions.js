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
  promptFile: path.join(
  __dirname,
    "../subjects/physics/physics-calculation-prompt.json"
  ),

  validatorFile: path.join(
    __dirname,
    "../subjects/physics/physics-calculation-validator.json"
  ),
  numberOfQuestionsWanted: 5,
  candidatePoolSize: 12,
  maxGenerationAttempts: 4,
  draftScoreThreshold: 6,
  finalScoreThreshold: 8,
  outputFile: path.join(__dirname, "../data/generated-calculation-questions.json")
};

function normaliseText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function loadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Configuration file does not exist: ${filePath}`
    );
  }

  const rawText = fs.readFileSync(
    filePath,
    "utf8"
  );

  if (!rawText.trim()) {
    throw new Error(
      `Configuration file is empty: ${filePath}`
    );
  }

  return JSON.parse(rawText);
}

function findCalculationConfig(
  configEntries,
  requestedTopic,
  requestedFormulaType,
  configLabel
) {
  if (!Array.isArray(configEntries)) {
    throw new Error(
      `${configLabel} configuration must be an array.`
    );
  }

  const requestedTopicKey =
    normaliseText(requestedTopic);

  for (const topicEntry of configEntries) {
    if (
      !topicEntry ||
      typeof topicEntry !== "object" ||
      Array.isArray(topicEntry)
    ) {
      continue;
    }

    const matchingTopic =
      Object.entries(topicEntry).find(
        ([storedTopic]) => {
          return (
            normaliseText(storedTopic) ===
            requestedTopicKey
          );
        }
      );

    if (!matchingTopic) {
      continue;
    }

    const [, formulaConfigs] =
      matchingTopic;

    const formulaConfig =
      formulaConfigs?.[requestedFormulaType];

    if (
      !formulaConfig ||
      typeof formulaConfig !== "object" ||
      Array.isArray(formulaConfig)
    ) {
      throw new Error(
        `No ${configLabel} configuration found for formula type: ${requestedFormulaType}`
      );
    }

    return formulaConfig;
  }

  throw new Error(
    `No ${configLabel} configuration found for topic: ${requestedTopic}`
  );
}

function renderPromptTemplate(
  templateLines,
  variables
) {
  if (!Array.isArray(templateLines)) {
    throw new Error(
      "Prompt template must be an array of strings."
    );
  }

  let renderedPrompt =
    templateLines.join("\n");

  Object.entries(variables).forEach(
    ([variableName, value]) => {
      renderedPrompt =
        renderedPrompt.replaceAll(
          `{{${variableName}}}`,
          String(value)
        );
    }
  );

  return renderedPrompt;
}

const calculationPromptEntries =
  loadJsonFile(CONFIG.promptFile);

const calculationValidatorEntries =
  loadJsonFile(CONFIG.validatorFile);

const calculationPromptConfig =
  findCalculationConfig(
    calculationPromptEntries,
    CONFIG.topic,
    CONFIG.formulaType,
    "calculation prompt"
  );

const calculationValidatorConfig =
  findCalculationConfig(
    calculationValidatorEntries,
    CONFIG.topic,
    CONFIG.formulaType,
    "calculation validator"
  );

function buildCalculationGenerationPrompt(
  numberOfQuestions
) {
  return renderPromptTemplate(
    calculationPromptConfig
      .generationPromptTemplate,
    {
      numberOfQuestions,
      topic: CONFIG.topic,
      level1: CONFIG.level1,
      subject: CONFIG.subject
    }
  );
}

function buildCalculationOptimisationPrompt(
  questions
) {
  return renderPromptTemplate(
    calculationPromptConfig
      .optimisationPromptTemplate,
    {
      topic: CONFIG.topic,
      level1: CONFIG.level1,
      subject: CONFIG.subject,
      questionsJson:
        JSON.stringify(
          questions,
          null,
          2
        )
    }
  );
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasValueWithUnit(text, value, unit) {
  const roundedValue = roundToTwoDp(value);
  const valuePattern = escapeRegex(String(roundedValue));

  let unitPattern;

  if (unit === "N") {
    unitPattern = "n|newton|newtons";
  } else if (unit === "kg") {
    unitPattern = "kg|kilogram|kilograms";
  } else if (unit === "m/s²") {
    unitPattern = "m\\/s²|m\\/s\\^2|m s-2|m s\\^-2|metres per second squared|meters per second squared";
  } else {
    unitPattern = escapeRegex(unit);
  }

  const regex = new RegExp(`(^|[^0-9.])${valuePattern}\\s*(${unitPattern})([^a-zA-Z]|$)`, "i");

  return regex.test(text);
}

function promptRevealsUnknownAnswer(question, expected) {
  const prompt = question?.prompt || "";

  if (!expected) {
    return false;
  }

  return hasValueWithUnit(prompt, expected.value, expected.unit);
}

function promptIncludesKnownGivenValues(question) {
  const prompt = question?.prompt || "";
  const givenValues = question?.givenValues || {};
  const errors = [];

  const knownValueChecks = [
    {
      key: "forceN",
      unit: "N",
      label: "force"
    },
    {
      key: "massKg",
      unit: "kg",
      label: "mass"
    },
    {
      key: "accelerationMs2",
      unit: "m/s²",
      label: "acceleration"
    }
  ];

  knownValueChecks.forEach((item) => {
    const value = givenValues[item.key];

    if (value === null || value === undefined) {
      return;
    }

    if (!Number.isFinite(Number(value))) {
      return;
    }

    if (!hasValueWithUnit(prompt, Number(value), item.unit)) {
      errors.push(`Prompt is missing known ${item.label} value: ${value} ${item.unit}.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

function formatExpectedAnswer(value, unit) {
  return `${roundToTwoDp(value)} ${unit}`;
}

function nearlyEqual(a, b, tolerance = calculationValidatorConfig.answerTolerance) {
  return (Math.abs(Number(a) - Number(b)) <= tolerance);
}

function getExpectedCalculation(question) {
  const answerUnits =
  calculationValidatorConfig.answerUnits;

  const mass = Number(question?.givenValues?.massKg);
  const acceleration = Number(question?.givenValues?.accelerationMs2);
  const force = Number(question?.givenValues?.forceN);

  if (question?.unknown === "forceN") {
    if (!Number.isFinite(mass) || !Number.isFinite(acceleration)) {
      return null;
    }

    return {
      value: mass * acceleration,
      unit: answerUnits.forceN
    };
  }

  if (question?.unknown === "accelerationMs2") {
    if (!Number.isFinite(force) || !Number.isFinite(mass) || mass === 0) {
      return null;
    }

    return {
      value: force / mass,
      unit: answerUnits.accelerationMs2
    };
  }

  if (question?.unknown === "massKg") {
    if (!Number.isFinite(force) || !Number.isFinite(acceleration) || acceleration === 0) {
      return null;
    }

    return {
      value: force / acceleration,
      unit: answerUnits.massKg
    };
  }

  return null;
}

function validateCalculationDraft(question) {
  const errors = [];

  const {
    questionType,
    formulaType,
    allowedUnknowns,
    requiredGivenValueKeys,
    quizOptionCount,
    minimumMarks,
    maximumMarks
  } = calculationValidatorConfig;

  if (!question || typeof question !== "object") {
    return {
      isValid: false,
      errors: ["Question is missing or not an object."]
    };
  }

  if (!question.id) errors.push("Missing id.");
  if (question.questionType !== questionType) {errors.push(`questionType must be ${questionType}.`);}
  if (question.formulaType !== formulaType) {errors.push(`formulaType must be ${formulaType}.`);}

  if (!question.prompt || typeof question.prompt !== "string") {
    errors.push("Missing prompt.");
  }

  if (!question.givenValues || typeof question.givenValues !== "object") {
    errors.push("Missing givenValues.");
  }

  if (!allowedUnknowns.includes(question.unknown)) {errors.push(`unknown must be one of: ${allowedUnknowns.join(", ")}.`);}
  if (question.givenValues && allowedUnknowns.includes(question.unknown)) {
    const requiredKeys = requiredGivenValueKeys;

    requiredKeys.forEach((key) => {
      if (!(key in question.givenValues)) {
        errors.push(`givenValues is missing ${key}.`);
      }
    });

    if (question.givenValues[question.unknown] !== null) {
      errors.push(`givenValues.${question.unknown} must be null because it is the unknown.`);
    }

    requiredKeys
      .filter((key) => key !== question.unknown)
      .forEach((key) => {
        const value = Number(question.givenValues[key]);

        if (!Number.isFinite(value) || value <= 0) {
          errors.push(`givenValues.${key} must be a positive number.`);
        }
      });
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

  if (!Number.isInteger(question.marks) || question.marks < minimumMarks || question.marks > maximumMarks) {
    errors.push(`marks must be an integer from ${minimumMarks} to ${maximumMarks}.`);
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
  if (promptRevealsUnknownAnswer(question, expected)) {
    errors.push("Prompt appears to reveal the unknown answer.");
  }
  const knownValuePromptCheck = promptIncludesKnownGivenValues(question);

  if (!knownValuePromptCheck.isValid) {
    errors.push(...knownValuePromptCheck.errors);
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

  const expectedMarkPointMarks =
    calculationValidatorConfig.markPointMarks;

  const allMarkPointsOneMark =
    question.markScheme.every((point) => {
      return (
        point &&
        point.marks === expectedMarkPointMarks
      );
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

function selectBalancedCalculationQuestions(questions, limit) {
  const targetByUnknown =
    calculationValidatorConfig.targetUnknownMix;

  const selected = [];
  const selectedIds = new Set();

  Object.entries(targetByUnknown).forEach(([unknown, targetCount]) => {
    const matchingQuestions = questions.filter((question) => {
      return question.unknown === unknown;
    });

    matchingQuestions.slice(0, targetCount).forEach((question) => {
      selected.push(question);
      selectedIds.add(question.id);
    });
  });

  if (selected.length < limit) {
    const remainingQuestions = questions.filter((question) => {
      return !selectedIds.has(question.id);
    });

    selected.push(...remainingQuestions.slice(0, limit - selected.length));
  }

  return selected.slice(0, limit);
}

function countByUnknown(questions) {
  return questions.reduce((counts, question) => {
    const unknown = question?.unknown || "unknown";
    counts[unknown] = (counts[unknown] || 0) + 1;
    return counts;
  }, {});
}

function hasMinimumUnknownMix(questions) {
  const counts = countByUnknown(questions);

  return Object.entries(
    calculationValidatorConfig
      .minimumUnknownMix
  ).every(([unknown, requiredCount]) => {
    return (
      (counts[unknown] || 0) >=
      requiredCount
    );
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
    if (draftQuestions.length >= CONFIG.candidatePoolSize) {
      break;
    }

    const remainingCandidateSlots = CONFIG.candidatePoolSize - draftQuestions.length;
    const questionsToGenerate = Math.min(
      remainingCandidateSlots + 2,
      CONFIG.numberOfQuestionsWanted + 3
    );

    console.log(`\nGeneration attempt ${attempt}/${CONFIG.maxGenerationAttempts}`);
    console.log(`Current draft candidate pool: ${draftQuestions.length}/${CONFIG.candidatePoolSize}`);
    console.log(`Generating ${questionsToGenerate} draft calculation question(s).`);

    const generatedQuestions = await generateCalculationQuestions(questionsToGenerate);

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
    draftQuestions = removeDuplicateCalculationQuestions(draftQuestions);

    const unknownCounts = countByUnknown(draftQuestions);
    console.log("Draft unknown counts:");
    console.log(JSON.stringify(unknownCounts, null, 2));
// Keep collecting until candidatePoolSize or maxGenerationAttempts.
// Do not stop early just because the draft pool has a mix,
// because answer validation may later reject one unknown type.
//     if (
//       draftQuestions.length >= CONFIG.numberOfQuestionsWanted &&
//       hasMinimumUnknownMix(draftQuestions)
//     ) {
//       break;
//     }
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

  const cleanedAcceptedQuestions = removeDuplicateCalculationQuestions(
    removeDuplicateQuestions(acceptedQuestions)
  );

  const cleanedUnknownCounts = countByUnknown(cleanedAcceptedQuestions);

  console.log("\nAccepted unknown counts before balancing:");
  console.log(JSON.stringify(cleanedUnknownCounts, null, 2));

  if (!hasMinimumUnknownMix(cleanedAcceptedQuestions)) {
    console.log("\nCalculation question batch did not meet minimum unknown mix.");
    console.log("Need at least one forceN, one accelerationMs2, and one massKg question.");
    console.log("No new calculation questions were saved from this batch.");

    const summary = {
      requested: CONFIG.numberOfQuestionsWanted,
      draftsPassingLocalQualityGate: draftQuestions.length,
      draftsPassingAnswerCheck: answerCheckedQuestions.length,
      acceptedAfterOptimisation: acceptedQuestions.length,
      savedNewQuestions: 0,
      totalSavedQuestions: existingAcceptedQuestions.length,
      unknownCounts: cleanedUnknownCounts,
      rejectedBeforeAnswerCheck,
      rejectedByAnswerCheck,
      rejectedAfterOptimisation,
      savedTo: CONFIG.outputFile
    };

    console.log("\nFINAL SUMMARY:");
    console.log(JSON.stringify(summary, null, 2));

    return;
  }

  const balancedAcceptedQuestions = selectBalancedCalculationQuestions(
    cleanedAcceptedQuestions,
    CONFIG.numberOfQuestionsWanted
  );

  const finalNewQuestions = giveFinalIds(
    balancedAcceptedQuestions,
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