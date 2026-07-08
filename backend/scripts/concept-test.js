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

  promptFile: path.join(
    __dirname,
    "../subjects/physics/physics-concept-prompt.json"
  ),

  validatorFile: path.join(
    __dirname,
    "../subjects/physics/physics-concept-validator.json"
  ),

  numberOfQuestionsWanted: 5,
  numberOfBlueprintsToGenerate: 10,

  blueprintModel: process.env.GROQ_BLUEPRINT_MODEL || "llama-3.3-70b-versatile",
  assessmentModel: process.env.GROQ_ASSESSMENT_MODEL || "llama-3.3-70b-versatile",

  temperature: 0.1,

  minimumAcceptedByMarks: {
    1: 3,
    2: 2
  },
  outputFile: path.join(__dirname, "../data/physics/test-generated-concept-questions.json"),
  useStrictValidator: true
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

  const rawText = fs.readFileSync(filePath, "utf8");

  if (!rawText.trim()) {
    throw new Error(
      `Configuration file is empty: ${filePath}`
    );
  }

  return JSON.parse(rawText);
}

function findTopicPromptConfig(
  promptEntries,
  requestedTopicName
) {
  if (!Array.isArray(promptEntries)) {
    throw new Error(
      "Concept prompt configuration must be an array."
    );
  }

  const normalisedRequestedTopic =
    normaliseText(requestedTopicName);

  for (const topicEntry of promptEntries) {
    if (
      !topicEntry ||
      typeof topicEntry !== "object" ||
      Array.isArray(topicEntry)
    ) {
      continue;
    }

    const matchingEntry = Object.entries(
      topicEntry
    ).find(([storedTopicName]) => {
      return (
        normaliseText(storedTopicName) ===
        normalisedRequestedTopic
      );
    });

    if (!matchingEntry) {
      continue;
    }

    const [, promptConfig] = matchingEntry;

    if (
      !promptConfig ||
      typeof promptConfig !== "object" ||
      Array.isArray(promptConfig)
    ) {
      throw new Error(
        `Invalid prompt configuration for topic: ${requestedTopicName}`
      );
    }

    return promptConfig;
  }

  throw new Error(
    `No concept prompt configuration found for topic: ${requestedTopicName}`
  );
}

function findTopicValidatorRules(
  validatorEntries,
  requestedTopicName
) {
  if (!Array.isArray(validatorEntries)) {
    throw new Error(
      "Concept validator configuration must be an array."
    );
  }

  const normalisedRequestedTopic =
    normaliseText(requestedTopicName);

  for (const topicEntry of validatorEntries) {
    if (
      !topicEntry ||
      typeof topicEntry !== "object" ||
      Array.isArray(topicEntry)
    ) {
      continue;
    }

    const matchingEntry =
      Object.entries(topicEntry).find(
        ([storedTopicName]) => {
          return (
            normaliseText(storedTopicName) ===
            normalisedRequestedTopic
          );
        }
      );

    if (!matchingEntry) {
      continue;
    }

    const [, validatorRules] = matchingEntry;

    if (
      !validatorRules ||
      typeof validatorRules !== "object" ||
      Array.isArray(validatorRules)
    ) {
      throw new Error(
        `Invalid concept validator configuration for topic: ${requestedTopicName}`
      );
    }

    return validatorRules;
  }

  throw new Error(
    `No concept validator configuration found for topic: ${requestedTopicName}`
  );
}

const conceptPromptEntries =
  loadJsonFile(CONFIG.promptFile);

const conceptValidatorEntries =
  loadJsonFile(CONFIG.validatorFile);

const topicPromptConfig =
  findTopicPromptConfig(
    conceptPromptEntries,
    CONFIG.topic
  );

const topicValidatorRules =
  findTopicValidatorRules(
    conceptValidatorEntries,
    CONFIG.topic
  );

async function callGroq(prompt, model) {
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: CONFIG.temperature,
    response_format: {
      type: "json_object"
    }
  });

  return JSON.parse(completion.choices[0].message.content);
}

