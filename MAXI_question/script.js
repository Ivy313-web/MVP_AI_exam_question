// STORAGE CONFIG
const RESULT_STORAGE_KEY = "maxiResultSnapshot";

// CONFIG
const CONFIG = {
  topicPanelCollapsed: false,
  topicBranchExpanded: false,
  homePagePath: "../MAXI_home/home.html",
  sharedTopicsPath: "../shared/topics.json",
   mockBackendURL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : "https://maxi-backend-vnkw.onrender.com"
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
  totalMarksAvailable: 0,
  isSubmitting: false,
  errorMessage: "",
  topicTree: {},
  selectedSubjectId: "",
  selectedLevelId: "",
  selectedTopicId: "",
  selectedTopicName: "",
  pendingTopicId: "",
  pendingTopicName: "",
  topicChangeModalOpen: false,
  isLoadingQuestions: true,
  loadingMessage: "Loading your practice...",
  selectedMode: getModeFromURL(),
  attemptId: crypto.randomUUID(),
  resultSnapshot: [],
  quitModalOpen: false
};

// TOPIC DATA

function getPracticeSelectionFromURL() {
  const params = new URLSearchParams(window.location.search);

  return {
    subjectId: params.get("subject") || "",
    levelId: params.get("level") || "",
    topicId: params.get("topic") || ""
  };
}

