// STORAGE CONFIG
const RESULT_STORAGE_KEY = "maxiResultSnapshot";

// CONFIG
const CONFIG = {
  topicPanelCollapsed: false,
  topicBranchExpanded: true,
  useAIGrading: false,
  modeSelectionPath: "../MAXI_mode/mode.html"
};

const STATES = {
  QUESTION: "QUESTION",
  RESULT: "RESULT"
};

// STATE
const appState = {
  currentState: STATES.QUESTION,
  currentQuestionIndex: 0,
  questions: [],
  answers: [],
  score: 0,
  topicTree: {},
  selectedMode: getModeFromURL(),
  resultSnapshot: [],
  quitModalOpen: false
};

// TOPIC DATA
const rawTopicTree = {
  level1: "Topic",
  children: [
    {
      level2: "Physics",
      children: [
        {
          level3: "Projectile Motion"
        }
      ]
    }
  ]
};

// QUESTION DATA
const rawQuestions = [
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

// QUESTION FACTORY
function createQuestion(raw) {
  return {
    id: raw.id,
    topic: {
      level1: raw.topic.level1,
      level2: raw.topic.level2,
      level3: raw.topic.level3
    },
    prompt: raw.prompt,
    quizOptions: raw.quizOptions.slice(),
    quizCorrectAnswer: raw.quizCorrectAnswer,
    shortAcceptedAnswers: raw.shortAcceptedAnswers.slice(),
    marks: raw.marks
  };
}

function initializeQuestions() {
  appState.topicTree = rawTopicTree;
  appState.questions = rawQuestions.map(createQuestion);
}

// RENDER
function renderApp() {
  const root = document.getElementById("root");

  if (appState.currentState === STATES.RESULT) {
    root.innerHTML = `
      <main class="app-shell">
        <div class="app-grid">
          ${renderResult()}
        </div>
      </main>
    `;
    return;
  }

  root.innerHTML = `
    <main class="app-shell">
      ${renderQuitButton()}
      <div class="app-grid">
        ${renderTopicPanel()}
        ${renderProgress()}
        ${renderCurrentState()}
      </div>
      ${appState.quitModalOpen ? renderQuitModal() : ""}
    </main>
  `;
}

function renderQuitButton() {
  return `
    <button class="quit-button" type="button" data-action="quit-session">
      Quit
    </button>
  `;
}

function renderQuitModal() {
  return `
    <div class="quit-modal-overlay" data-action="quit-modal-overlay">
      <section class="quit-modal-card" role="dialog" aria-modal="true" aria-labelledby="quitModalTitle">
        <h2 id="quitModalTitle" class="quit-modal-title">Quit practice?</h2>
        <p class="quit-modal-message">Are you sure you want to quit this practice session? Your current progress may not be saved.</p>
        <div class="quit-modal-actions">
          <button class="secondary-button" type="button" data-action="close-quit-modal">Cancel</button>
          <button class="quit-confirm-button" type="button" data-action="confirm-quit">Confirm quit</button>
        </div>
      </section>
    </div>
  `;
}

function renderCurrentState() {
  if (appState.currentState === STATES.QUESTION) {
    return renderQuestion();
  }

  return renderResult();
}

function renderTopicPanel() {
  const topicTree = appState.topicTree;
  const physicsTopic = topicTree.children[0];
  const subtopics = physicsTopic.children;
  const isCollapsed = CONFIG.topicPanelCollapsed;

  return `
    <aside class="topic-panel${isCollapsed ? " is-collapsed" : ""}">
      <button class="topic-toggle" type="button" data-action="toggle-topic" aria-expanded="${String(!isCollapsed)}">
        ${isCollapsed ? "Topic: " + escapeHTML(physicsTopic.level2) : escapeHTML(topicTree.level1)}
      </button>
      ${isCollapsed ? "" : `
        <div class="topic-tree">
          <button class="topic-node topic-branch" type="button" data-action="toggle-topic-branch" aria-expanded="${String(CONFIG.topicBranchExpanded)}">
            ${escapeHTML(physicsTopic.level2)}
          </button>
          ${CONFIG.topicBranchExpanded ? `
            <div class="topic-children">
              ${subtopics.map((subtopic) => `
                <div class="topic-node topic-leaf">${escapeHTML(subtopic.level3)}</div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      `}
    </aside>
  `;
}

function renderProgress() {
  if (appState.currentState !== STATES.QUESTION) {
    return "";
  }

  return `
    <div class="progress-card">
      Question ${appState.currentQuestionIndex + 1} / ${appState.questions.length}
    </div>
  `;
}

function renderQuestion() {
  const question = appState.questions[appState.currentQuestionIndex];
  const canMoveNext = hasCurrentAnswer();

  return `
    <section class="exam-card">
      <h1 class="prompt">${escapeHTML(question.prompt)}</h1>
      <div class="response-area">
        <div class="response-header">
          <span class="mode-indicator">${getModeIndicatorText()}</span>
        </div>
        ${renderResponseInput(question)}
      </div>
      <div class="question-actions">
        <button class="secondary-button" type="button" data-action="skip-question">Skip</button>
        <button class="primary-button" type="button" data-action="submit-answer"${canMoveNext ? "" : " disabled"}>
          Next
        </button>
      </div>
    </section>
  `;
}

function renderResponseInput(question) {
  const savedAnswer = getCurrentAnswerValue();

  if (appState.selectedMode === "quiz") {
    return `
      <div class="quiz-options" role="radiogroup" aria-label="Quiz options">
        ${question.quizOptions.map((option, index) => `
          <button class="quiz-option${savedAnswer === option ? " is-selected" : ""}" type="button" data-action="select-quiz" data-answer="${escapeAttribute(option)}" role="radio" aria-checked="${String(savedAnswer === option)}">
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span>${escapeHTML(option)}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  return `
    <textarea class="short-answer" data-action="short-answer" aria-label="Short answer" placeholder="Type your answer here">${escapeHTML(savedAnswer)}</textarea>
  `;
}

function getModeIndicatorText() {
  return appState.selectedMode === "quiz" ? "Current mode: Quiz" : "Current mode: Short answer";
}

function renderResult() {
  return `
    <section class="result-card">
      <h1 class="result-title">Result</h1>
      <p class="result-score">${appState.score} / ${appState.questions.length}</p>
      <button class="primary-button" type="button" data-action="check-result">Check your result</button>
    </section>
  `;
}

function getCurrentTopic() {
  const question = appState.questions[appState.currentQuestionIndex];

  if (question) {
    return question.topic;
  }

  const firstBranch = appState.topicTree.children[0];
  const firstLeaf = firstBranch.children[0];

  return {
    level1: appState.topicTree.level1,
    level2: firstBranch.level2,
    level3: firstLeaf.level3
  };
}

function getCurrentAnswerValue() {
  const answer = appState.answers[appState.currentQuestionIndex];
  return answer ? answer.answer : "";
}

function hasCurrentAnswer() {
  return getCurrentAnswerValue().trim() !== "";
}

function updateNextButtonState() {
  const nextButton = document.querySelector('[data-action="submit-answer"]');

  if (nextButton) {
    nextButton.disabled = !hasCurrentAnswer();
  }
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

// EVENTS
document.getElementById("root").addEventListener("click", handleRootClick);
document.getElementById("root").addEventListener("input", handleRootInput);
document.addEventListener("keydown", handleDocumentKeydown);

function handleRootClick(event) {
  if (event.target.dataset.action === "quit-modal-overlay") {
    closeQuitModal();
    return;
  }

  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action;

  if (action === "toggle-topic") {
    CONFIG.topicPanelCollapsed = !CONFIG.topicPanelCollapsed;
    renderApp();
  }

  if (action === "toggle-topic-branch") {
    CONFIG.topicBranchExpanded = !CONFIG.topicBranchExpanded;
    renderApp();
  }

  if (action === "select-quiz") {
    setCurrentAnswer(actionElement.dataset.answer);
    renderApp();
  }

  if (action === "submit-answer") {
    submitCurrentAnswer();
  }

  if (action === "skip-question") {
    skipCurrentQuestion();
  }

  if (action === "check-result") {
    handleCheckResult();
  }

  if (action === "quit-session") {
    handleQuit();
  }

  if (action === "close-quit-modal") {
    closeQuitModal();
  }

  if (action === "confirm-quit") {
    handleConfirmQuit();
  }
}

function handleRootInput(event) {
  if (event.target.dataset.action === "short-answer") {
    setCurrentAnswer(event.target.value);
    updateNextButtonState();
  }
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && appState.quitModalOpen) {
    closeQuitModal();
  }
}

function setCurrentAnswer(answer) {
  appState.answers[appState.currentQuestionIndex] = {
    questionId: appState.questions[appState.currentQuestionIndex].id,
    answer: answer,
    answerMode: appState.selectedMode,
    isCorrect: false
  };
}

function submitCurrentAnswer() {
  if (!hasCurrentAnswer()) {
    return;
  }

  const question = appState.questions[appState.currentQuestionIndex];
  const answer = getCurrentAnswerValue();
  const isCorrect = evaluateAnswer(question, answer, appState.selectedMode);

  appState.answers[appState.currentQuestionIndex] = {
    questionId: question.id,
    answer: answer,
    answerMode: appState.selectedMode,
    isCorrect: isCorrect
  };
  if (isCorrect) {
    appState.score += question.marks;
  }

  moveToNextQuestion();

  renderApp();
}

function skipCurrentQuestion() {
  const question = appState.questions[appState.currentQuestionIndex];

  appState.answers[appState.currentQuestionIndex] = {
    questionId: question.id,
    answer: "",
    answerMode: appState.selectedMode,
    isCorrect: false
  };
  moveToNextQuestion();
  renderApp();
}

function moveToNextQuestion() {
  if (appState.currentQuestionIndex + 1 >= appState.questions.length) {
    createResultSnapshot();
    appState.currentState = STATES.RESULT;
  } else {
    appState.currentQuestionIndex += 1;
  }
}

function handleCheckResult() {
  handleOpenExplainPage();
}

function handleOpenExplainPage() {
  const snapshot = getFrozenResultSnapshot();

  localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(snapshot));
  window.location.href = "../MAXI_explain/explain.html";
}

function handleQuit() {
  openQuitModal();
}

function openQuitModal() {
  appState.quitModalOpen = true;
  renderApp();
}

function closeQuitModal() {
  appState.quitModalOpen = false;
  renderApp();
}

function handleConfirmQuit() {
  const shouldQuit = true;

  if (shouldQuit) {
    // TODO: connect this to the mode selection page later
    window.location.href = CONFIG.modeSelectionPath;
  }
}

// EVALUATION
function evaluateAnswer(question, answer, answerMode) {
  if (answerMode === "quiz") {
    return gradeQuizAnswer(question, answer);
  }

  return gradeShortAnswer(question, answer);
}

function gradeQuizAnswer(question, answer) {
  return normalizeAnswer(answer) === normalizeAnswer(question.quizCorrectAnswer);
}

function gradeShortAnswer(question, answer) {
  if (CONFIG.useAIGrading) {
    return gradeShortAnswerWithAPI(question, answer);
  }

  return gradeShortAnswerLocally(question, answer);
}

function gradeShortAnswerLocally(question, answer) {
  return question.shortAcceptedAnswers.some((acceptedAnswer) => {
    return normalizeAnswer(answer) === normalizeAnswer(acceptedAnswer);
  });
}

function gradeShortAnswerWithAPI(question, answer) {
  // Future API grading placeholder.
  // This public MVP keeps API grading disabled by default.
  // For now, it safely falls back to local grading.
  return gradeShortAnswerLocally(question, answer);
}

function normalizeAnswer(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function getModeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");

  if (mode === "quiz" || mode === "short") {
    return mode;
  }

  return "short";
}

function createResultSnapshot() {
  appState.resultSnapshot = Object.freeze(appState.questions.map((question, index) => {
    const savedAnswer = appState.answers[index];
    const questionType = appState.selectedMode;
    const isSkipped = !savedAnswer || normalizeAnswer(savedAnswer.answer) === "";
    const isCorrect = !isSkipped && evaluateAnswer(question, savedAnswer.answer, questionType);

    return Object.freeze({
      questionId: question.id,
      questionNumber: index + 1,
      questionText: question.prompt,
      questionType: questionType,
      userAnswer: isSkipped ? "Skipped" : savedAnswer.answer,
      correctAnswer: questionType === "quiz" ? question.quizCorrectAnswer : question.shortAcceptedAnswers[0],
      status: isSkipped ? "skipped" : isCorrect ? "correct" : "incorrect",
      aiExplanation: ""
    });
  }));
}

function getFrozenResultSnapshot() {
  return appState.resultSnapshot;
}

// API PLACEHOLDERS
async function loadQuestionsFromAPI() {}

async function loadTopicTreeFromAPI() {}

async function saveAttemptToAPI() {}

async function getAIExplanationFromAPI() {}

initializeQuestions();
renderApp();