function buildBlueprintPrompt(
  numberOfBlueprints,
  existingPrompts = [],
  promptConfig
) {
  if (
    !promptConfig ||
    !Array.isArray(
      promptConfig.blueprintPromptRules
    )
  ) {
    throw new Error(
      "Missing blueprintPromptRules for the selected topic."
    );
  }
  return `
Create ${numberOfBlueprints} A-level Physics concept question blueprints for MAXI.

Topic:
- Subject: ${CONFIG.subject}
- Level: ${CONFIG.level}
- Topic: ${CONFIG.topic}

Return only valid JSON. No markdown. No extra text.

A blueprint is NOT a full question. Do not generate quizOptions or markScheme yet.

Each blueprint must define:
- prompt: exam-style question text
- intendedIdea: the exact correct scientific idea being tested
- marks: 1, 2
- questionSkill: "state", "define", "explain", "compare", or "apply"
- mustInclude: key ideas that a correct answer or mark scheme must include
- mustAvoid: common mistakes that must not appear

Quality rules:
- Prefer narrow exam-style questions over broad textbook discussion questions.
- Each question should test one focused concept, not a whole topic summary.
- Avoid broad prompts such as "describe all forces acting on...", "compare and contrast...", or "explain the relationship between..." unless the expected mark points are very clear.
- Avoid car friction questions unless the role or direction of friction is clearly specified.
- Avoid numerical values in concept blueprints unless the question is about conceptual interpretation, not calculation.
- Avoid questions that combine more than two forces unless the situation is very specific.
- Use simple exam situations where useful.
- A 1-mark question tests one clear idea.
- A 2-mark question requires two separate markable ideas.
- Do not inflate simple recall into 2 marks.
- Aim for a mix of 1-mark and 2-mark blueprints.

Existing question prompts to avoid:
${existingPrompts.length > 0 ? existingPrompts.map((prompt) => `- ${prompt}`).join("\n") : "- None"}

Do not create questions that are the same as, very similar to, or simple rewordings of the existing prompts above.

Topic-specific Physics rules:
${promptConfig.blueprintPromptRules
  .map((rule) => `- ${rule}`)
  .join("\n")}

JSON format rules:
- Return exactly one valid JSON object.
- The top-level key must be "blueprints".
- "blueprints" must be an array.
- Every blueprint must include draftId, topic, prompt, intendedIdea, marks, questionSkill, mustInclude, and mustAvoid.
- mustInclude must always be an array of strings.
- mustAvoid must always be an array of strings.
- Even when there is only one required idea or one mistake, still use an array.
- Do not return mustInclude or mustAvoid as plain strings.
- Do not omit draftId.
- Do not omit the topic object.

Return exactly this JSON:
{
  "blueprints": [
    {
      "draftId": "blueprint_1",
      "topic": {
        "level1": "${CONFIG.level1}",
        "level2": "${CONFIG.subject}",
        "level3": "${CONFIG.topic}"
      },
      "prompt": "Question text",
      "intendedIdea": "Exact scientific idea being tested",
      "marks": 1,
      "questionSkill": "state",
      "mustInclude": [
        "Required idea"
      ],
      "mustAvoid": [
        "Common mistake"
      ]
    }
  ]
}
`;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasKnownPhysicsErrorInText(
  text,
  forbiddenPatterns = []
) {
  const normalised = normaliseText(text);

  return forbiddenPatterns.some((pattern) => {
    return normalised.includes(
      normaliseText(pattern)
    );
  });
}

function validateBlueprint(blueprint) {
  const errors = [];

  if (!isNonEmptyString(blueprint?.draftId)) {
    errors.push("Missing draftId.");
  }

  if (!isNonEmptyString(blueprint?.prompt)) {
    errors.push("Missing prompt.");
  }

  if (!isNonEmptyString(blueprint?.intendedIdea)) {
    errors.push("Missing intendedIdea.");
  }

  if (!Number.isInteger(blueprint?.marks) || blueprint.marks < 1 || blueprint.marks > 2) {
    errors.push("marks must be 1 or 2.");
  }

  if (!Array.isArray(blueprint?.mustInclude)) {
    errors.push("mustInclude must be an array.");
  }

  if (!Array.isArray(blueprint?.mustAvoid)) {
    errors.push("mustAvoid must be an array.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
function removeDuplicateBlueprints(blueprints) {
  const seen = new Set();

  return blueprints.filter((blueprint) => {
    const key = normaliseText(blueprint.prompt);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAssessmentPrompt(
  blueprints,
  promptConfig
) {
  if (
    !promptConfig ||
    !Array.isArray(
      promptConfig.assessmentPromptRules
    )
  ) {
    throw new Error(
      "Missing assessmentPromptRules for the selected topic."
    );
  }
  return `
Turn these approved Physics blueprints into full MAXI questions.

Return only valid JSON. No markdown. No extra text.
Do not change the core prompt meaning.
Do not add numerical calculation questions.

For each blueprint:
- Use the blueprint's marks exactly.
- quizOptions must contain exactly 4 options.
- quizCorrectAnswer must appear exactly inside quizOptions.
- Only one quiz option may be clearly correct.
- Wrong options must be clearly wrong, not partially correct.
- Keep quizOptions concise. Avoid options longer than one sentence.
- markScheme must contain exactly one 1-mark point per available mark.
- Each markScheme point must be a complete sentence, not a short fragment.
- Each markScheme point must directly answer the prompt.
- Do not add extra physics claims that are not required to answer the prompt.
- markScheme points must come from intendedIdea and mustInclude.
- Do not include anything from mustAvoid.
- Do not turn mustAvoid statements into negative correct answers.
- The correct answer should state the positive scientific idea being tested.
- Do not use "mass is constant" as a markScheme point unless the question specifically asks for an assumption.
- For force, mass and acceleration questions, use F = ma correctly.
- If explaining how mass affects acceleration, state that for the same resultant force, a larger mass gives a smaller acceleration.
- Do not create a 2-mark question if the answer only contains one real scientific idea.
- Do not use a repeated summary point such as "both oppose motion" if earlier mark points already say this.
- Multi-mark questions must use shortAcceptedAnswers: [].
- workedSolution must be 1-2 clear sentences.
- Do not treat prompt conditions as markScheme points.
- For 2-mark questions, the two markScheme points must test two clearly different ideas.
- Do not split "opposes motion" and "acts in the opposite direction to motion" into two separate markScheme points; they are the same idea.
- Do not use two markScheme points that simply rephrase the same idea.
- If the second mark point repeats the first, reduce the question to 1 mark.
- For 1-mark questions, quizCorrectAnswer should be short and direct.
- Do not split "opposes motion" and "acts in the opposite direction to motion" into two separate markScheme points; they are the same idea.

Topic-specific Physics rules:
${promptConfig.assessmentPromptRules
  .map((rule) => `- ${rule}`)
  .join("\n")}
  
Return exactly this JSON:
{
  "questions": [
    {
      "draftId": "blueprint_1",
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
      "workedSolution": "Brief explanation."
    }
  ]
}

Approved blueprints:
${JSON.stringify(blueprints, null, 2)}
`;
}

async function generateBlueprints(existingPrompts = []) {
  const parsed = await callGroq(
    buildBlueprintPrompt(
      CONFIG.numberOfBlueprintsToGenerate,
      existingPrompts,
      topicPromptConfig
    ),
    CONFIG.blueprintModel
  );

  if (!Array.isArray(parsed.blueprints)) {
    throw new Error("Groq returned JSON, but blueprints is not an array.");
  }

  return parsed.blueprints;
}

async function buildQuestionsFromBlueprints(blueprints) {
  const parsed = await callGroq(
    buildAssessmentPrompt(
      blueprints,
      topicPromptConfig
    ),
    CONFIG.assessmentModel
  );

  if (!Array.isArray(parsed.questions)) {
    throw new Error("Groq returned JSON, but questions is not an array.");
  }

  return parsed.questions;
}

function normaliseOptionForDuplicateCheck(option) {
  const text = normaliseText(option);

  if (!text.includes(" and ")) {
    return text;
  }

  return text
    .split(" and ")
    .map((part) => part.trim())
    .sort()
    .join(" and ");
}

function hasDuplicateOptions(options) {
  const normalisedOptions = options.map(normaliseOptionForDuplicateCheck);
  return new Set(normalisedOptions).size !== normalisedOptions.length;
}

function questionContainsKnownPhysicsError(
  question,
  validatorRules = {}
) {
  const combinedText = [
    question?.prompt,
    question?.quizCorrectAnswer,
    question?.workedSolution,
    ...(Array.isArray(question?.markScheme)
      ? question.markScheme.map(
          (point) => point?.point
        )
      : [])
  ].join(" ");

  return hasKnownPhysicsErrorInText(
    combinedText,
    validatorRules.forbiddenPatterns || []
  );
}

function lightlyCheckFinalQuestion(
  question,
  validatorRules = {}
) {
  const warnings = [];

  if (!isNonEmptyString(question?.prompt)) {
    warnings.push("Missing prompt.");
  }

  if (!Array.isArray(question?.quizOptions) || question.quizOptions.length !== 4) {
    warnings.push("quizOptions should contain exactly 4 options.");
  }

  if (!isNonEmptyString(question?.quizCorrectAnswer)) {
    warnings.push("Missing quizCorrectAnswer.");
  }

  if (
    Array.isArray(question?.quizOptions) &&
    isNonEmptyString(question?.quizCorrectAnswer) &&
    !question.quizOptions.includes(question.quizCorrectAnswer)
  ) {
    warnings.push("quizCorrectAnswer is not exactly included in quizOptions.");
  }

  if (!Array.isArray(question?.markScheme) || question.markScheme.length === 0) {
    warnings.push("Missing markScheme.");
  }

  if (!Number.isInteger(question?.marks) || question.marks < 1 || question.marks > 2) {
    warnings.push("marks should be 1 or 2 in this test run.");
  }

  if (Array.isArray(question?.markScheme) && Number.isInteger(question?.marks)) {
    const totalMarkSchemeMarks = question.markScheme.reduce((sum, point) => {
      return sum + (Number(point?.marks) || 0);
    }, 0);

    if (totalMarkSchemeMarks !== question.marks) {
      warnings.push(`markScheme total ${totalMarkSchemeMarks} does not match marks ${question.marks}.`);
    }
    if (Array.isArray(question?.markScheme) && question.markScheme.length >= 2) {
      const points = question.markScheme.map((point) => normaliseText(point?.point));

      const hasNearDuplicatePoint = points.some((point, index) => {
        return points.some((otherPoint, otherIndex) => {
          if (index === otherIndex || !point || !otherPoint) {
            return false;
          }

          return point.includes(otherPoint) || otherPoint.includes(point);
        });
      });

      if (hasNearDuplicatePoint) {
        warnings.push("markScheme may contain repeated or overlapping mark points.");
      }
    }
  }

  if (!isNonEmptyString(question?.workedSolution)) {
    warnings.push("Missing workedSolution.");
  }

  if (Array.isArray(question?.quizOptions) && hasDuplicateOptions(question.quizOptions)) {
    warnings.push("quizOptions contain duplicate or reversed duplicate options.");
  }

  if (
    questionContainsKnownPhysicsError(
      question,
      validatorRules
    )
  ) {
    warnings.push("Possible known physics misconception detected.");
  }

  return {
    isUsableForReview: warnings.length < 6,
    warnings
  };
}

function validateFinalQuestion(
  question,
  validatorRules = {}
) {
  const questionForValidation = {
    ...question,
    id:
      question.id ||
      question.draftId ||
      "temporary_validation_id"
  };

  return validateQuestionStructure(
    questionForValidation,
    validatorRules
  );
}

function countQuestionsByMarks(questions) {
  return questions.reduce((counts, question) => {
    const marks = Number(question?.marks);

    if (Number.isInteger(marks)) {
      counts[marks] = (counts[marks] || 0) + 1;
    }

    return counts;
  }, {});
}

function hasRequiredMarkMix(questions, requiredByMarks) {
  const counts = countQuestionsByMarks(questions);

  return Object.entries(requiredByMarks).every(([marks, requiredCount]) => {
    return (counts[marks] || 0) >= requiredCount;
  });
}

function selectQuestionsByRequiredMarkMix(questions, requiredByMarks, limit) {
  const selected = [];
  const selectedIndexes = new Set();

  Object.entries(requiredByMarks).forEach(([marksText, requiredCount]) => {
    const marks = Number(marksText);

    const matchingEntries = questions
      .map((question, index) => {
        return {
          question,
          index
        };
      })
      .filter((entry) => {
        return entry.question.marks === marks;
      });

    matchingEntries.slice(0, requiredCount).forEach((entry) => {
      selected.push(entry.question);
      selectedIndexes.add(entry.index);
    });
  });

  const remainingSlots = limit - selected.length;

  if (remainingSlots > 0) {
    const remainingQuestions = questions.filter((question, index) => {
      return !selectedIndexes.has(index);
    });

    selected.push(...remainingQuestions.slice(0, remainingSlots));
  }

  return selected.slice(0, limit);
}

function loadQuestionBank() {
  if (!fs.existsSync(CONFIG.outputFile)) {
    return [];
  }

  const rawText = fs.readFileSync(
    CONFIG.outputFile,
    "utf8"
  );

  if (!rawText.trim()) {
    return [];
  }

  const parsed = JSON.parse(rawText);

  if (!Array.isArray(parsed)) {
    throw new Error(
      "Question bank must be an array of topic objects."
    );
  }

  return parsed;
}

function getQuestionsForTopic(
  questionBank,
  topicName
) {
  const requestedTopic =
    normaliseText(topicName);

  for (const topicEntry of questionBank) {
    if (
      !topicEntry ||
      typeof topicEntry !== "object" ||
      Array.isArray(topicEntry)
    ) {
      continue;
    }

    const matchingEntry =
      Object.entries(topicEntry).find(
        ([storedTopicName]) => {
          return (
            normaliseText(storedTopicName) ===
            requestedTopic
          );
        }
      );

    if (!matchingEntry) {
      continue;
    }

    const [, questions] = matchingEntry;

    return Array.isArray(questions)
      ? questions
      : [];
  }

  return [];
}

function getExistingPromptList(questions, limit = 30) {
  return questions
    .map((question) => question?.prompt)
    .filter((prompt) => typeof prompt === "string" && prompt.trim().length > 0)
    .slice(-limit);
}

function saveQuestionsForTopic(
  questionBank,
  topicName,
  questions
) {
  const requestedTopic =
    normaliseText(topicName);

  let topicFound = false;

  const updatedBank = questionBank.map(
    (topicEntry) => {
      if (
        !topicEntry ||
        typeof topicEntry !== "object" ||
        Array.isArray(topicEntry)
      ) {
        return topicEntry;
      }

      const storedTopicName =
        Object.keys(topicEntry).find(
          (name) => {
            return (
              normaliseText(name) ===
              requestedTopic
            );
          }
        );

      if (!storedTopicName) {
        return topicEntry;
      }

      topicFound = true;

      return {
        ...topicEntry,
        [storedTopicName]: questions
      };
    }
  );

  if (!topicFound) {
    updatedBank.push({
      [normaliseText(topicName)]: questions
    });
  }

  fs.mkdirSync(
    path.dirname(CONFIG.outputFile),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    CONFIG.outputFile,
    JSON.stringify(updatedBank, null, 2),
    "utf8"
  );
}


function cleanQuestionForSaving(question, id) {
  const {
    draftId,
    ...cleanQuestion
  } = question;

  return {
    ...cleanQuestion,
    id
  };
}

function makeTopicSlug(topicName) {
  return normaliseText(topicName)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function giveFinalIds(questions, existingQuestions) {
  const existingCount = existingQuestions.length;
  const topicSlug = makeTopicSlug(CONFIG.topic);

  return questions.map((question, index) => {
    return cleanQuestionForSaving(
      question,
      `test_gen_concept_${topicSlug}_q${
        existingCount + index + 1
      }`
    );
  });
}

async function runPipeline() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in .env");
  }

  const existingQuestionBank =
  loadQuestionBank();

  const existingQuestionsForAvoidance =
    getQuestionsForTopic(
      existingQuestionBank,
      CONFIG.topic
    );
  const existingPrompts = getExistingPromptList(existingQuestionsForAvoidance, 30);

  console.log("\nGenerating concept blueprints...");
  const rawBlueprints = await generateBlueprints(existingPrompts);

  const blueprintResults = rawBlueprints.map((blueprint) => {
    return {
      blueprint,
      validation: validateBlueprint(blueprint)
    };
  });

  const acceptedBlueprints = removeDuplicateBlueprints(
    blueprintResults
      .filter((item) => item.validation.isValid)
      .map((item) => item.blueprint)
  );

  const rejectedBlueprints = blueprintResults
    .filter((item) => !item.validation.isValid)
    .map((item) => {
      return {
        draftId: item.blueprint?.draftId || "unknown",
        prompt: item.blueprint?.prompt || "",
        errors: item.validation.errors
      };
    });

  console.log(`Blueprints generated: ${rawBlueprints.length}`);
  console.log(`Blueprints accepted locally: ${acceptedBlueprints.length}`);

  if (acceptedBlueprints.length === 0) {
    console.log("\nNo accepted blueprints. Rejected blueprints:");
    console.log(JSON.stringify(rejectedBlueprints, null, 2));
    return;
  }

  console.log("\nBuilding assessment data from accepted blueprints...");
  const rawQuestions = await buildQuestionsFromBlueprints(acceptedBlueprints);

  const questionResults = rawQuestions.map((question) => {
    return {
      question,
      lightCheck:
  lightlyCheckFinalQuestion(question, topicValidatorRules)
    };
  });

  const validationResults = questionResults.map((item) => {
    return {
      question: item.question,
      lightCheck: item.lightCheck,
      strictValidation:
  validateFinalQuestion(item.question, topicValidatorRules)
    };
  });

  const acceptedQuestions = CONFIG.useStrictValidator
    ? removeDuplicateQuestions(
        validationResults
          .filter((item) => item.strictValidation.isValid)
          .map((item) => item.question)
      )
    : removeDuplicateQuestions(
        validationResults.map((item) => item.question)
      );

  const rejectedQuestions = CONFIG.useStrictValidator
    ? validationResults
        .filter((item) => !item.strictValidation.isValid)
        .map((item) => {
          return {
            draftId: item.question?.draftId || "unknown",
            prompt: item.question?.prompt || "",
            marks: item.question?.marks || null,
            errors: item.strictValidation.errors
          };
        })
    : [];

  const reviewWarnings = validationResults.map((item) => {
    return {
      draftId: item.question?.draftId || "unknown",
      prompt: item.question?.prompt || "",
      marks: item.question?.marks || null,
      warnings: item.lightCheck.warnings,
      strictValidatorPassed: item.strictValidation.isValid,
      strictValidatorErrors: item.strictValidation.errors
    };
  });
  const markCounts = countQuestionsByMarks(acceptedQuestions);

  console.log(`Questions built: ${rawQuestions.length}`);
  console.log(`Questions accepted locally: ${acceptedQuestions.length}`);
  console.log("Accepted mark counts:");
  console.log(JSON.stringify(markCounts, null, 2));

  if (!hasRequiredMarkMix(acceptedQuestions, CONFIG.minimumAcceptedByMarks)) {
    console.log("\nAccepted questions did not meet required mark mix.");
    console.log("Required:");
    console.log(JSON.stringify(CONFIG.minimumAcceptedByMarks, null, 2));
  }

  const selectedQuestions = selectQuestionsByRequiredMarkMix(acceptedQuestions, CONFIG.minimumAcceptedByMarks, CONFIG.numberOfQuestionsWanted);

  const existingQuestions =
  getQuestionsForTopic(
    existingQuestionBank,
    CONFIG.topic
  );

  const finalNewQuestions = giveFinalIds(selectedQuestions, existingQuestions);

  const allQuestions = removeDuplicateQuestions([
    ...existingQuestions,
    ...finalNewQuestions
  ]);

  saveQuestionsForTopic(
    existingQuestionBank,
    CONFIG.topic,
    allQuestions
  );

  const summary = {
    requested: CONFIG.numberOfQuestionsWanted,
    rawBlueprints: rawBlueprints.length,
    acceptedBlueprints: acceptedBlueprints.length,
    rawQuestions: rawQuestions.length,
    acceptedQuestions: acceptedQuestions.length,
    finalNewQuestions: finalNewQuestions.length,
    totalSavedQuestions: allQuestions.length,
    markCounts,
    rejectedBlueprints,
    rejectedQuestions,
    reviewWarnings,
    savedTo: CONFIG.outputFile
  };


  console.log("\nFINAL SUMMARY:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nNEW ACCEPTED QUESTIONS:");
  console.log(JSON.stringify(finalNewQuestions, null, 2));
}

runPipeline().catch((error) => {
  console.error("Test concept pipeline failed:", error);
});
