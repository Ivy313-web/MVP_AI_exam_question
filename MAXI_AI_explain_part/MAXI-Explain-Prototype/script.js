// STATE
const STATES = {
  EXPLAIN: "EXPLAIN",
  FINAL: "FINAL"
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
function loadResultsFromV1Source() {
  // Future integration point for reading or importing MAXI V1 frozen result objects.
  return sampleResults;
}

// AI PLACEHOLDER LAYER
function requestAIExplanation(questionResult) {
  return "AI explanation will appear here in a future version.";
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

function renderFinalActionPage() {
  return `
    <section class="final-card">
      <div>
        <h1 class="final-title">Review completed</h1>
        <p class="final-copy">You have finished reviewing your answers.</p>
      </div>
      <div class="final-actions">
        <button class="secondary-button final-action-button try-again-button" type="button" data-action="try-again">Try again</button>
        <button class="primary-button final-action-button" type="button" data-action="finish">Finish</button>
      </div>
    </section>
  `;
}

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

function handleTryAgain() {}

function handleFinish() {}

// INIT
function initializeApp() {
  const sourceResults = loadResultsFromV1Source();
  appState.results = requestAllAIExplanations(sourceResults);
  renderApp();
}

initializeApp();
