// STORAGE CONFIG
const RESULT_STORAGE_KEY = "maxiResultSnapshot";

// CONFIG
const CONFIG = {
  topicPanelCollapsed: false,
  topicBranchExpanded: true,
  modeSelectionPath: "../MAXI_mode/mode.html",
  mockBackendURL: "http://localhost:3000"
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
  attemptId: crypto.randomUUID(),
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

// QUESTION DATA SOURCE
async function loadQuestionsFromBackend() {
  const response = await fetch(`${CONFIG.mockBackendURL}/api/questions`);

  if (!response.ok) {
    throw new Error(`Failed to load questions from backend with status ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data.questions)) {
    throw new Error("Backend questions response is missing a questions array");
  }

  return data.questions;
}

async function initializeQuestions() {
  appState.topicTree = rawTopicTree;
  appState.questions = await loadQuestionsFromBackend();
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

async function submitAnswerToBackend(question, answer, isSkipped = false) {
  const response = await fetch(`${CONFIG.mockBackendURL}/api/grade-answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attemptId: appState.attemptId,
      questionId: question.id,
      questionType: appState.selectedMode,
      userAnswer: isSkipped ? "Skipped" : answer,
      isSkipped: isSkipped
    })
  });

  if (!response.ok) {
    throw new Error(`Backend grading failed with status ${response.status}`);
  }

  return await response.json();
}

async function finalizeAttemptWithBackend() {
  const response = await fetch(`${CONFIG.mockBackendURL}/api/finalize-attempt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attemptId: appState.attemptId
    })
  });

  if (!response.ok) {
    throw new Error(`Backend finalize failed with status ${response.status}`);
  }

  return await response.json();
}

function applyFinalAttemptResults(finalAttempt) {
  if (!Array.isArray(finalAttempt.results)) {
    throw new Error("Final attempt response is missing results array");
  }

  appState.answers = appState.questions.map((question) => {
    const grading = finalAttempt.results.find((result) => {
      return result.questionId === question.id;
    });

    if (!grading) {
      return {
        questionId: question.id,
        answer: "",
        answerMode: appState.selectedMode,
        isCorrect: false,
        status: "skipped",
        correctAnswer: "",
        marksAwarded: 0,
        marksAvailable: question.marks || 0,
        percentage: 0,
        markBreakdown: [],
        feedback: ""
      };
    }

    return {
      questionId: question.id,
      answer: grading.userAnswer,
      answerMode: appState.selectedMode,
      isCorrect: grading.isCorrect,
      status: grading.status,
      correctAnswer: grading.correctAnswer,
      marksAwarded: grading.marksAwarded,
      marksAvailable: grading.marksAvailable,
      percentage: grading.percentage,
      markBreakdown: grading.markBreakdown || [],
      feedback: grading.feedback || ""
    };
  });

  appState.score = appState.answers.reduce((total, answer) => {
    return total + (answer.marksAwarded || 0);
  }, 0);
}

async function finalizeAttemptBeforeResult() {
  const finalAttempt = await finalizeAttemptWithBackend();

  applyFinalAttemptResults(finalAttempt);

  createResultSnapshot();
}

async function submitCurrentAnswer() {
  if (!hasCurrentAnswer()) {
    return;
  }

  const question = appState.questions[appState.currentQuestionIndex];
  const answer = getCurrentAnswerValue();

  try {
    const grading = await submitAnswerToBackend(question, answer);

    appState.answers[appState.currentQuestionIndex] = {
      questionId: question.id,
      answer: grading.userAnswer,
      answerMode: appState.selectedMode,
      isCorrect: grading.isCorrect,
      status: grading.status,
      correctAnswer: grading.correctAnswer,
      marksAwarded: grading.marksAwarded,
      marksAvailable: grading.marksAvailable,
      percentage: grading.percentage,
      markBreakdown: grading.markBreakdown || [],
      feedback: grading.feedback || ""
    };

    appState.score += grading.marksAwarded || 0;

    await moveToNextQuestion();
    renderApp();
  } catch (error) {
    console.error("Failed to submit answer to backend:", error);
  }
}

async function skipCurrentQuestion() {
  const question = appState.questions[appState.currentQuestionIndex];

  try {
    const grading = await submitAnswerToBackend(question, "", true);

    appState.answers[appState.currentQuestionIndex] = {
      questionId: question.id,
      answer: "",
      answerMode: appState.selectedMode,
      isCorrect: false,
      status: grading.status || "skipped",
      correctAnswer: grading.correctAnswer,
      marksAwarded: grading.marksAwarded || 0,
      marksAvailable: grading.marksAvailable,
      percentage: grading.percentage || 0,
      markBreakdown: grading.markBreakdown || [],
      feedback: grading.feedback || ""
    };

    await moveToNextQuestion();
    renderApp();
  } catch (error) {
    console.error("Failed to skip question through backend:", error);
  }
}

async function moveToNextQuestion() {
  if (appState.currentQuestionIndex + 1 >= appState.questions.length) {
    await finalizeAttemptBeforeResult();
    appState.currentState = STATES.RESULT;
  } else {
    appState.currentQuestionIndex += 1;
  }
}

function handleCheckResult() {
  if (!appState.resultSnapshot.length) {
    console.error("Result snapshot is missing. Attempt may not have been finalized.");
    return;
  }

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
    const savedAnswer = appState.answers.find((answer) => {
      return answer.questionId === question.id;
    });

    const questionType = appState.selectedMode;
    const isSkipped = !savedAnswer || savedAnswer.status === "skipped";

    const snapshotItem = {
      questionId: question.id,
      questionNumber: index + 1,
      questionText: question.prompt,
      questionType: questionType,
      userAnswer: isSkipped ? "Skipped" : savedAnswer.answer,
      correctAnswer: savedAnswer ? savedAnswer.correctAnswer : "",
      status: savedAnswer ? savedAnswer.status : "skipped",
      aiExplanation: savedAnswer?.feedback || "",
      marksAwarded: savedAnswer?.marksAwarded || 0,
      marksAvailable: savedAnswer?.marksAvailable || question.marks || 0,
      percentage: savedAnswer?.percentage || 0,
      markBreakdown: savedAnswer?.markBreakdown || []
    };

    return Object.freeze(snapshotItem);
  }));
}
function getFrozenResultSnapshot() {
  return appState.resultSnapshot;
}

// API PLACEHOLDERS

async function loadTopicTreeFromAPI() {}

async function saveAttemptToAPI() {}

async function getAIExplanationFromAPI() {}

async function init() {
  try {
    // test
    console.log("Attempt ID:", appState.attemptId);

    await initializeQuestions();
    renderApp();
  } catch (error) {
    console.error("Failed to initialise MAXI Question Part:", error);

    const root = document.getElementById("root");
    root.innerHTML = `
      <main class="app-shell">
        <section class="exam-card">
          <h1 class="prompt">Unable to load questions</h1>
          <p>Please make sure the backend server is running at ${escapeHTML(CONFIG.mockBackendURL)}.</p>
        </section>
      </main>
    `;
  }
}

init();