function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normaliseText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sumMarkSchemeMarks(markScheme) {
  if (!Array.isArray(markScheme)) {
    return 0;
  }

  return markScheme.reduce((total, point) => {
    return total + Number(point?.marks || 0);
  }, 0);
}

function hasTooVagueMarkPoint(pointText) {
  const text = normaliseText(pointText);

  const vaguePatterns = [
    "define accurately",
    "definition accurately",
    "explain accurately",
    "describe accurately",
    "correct definition",
    "correct explanation",
    "correct identification",
    "correct relationship",
    "state accurately",
    "state correctly",
    "correctly state",
    "correctly define",
    "correctly explain",
    "distinguish between",
    "distinguish correctly",
    "compare correctly",
    "describe the relationship correctly",
    "state the direction",
    "understands",
    "shows understanding",
    "explains the concept",
    "describes the concept",
    "identifies the concept",
    "states the concept",
    "gives a correct answer",
    "gives an appropriate answer",
    "relevant explanation",
    "scientifically accurate explanation",
    "uses correct terminology",
    "uses appropriate terminology",
    "clear explanation",
    "complete explanation",
    "explains the relationship",
    "describes the relationship",
    "compares accurately",
    "compares correctly",
    "mentions the correct idea"
  ];

  return vaguePatterns.some((pattern) => text.includes(pattern));
}

function isPromptRepeatedAsMarkPoint(prompt, pointText) {
  const promptText = normaliseText(prompt);
  const point = normaliseText(pointText);

  if (!promptText || !point) {
    return false;
  }

  return point.includes(promptText) || promptText.includes(point);
}

