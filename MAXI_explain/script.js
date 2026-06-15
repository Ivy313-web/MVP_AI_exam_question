// STORAGE / NAVIGATION CONFIG
const RESULT_STORAGE_KEY = "maxiResultSnapshot";
const QUESTION_PAGE_URL = "../MAXI_question/main.html";

// STATE
const STATES = {
  EXPLAIN: "EXPLAIN",
  FINAL: "FINAL",
  EMPTY: "EMPTY"
};

const appState = {
  currentState: STATES.EXPLAIN,
  results: []
};

// SAMPLE DATA
const sampleResults = Object.freeze([
  Object.freeze({
    id: "q1",
    questionNumber: 1,
    questionText: "Which component of velocity remains constant in ideal projectile motion when air resistance is ignored?",
    questionType: "quiz",
    generatedParams: Object.freeze({}),
    userAnswer: "Horizontal velocity",
    correctAnswer: "Horizontal velocity",
    isCorrect: true,
    status: "Correct",
    topic: "Projectile Motion",
    subject: "Physics",
    aiExplanation: ""
  }),
  Object.freeze({
    id: "q2",
    questionNumber: 2,
    questionText: "What is the vertical acceleration of a projectile near Earth's surface, ignoring air resistance?",
    questionType: "short",
    generatedParams: Object.freeze({}),
    userAnswer: "0 m/s^2",
    correctAnswer: "9.8 m/s^2 downward",
    isCorrect: false,
    status: "Incorrect",
    topic: "Projectile Motion",
    subject: "Physics",
    aiExplanation: ""
  }),
  Object.freeze({
    id: "q3",
    questionNumber: 3,
    questionText: "At the highest point of a projectile's path, what is its vertical velocity?",
    questionType: "quiz",
    generatedParams: Object.freeze({}),
    userAnswer: "",
    correctAnswer: "Zero",
    isCorrect: false,
    status: "Skipped",
    topic: "Projectile Motion",
    subject: "Physics",
    aiExplanation: ""
  })
]);

// DATA SOURCE LAYER
// DATA SOURCE LAYER
function loadResultsFromV1Source() {
  const savedSnapshot = localStorage.getItem(RESULT_STORAGE_KEY);

  if (savedSnapshot) {
    try {
      const parsedSnapshot = JSON.parse(savedSnapshot);

      if (Array.isArray(parsedSnapshot)) {
        return parsedSnapshot.map(convertV1SnapshotToExplainResult);
      }
    } catch (error) {
      console.error("Failed to parse saved MAXI result snapshot:", error);
    }
  }

  return [];
}

function convertV1SnapshotToExplainResult(snapshotItem) {
  const status = formatStatusForExplainPage(snapshotItem.status);

  return Object.freeze({
    id: snapshotItem.questionId,
    questionNumber: snapshotItem.questionNumber,
    questionText: snapshotItem.questionText,
    questionType: snapshotItem.questionType,
    generatedParams: Object.freeze({}),
    userAnswer: snapshotItem.userAnswer,
    correctAnswer: snapshotItem.correctAnswer,
    isCorrect: snapshotItem.status === "correct",
    status: status,
    topic: "Projectile Motion",
    subject: "Physics",
    aiExplanation: snapshotItem.aiExplanation || ""
  });
}

function formatStatusForExplainPage(status) {
  if (status === "correct") {
    return "Correct";
  }

  if (status === "incorrect") {
    return "Incorrect";
  }

  if (status === "skipped") {
    return "Skipped";
  }

  return "Skipped";
}

// AI PLACEHOLDER LAYER
function requestAIExplanation(questionResult) {
  if (questionResult.status === "Correct") {
    return "Your answer is correct. You understood the key idea for this question.";
  }

  if (questionResult.status === "Incorrect") {
    return "Your answer does not match the expected answer. Compare your response with the correct answer and review the key idea tested in this question.";
  }

  if (questionResult.status === "Skipped") {
    return "You skipped this question. Try it again and focus on the correct answer shown above.";
  }

  return "Review your answer and compare it with the correct answer shown above.";
}
function requestAllAIExplanations(results) {
  return results.map(result => Object.freeze({
    ...result,
    aiExplanation: requestAIExplanation(result)
  }));
}

