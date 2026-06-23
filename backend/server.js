const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MAXI mock backend"
  });
});

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
    prompt: "What is the vertical acceleration of a projectile near Earth's surface, ignoring air resistance?",
    quizOptions: ["0 m/s^2", "9.8 m/s^2 downward", "9.8 m/s upward", "It changes with speed"],
    quizCorrectAnswer: "9.8 m/s^2 downward",
    shortAcceptedAnswers: ["9.8 m/s^2 downward", "9.8 metres per second squared downward", "g downward", "gravity downward"],
    marks: 1
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
  const isCorrect = acceptedAnswers.includes(normaliseAnswer(userAnswer));

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
      : `A valid answer is ${question.quizCorrectAnswer}.`,
    markBreakdown: []
  };
}

// end point
app.post("/api/grade-answer", (req, res) => {
  const { questionId, questionType, userAnswer, isSkipped } = req.body;

  if (!questionId || !questionType) {
    return res.status(400).json({
      error: "Missing questionId or questionType"
    });
  }

  const question = findQuestionById(questionId);

  if (!question) {
    return res.status(404).json({
      error: "Question not found"
    });
  }

  if (isSkipped) {
  return res.json({
    questionId: question.id,
    questionType,
    userAnswer: "Skipped",
    prompt: question.prompt,
    correctAnswer: question.quizCorrectAnswer,
    status: "skipped",
    isCorrect: false,
    marksAwarded: 0,
    marksAvailable: question.marks || 1,
    percentage: 0,
    feedback: "This question was skipped.",
    markBreakdown: []
  });
}

  let grading;

  if (questionType === "quiz") {
    grading = gradeQuizAnswer(question, userAnswer);
  } else if (questionType === "short") {
    grading = gradeShortAnswer(question, userAnswer);
  } else {
    return res.status(400).json({
      error: "Unsupported questionType"
    });
  }

  res.json({
    questionId: question.id,
    questionType,
    userAnswer,
    prompt: question.prompt,
    ...grading
  });
});

app.listen(PORT, () => {
  console.log(`MAXI mock backend running at http://localhost:${PORT}`);
});