function hasRepeatedMarkSchemeIdeas(markScheme) {
  if (!Array.isArray(markScheme) || markScheme.length < 2) {
    return false;
  }

  const points = markScheme.map((point) => normaliseText(point?.point));

  return points.some((point, index) => {
    return points.some((otherPoint, otherIndex) => {
      if (index === otherIndex || !point || !otherPoint) {
        return false;
      }

      return point.includes(otherPoint) || otherPoint.includes(point);
    });
  });
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

function hasKnownPhysicsError(question) {
  const trustedText = normaliseText([
    question?.prompt,
    question?.quizCorrectAnswer,
    question?.workedSolution,
    ...(Array.isArray(question?.markScheme)
      ? question.markScheme.map((point) => point?.point)
      : [])
  ].join(" "));

  const forbiddenPatterns = [
    "force is inversely proportional to mass",
    "f is inversely proportional to m",
    "force is directly proportional to acceleration and inversely proportional to mass",
    "newton's second law states that force is inversely proportional to mass",

    "friction causes an object to decelerate",
    "friction causes an object to accelerate",
    "friction causes deceleration",
    "friction causes acceleration",
    "friction always causes deceleration",
    "friction prevents motion",
    "friction slows down motion",

    "air resistance causes an object to decelerate",
    "air resistance causes an object to accelerate",
    "air resistance causes deceleration",
    "air resistance causes acceleration",
    "air resistance always causes deceleration",

    "normal contact force causes an object to remain at rest",
    "normal contact force causes the object to remain at rest",
    "normal contact force opposes motion",

    "frictional force is zero",
    "friction must be zero for constant velocity"
  ];

  return forbiddenPatterns.some((pattern) => trustedText.includes(pattern));
}

function validateQuestionStructure(question) {
  const errors = [];

  if (!isNonEmptyString(question?.id)) {
    errors.push("Missing id.");
  }

  if (!question?.topic || typeof question.topic !== "object") {
    errors.push("Missing topic object.");
  }

  if (!isNonEmptyString(question?.topic?.level1)) {
    errors.push("Missing topic.level1.");
  }

  if (!isNonEmptyString(question?.topic?.level2)) {
    errors.push("Missing topic.level2.");
  }

  if (!isNonEmptyString(question?.topic?.level3)) {
    errors.push("Missing topic.level3.");
  }

  if (!isNonEmptyString(question?.prompt)) {
    errors.push("Missing prompt.");
  }

  if (!Array.isArray(question?.quizOptions) || question.quizOptions.length !== 4) {
    errors.push("quizOptions must contain exactly 4 options.");
  } else {
    if (hasDuplicateOptions(question.quizOptions)) {
      errors.push("quizOptions must not contain duplicate or near-duplicate options.");
    }

    question.quizOptions.forEach((option, index) => {
      if (!isNonEmptyString(option)) {
        errors.push(`quizOptions[${index}] is empty.`);
      }

      if (normaliseText(option).length < 3) {
        errors.push(`quizOptions[${index}] is too short or vague.`);
      }
    });
  }

  if (!isNonEmptyString(question?.quizCorrectAnswer)) {
    errors.push("Missing quizCorrectAnswer.");
  }

  if (
    Array.isArray(question?.quizOptions) &&
    isNonEmptyString(question?.quizCorrectAnswer) &&
    !question.quizOptions.includes(question.quizCorrectAnswer)
  ) {
    errors.push("quizCorrectAnswer must appear exactly inside quizOptions.");
  }

  if (!Array.isArray(question?.shortAcceptedAnswers)) {
    errors.push("shortAcceptedAnswers must be an array.");
  }

  if (!Array.isArray(question?.markScheme) || question.markScheme.length === 0) {
    errors.push("markScheme must be a non-empty array.");
  }

  if (!Number.isInteger(question?.marks) || question.marks < 1 || question.marks > 3) {
    errors.push("marks must be an integer between 1 and 3.");
  }

  if (Array.isArray(question?.markScheme)) {
    question.markScheme.forEach((point, index) => {
      if (!isNonEmptyString(point?.point)) {
        errors.push(`markScheme[${index}] is missing point text.`);
        return;
      }

      if (point?.marks !== 1) {
        errors.push(`markScheme[${index}] must be worth exactly 1 mark.`);
      }

      if (hasTooVagueMarkPoint(point.point)) {
        errors.push(`markScheme[${index}] is too vague: "${point.point}"`);
      }

      if (isPromptRepeatedAsMarkPoint(question.prompt, point.point)) {
        errors.push(`markScheme[${index}] repeats the prompt instead of giving a specific marking point.`);
      }

      if (normaliseText(point.point).length < 20) {
        errors.push(`markScheme[${index}] is too short to support stable partial marking.`);
      }
    });
    if (hasRepeatedMarkSchemeIdeas(question.markScheme)) {
      errors.push("markScheme contains repeated or overlapping marking points.");
    }
    const totalMarkSchemeMarks = sumMarkSchemeMarks(question.markScheme);

    if (Number.isInteger(question?.marks) && totalMarkSchemeMarks !== question.marks) {
      errors.push(
        `marks must equal total markScheme marks. marks=${question.marks}, markScheme total=${totalMarkSchemeMarks}.`
      );
    }

    if (question?.marks >= 2 && question.markScheme.length < 2) {
      errors.push("Multi-mark questions must have at least 2 markScheme points.");
    }
  }

  if (
    question?.marks >= 2 &&
    Array.isArray(question?.shortAcceptedAnswers) &&
    question.shortAcceptedAnswers.length > 0
  ) {
    errors.push("Multi-mark questions should use an empty shortAcceptedAnswers array.");
  }

  if (!isNonEmptyString(question?.workedSolution)) {
    errors.push("Missing workedSolution explanation.");
  } else if (normaliseText(question.workedSolution).length < 50) {
    errors.push("workedSolution is too short to explain the expected idea.");
  }
  if (hasKnownPhysicsError(question)) {
    errors.push("Question contains a known physics misconception.");
  }
  if (hasCircularReasoning(question)) {
    errors.push("Question contains circular reasoning.");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

function removeDuplicateQuestions(questions) {
  const seenPrompts = new Set();

  return questions.filter((question) => {
    const key = normaliseText(question.prompt);

    if (!key || seenPrompts.has(key)) {
      return false;
    }

    seenPrompts.add(key);
    return true;
  });
}

function hasCircularReasoning(question) {
  const prompt = normaliseText(question?.prompt);
  const markSchemeText = Array.isArray(question?.markScheme)
    ? question.markScheme.map((point) => normaliseText(point?.point)).join(" ")
    : "";
  const workedSolution = normaliseText(question?.workedSolution);

  if (!prompt.includes("explain why")) {
    return false;
  }

  const circularPatterns = [
    "because the net force acting on it is zero",
    "because the net force acting on it is non-zero",
    "because the resultant force is zero",
    "because the resultant force is non-zero",
    "because the force is exerted perpendicular to the surface"
  ];

  return circularPatterns.some((pattern) => {
    return markSchemeText.includes(pattern) || workedSolution.includes(pattern);
  });
}

//calculation question validation check

function validateCalculationQuestionStructure(question) {
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

  if (errors.length > 0) {
    return {
      isValid: false,
      errors
    };
  }

  const mass = Number(question.givenValues.massKg);
  const acceleration = Number(question.givenValues.accelerationMs2);
  const answerValue = Number(question.answer.value);

  if (!Number.isFinite(mass) || mass <= 0) {
    errors.push("massKg must be a positive number.");
  }

  if (!Number.isFinite(acceleration)) {
    errors.push("accelerationMs2 must be a number.");
  }

  if (!Number.isFinite(answerValue)) {
    errors.push("answer.value must be a number.");
  }

  if (question.answer.unit !== "N") {
    errors.push("answer.unit must be N for F_MA questions.");
  }

  const expectedForce = mass * acceleration;

  if (
    Number.isFinite(expectedForce) &&
    Number.isFinite(answerValue) &&
    Math.abs(expectedForce - answerValue) > 0.01
  ) {
    errors.push(`Incorrect answer: expected ${expectedForce} N, got ${answerValue} N.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateQuestionStructure,
  removeDuplicateQuestions,
  validateCalculationQuestionStructure
};