// RENDER LAYER
function renderApp() {
  const root = document.getElementById("root");

  root.innerHTML = `
    <main class="app-shell">
      ${appState.currentState === STATES.EXPLAIN ? renderExplainPage(appState.results) : renderFinalActionPage()}
    </main>
  `;
}

function renderExplainPage(results) {
  return `
    <section class="review-page">
      <header>
        <p class="page-eyebrow">Explain review</p>
        <h1 class="page-title">Check your answers</h1>
        <p class="page-intro">Review every question and explanation before completing this attempt.</p>
      </header>
      <div class="review-list">
        ${results.map(result => renderReviewCard(result)).join("")}
      </div>
      <div class="page-actions">
        <button class="primary-button" type="button" data-action="next">Next</button>
      </div>
    </section>
  `;
}

function renderReviewCard(result) {
  const statusClass = result.status.toLowerCase();
  const displayedUserAnswer = result.status === "Skipped" ? "Skipped" : result.userAnswer;

  return `
    <article class="review-card review-card--${statusClass}">
      <div class="review-card-header">
        <p class="question-number">Question ${result.questionNumber}</p>
        <span class="status-label status-label--${statusClass}">${escapeHTML(result.status)}</span>
      </div>
      <h2 class="question-text">${escapeHTML(result.questionText)}</h2>
      <dl class="review-details">
        <div class="review-detail answer-comparison">
          <div class="answer-line">
            <dt>Your answer:</dt>
            <dd>${escapeHTML(displayedUserAnswer)}</dd>
          </div>
          <div class="answer-line">
            <dt>Correct answer:</dt>
            <dd>${escapeHTML(result.correctAnswer)}</dd>
          </div>
        </div>
        <div class="review-detail ai-explanation">
          <dt>AI explain</dt>
          <dd>${escapeHTML(result.aiExplanation)}</dd>
        </div>
      </dl>
    </article>
  `;
}

//google form
function renderFinalActionPage() {
  return `
    <section class="final-card">
      <div>
        <h1 class="final-title">Review completed</h1>
        <p class="final-copy">
          You have finished reviewing your answers. Click "Finish" to give feedback on this MVP.
        </p>
      </div>
      <div class="final-actions">
        <button class="secondary-button final-action-button try-again-button" type="button" data-action="try-again">Try again</button>
        <button class="primary-button final-action-button" type="button" data-action="finish">Finish</button>
      </div>
    </section>
  `;
}
// function renderFinalActionPage() {
//   return `
//     <section class="final-card">
//       <div>
//         <h1 class="final-title">Review completed</h1>
//         <p class="final-copy">You have finished reviewing your answers.</p>
//       </div>
//       <div class="final-actions">
//         <button class="secondary-button final-action-button try-again-button" type="button" data-action="try-again">Try again</button>
//         <button class="primary-button final-action-button" type="button" data-action="finish">Finish</button>
//       </div>
//     </section>
//   `;
// }

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// EVENTS
document.getElementById("root").addEventListener("click", handleRootClick);

function clearSavedResultSnapshot() {
  localStorage.removeItem(RESULT_STORAGE_KEY);
}

function goToQuestionPage() {
  window.location.href = QUESTION_PAGE_URL;
}

function handleRootClick(event) {
  const actionElement = event.target.closest("[data-action]");

  if (!actionElement) {
    return;
  }

  if (actionElement.dataset.action === "next") {
    appState.currentState = STATES.FINAL;
    renderApp();
  }

  if (actionElement.dataset.action === "try-again") {
    handleTryAgain();
  }

  if (actionElement.dataset.action === "finish") {
    handleFinish();
  }
}

function handleTryAgain() {
  clearSavedResultSnapshot();
  goToQuestionPage();
}

//google form
function handleFinish() {
  clearSavedResultSnapshot();
  window.location.href = "https://docs.google.com/forms/d/e/1FAIpQLSffiKG4zwrWRUN21fPT3O7xyWFL55ZUvTFtmY4fAMVKhydynA/viewform";
}
// function handleFinish() {
//   clearSavedResultSnapshot();
// }
// INIT
function initializeApp() {
  const sourceResults = loadResultsFromV1Source();

  if (sourceResults.length === 0) {
    appState.currentState = STATES.EMPTY;
    appState.results = [];
    renderApp();
    return;
  }

  appState.currentState = STATES.EXPLAIN;
  appState.results = requestAllAIExplanations(sourceResults);
  renderApp();
}

initializeApp();