async function loadSharedTopicsData() {
  const response = await fetch(CONFIG.sharedTopicsPath);

  if (!response.ok) {
    throw new Error(
      `Failed to load shared topics data with status ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.subjects)) {
    throw new Error("Shared topics data is missing a subjects array");
  }

  return data;
}

function buildTopicTreeFromSharedData(data, requestedSelection) {
  const defaultSubject = data.subjects[0];

  const selectedSubject =
    data.subjects.find((subject) => {
      return subject.id === requestedSelection.subjectId;
    }) || defaultSubject;

  const defaultLevel = selectedSubject?.levels?.[0];

  const selectedLevel =
    selectedSubject?.levels?.find((level) => {
      return level.id === requestedSelection.levelId;
    }) || defaultLevel;

  const defaultTopic = selectedLevel?.topics?.[0];

  const selectedTopic =
    selectedLevel?.topics?.find((topic) => {
      return topic.id === requestedSelection.topicId;
    }) || defaultTopic;

  if (!selectedSubject || !selectedLevel || !selectedTopic) {
    throw new Error("Unable to resolve the selected practice topic");
  }

  appState.selectedSubjectId = selectedSubject.id;
  appState.selectedLevelId = selectedLevel.id;
  appState.selectedTopicId = selectedTopic.id;
  appState.selectedTopicName = selectedTopic.name;

  return {
    level1: "Topic",
    children: [
      {
        id: selectedSubject.id,
        level2: selectedSubject.name,
        levelName: selectedLevel.name,
        children: selectedLevel.topics.map((topic) => {
          return {
            id: topic.id,
            level3: topic.name
          };
        })
      }
    ]
  };
}

// QUESTION DATA SOURCE
async function loadQuestionsFromBackend(topicName) {
  const params = new URLSearchParams({
    mix: "half",
    limit: "10",
    mode: appState.selectedMode,
    topic: topicName
  });

  const response = await fetch(
    `${CONFIG.mockBackendURL}/api/questions?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load questions from backend with status ${response.status}`
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.questions)) {
    throw new Error("Backend questions response is missing a questions array");
  }

  if (data.questions.length === 0) {
    throw new Error(`No questions were found for ${topicName}`);
  }

  return data.questions;
}

async function initializeQuestions() {
  appState.isLoadingQuestions = true;
  appState.loadingMessage = "Loading your practice...";

  const requestedSelection = getPracticeSelectionFromURL();
  const sharedTopicsData = await loadSharedTopicsData();

  appState.topicTree = buildTopicTreeFromSharedData(
    sharedTopicsData,
    requestedSelection
  );

  appState.questions = await loadQuestionsFromBackend(
    appState.selectedTopicName
  );

  appState.isLoadingQuestions = false;
}

// RENDER

function renderTopicChangeModal() {
  return `
    <div class="quit-modal-overlay" data-action="topic-modal-overlay">
      <section
        class="quit-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topicChangeModalTitle"
      >
        <h2 id="topicChangeModalTitle" class="quit-modal-title">
          Change topic?
        </h2>

        <p class="quit-modal-message">
          Are you sure you want to switch to
          <strong>${escapeHTML(appState.pendingTopicName)}</strong>?
          Your current practice progress will be cleared.
        </p>

        <div class="quit-modal-actions">
          <button
            class="secondary-button"
            type="button"
            data-action="cancel-topic-change"
          >
            Cancel
          </button>

          <button
            class="quit-confirm-button"
            type="button"
            data-action="confirm-topic-change"
          >
            Change topic
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderLoadingPage() {
  return `
    <main class="app-shell loading-page-shell">
      <section class="loading-card" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <h1 class="loading-title">${escapeHTML(appState.loadingMessage)}</h1>
        <p class="loading-description">
          Please wait while MAXI prepares your questions.
        </p>
      </section>
    </main>
  `;
}

function renderApp() {
  const root = document.getElementById("root");

  if (appState.isLoadingQuestions) {
    root.innerHTML = renderLoadingPage();
    return;
  }

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
      ${appState.topicChangeModalOpen ? renderTopicChangeModal() : ""}
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

function handleTopicSelection(topicId, topicName) {
  if (!topicId || !topicName) {
    return;
  }

  if (topicId === appState.selectedTopicId) {
    return;
  }

  appState.pendingTopicId = topicId;
  appState.pendingTopicName = topicName;
  appState.topicChangeModalOpen = true;

  renderApp();
}

function closeTopicChangeModal() {
  appState.topicChangeModalOpen = false;
  appState.pendingTopicId = "";
  appState.pendingTopicName = "";

  renderApp();
}

async function confirmTopicChange() {
  if (
    !appState.pendingTopicId ||
    !appState.pendingTopicName ||
    appState.isLoadingQuestions
  ) {
    return;
  }

  const nextTopicId = appState.pendingTopicId;
  const nextTopicName = appState.pendingTopicName;

  appState.topicChangeModalOpen = false;
  appState.pendingTopicId = "";
  appState.pendingTopicName = "";

  appState.isLoadingQuestions = true;
  appState.loadingMessage = `Loading ${nextTopicName}...`;
  renderApp();

  try {
    const newQuestions = await loadQuestionsFromBackend(nextTopicName);

    appState.selectedTopicId = nextTopicId;
    appState.selectedTopicName = nextTopicName;
    appState.questions = newQuestions;

    resetPracticeForNewTopic();
    updateTopicInURL(nextTopicId);
  } catch (error) {
    console.error("Failed to change topic:", error);

    appState.errorMessage =
      `Unable to load questions for ${nextTopicName}. Please try again.`;
  } finally {
    appState.isLoadingQuestions = false;
    renderApp();
  }
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
  const subjectBranch = topicTree.children[0];
  const subtopics = subjectBranch.children;
  const isCollapsed = CONFIG.topicPanelCollapsed;

  return `
    <aside class="topic-panel${isCollapsed ? " is-collapsed" : ""}">
      <button
        class="topic-toggle"
        type="button"
        data-action="toggle-topic"
        aria-expanded="${String(!isCollapsed)}"
      >
        ${
          isCollapsed
            ? "Topic: " + escapeHTML(subjectBranch.level2)
            : escapeHTML(topicTree.level1)
        }
      </button>

      ${
        isCollapsed
          ? ""
          : `
            <div class="topic-tree">
              <button
                class="topic-node topic-branch"
                type="button"
                data-action="toggle-topic-branch"
                aria-expanded="${String(CONFIG.topicBranchExpanded)}"
              >
                <span>${escapeHTML(subjectBranch.level2)}</span>
                <span class="topic-branch-level">
                  ${escapeHTML(subjectBranch.levelName)}
                </span>
              </button>

              ${
                CONFIG.topicBranchExpanded
                  ? `
                    <div class="topic-children">
                      ${subtopics
                        .map((subtopic) => {
                          const isSelected =
                            subtopic.id === appState.selectedTopicId;

                         return `
                          <button
                            class="topic-node topic-leaf${
                              isSelected ? " is-selected-topic" : ""
                            }"
                            type="button"
                            data-action="select-topic"
                            data-topic-id="${escapeAttribute(subtopic.id)}"
                            data-topic-name="${escapeAttribute(subtopic.level3)}"
                            aria-current="${isSelected ? "true" : "false"}"
                          >
                            ${escapeHTML(subtopic.level3)}
                          </button>
                        `;
                        })
                        .join("")}
                    </div>
                  `
                  : ""
              }
            </div>
          `
      }
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

function formatGivenValueLabel(key) {
  const labels = {
    forceN: "Force / N",
    massKg: "Mass / kg",
    accelerationMs2: "Acceleration / m/s²"
  };

  return labels[key] || key;
}

function formatQuestionPrompt(question) {
  if (appState.selectedMode === "quiz") {
    return question.prompt;
  }

  const marks = Number.isInteger(question.marks) && question.marks > 0
    ? question.marks
    : 1;

  return `${question.prompt}      [${marks}]`;
}

function renderQuestion() {
  const question = appState.questions[appState.currentQuestionIndex];
  const canMoveNext = hasCurrentAnswer() && !appState.isSubmitting;

  return `
    <section class="exam-card">
      <h1 class="prompt">${escapeHTML(formatQuestionPrompt(question))}</h1>

      ${appState.errorMessage ? `
        <div class="error-message">
          ${escapeHTML(appState.errorMessage)}
        </div>
      ` : ""}

      <div class="response-area">
        <div class="response-header">
          <span class="mode-indicator">${getModeIndicatorText()}</span>
        </div>
        ${renderResponseInput(question)}
      </div>

      <div class="question-actions">
        <button class="secondary-button" type="button" data-action="skip-question"${appState.isSubmitting ? " disabled" : ""}>
          Skip
        </button>
        <button class="primary-button" type="button" data-action="submit-answer"${canMoveNext ? "" : " disabled"}>
          ${appState.isSubmitting ? "Checking..." : "Next"}
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
          <button class="quiz-option${savedAnswer === option ? " is-selected" : ""}" type="button" data-action="select-quiz" data-answer="${escapeAttribute(option)}" role="radio" aria-checked="${String(savedAnswer === option)}"${appState.isSubmitting ? " disabled" : ""}>
            <span class="option-letter">${String.fromCharCode(65 + index)}</span>
            <span>${escapeHTML(option)}</span>
          </button>
        `).join("")}
      </div>
    `;
  }

  return `
    <textarea class="short-answer" data-action="short-answer" aria-label="Short answer" placeholder="Type your answer here"${appState.isSubmitting ? " disabled" : ""}>${escapeHTML(savedAnswer)}</textarea>
  `;
}

function getModeIndicatorText() {
  return appState.selectedMode === "quiz" ? "Current mode: Quiz" : "Current mode: Short answer";
}

function renderResult() {
  const scoreText = appState.selectedMode === "short"
    ? `${appState.totalMarksAvailable > 0
        ? Math.round((appState.score / appState.totalMarksAvailable) * 100)
        : 0}%`
    : `${appState.score} / ${appState.questions.length}`;

  return `
    <section class="result-card">
      <h1 class="result-title">Result</h1>
      <p class="result-score">${scoreText}</p>
      <button class="primary-button" type="button" data-action="check-result">Check your result</button>
    </section>
  `;
}

function resetPracticeForNewTopic() {
  appState.currentState = STATES.QUESTION;
  appState.currentQuestionIndex = 0;
  appState.answers = [];
  appState.score = 0;
  appState.totalMarksAvailable = 0;
  appState.isSubmitting = false;
  appState.errorMessage = "";
  appState.attemptId = crypto.randomUUID();
  appState.resultSnapshot = [];
}

function updateTopicInURL(topicId) {
  const params = new URLSearchParams(window.location.search);

  params.set("subject", appState.selectedSubjectId);
  params.set("level", appState.selectedLevelId);
  params.set("topic", topicId);
  params.set("mode", appState.selectedMode);

  const newURL = `${window.location.pathname}?${params.toString()}`;

  window.history.replaceState({}, "", newURL);
}

function getCurrentTopic() {
  const subjectBranch = appState.topicTree.children[0];

  const selectedLeaf =
    subjectBranch.children.find((topic) => {
      return topic.id === appState.selectedTopicId;
    }) || subjectBranch.children[0];

  return {
    level1: appState.topicTree.level1,
    level2: subjectBranch.level2,
    level3: selectedLeaf?.level3 || ""
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
    nextButton.disabled = !hasCurrentAnswer() || appState.isSubmitting;
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

  if (event.target.dataset.action === "topic-modal-overlay") {
    closeTopicChangeModal();
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
  if (action === "select-topic") {
    handleTopicSelection(
      actionElement.dataset.topicId,
      actionElement.dataset.topicName
    );
  }

  if (action === "cancel-topic-change") {
    closeTopicChangeModal();
  }

  if (action === "confirm-topic-change") {
    confirmTopicChange();
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
  if (event.key !== "Escape") {
    return;
  }

  if (appState.quitModalOpen) {
    closeQuitModal();
    return;
  }

  if (appState.topicChangeModalOpen) {
    closeTopicChangeModal();
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

  if (appState.selectedMode === "quiz") {
    appState.score = appState.answers.reduce((total, answer) => {
      return total + (answer.isCorrect ? 1 : 0);
    }, 0);

    appState.totalMarksAvailable = appState.questions.length;
  } else {
    const summary = finalAttempt.summary || {};

    appState.score = typeof summary.totalMarksAwarded === "number"
      ? summary.totalMarksAwarded
      : appState.answers.reduce((total, answer) => {
          return total + (answer.marksAwarded || 0);
        }, 0);

    appState.totalMarksAvailable = typeof summary.totalMarksAvailable === "number"
      ? summary.totalMarksAvailable
      : appState.answers.reduce((total, answer) => {
          return total + (answer.marksAvailable || 0);
        }, 0);
  }
}

async function finalizeAttemptBeforeResult() {
  const finalAttempt = await finalizeAttemptWithBackend();

  applyFinalAttemptResults(finalAttempt);

  createResultSnapshot();
}

async function submitCurrentAnswer() {
  if (!hasCurrentAnswer() || appState.isSubmitting) {
    return;
  }

  const question = appState.questions[appState.currentQuestionIndex];
  const answer = getCurrentAnswerValue();

  appState.isSubmitting = true;
  appState.errorMessage = "";
  renderApp();

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

    await moveToNextQuestion();
  } catch (error) {
    console.error("Failed to submit answer to backend:", error);
    appState.errorMessage = "Unable to check this answer. Please make sure the backend is running and try again.";
  } finally {
    appState.isSubmitting = false;
    renderApp();
  }
}

async function skipCurrentQuestion() {
  if (appState.isSubmitting) {
    return;
  }

  const question = appState.questions[appState.currentQuestionIndex];

  appState.isSubmitting = true;
  appState.errorMessage = "";
  renderApp();

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
  } catch (error) {
    console.error("Failed to skip question through backend:", error);
    appState.errorMessage = "Unable to skip this question. Please make sure the backend is running and try again.";
  } finally {
    appState.isSubmitting = false;
    renderApp();
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
    window.location.href = CONFIG.homePagePath;
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
    console.log("MAXI Question UI version: v0.6.3-topic-switch");

    console.log("Attempt ID:", appState.attemptId);

    appState.isLoadingQuestions = true;
    appState.loadingMessage = "Loading your practice...";
    renderApp();

    await initializeQuestions();

    appState.isLoadingQuestions = false;
    renderApp();
  } catch (error) {
    console.error("Failed to initialise MAXI Question Part:", error);

    appState.isLoadingQuestions = false;

    const root = document.getElementById("root");

    root.innerHTML = `
      <main class="app-shell">
        <section class="exam-card">
          <h1 class="prompt">Unable to load questions</h1>
          <p>
            MAXI could not find valid questions for the selected topic.
            Please return to the home page and choose another topic.
          </p>
          <button
            class="primary-button"
            type="button"
            onclick="window.location.href='${escapeAttribute(CONFIG.homePagePath)}'"
          >
            Return home
          </button>
        </section>
      </main>
    `;
  }
}

init();