const TOPICS_DATA_PATH = "../shared/topics.json";
const MODE_PAGE_PATH = "../MAXI_mode/mode.html";

const placeholderButtons = document.querySelectorAll(".placeholder-action");
const toast = document.querySelector("[data-toast]");

const subjectSelect = document.getElementById("subjectSelect");
const levelSelect = document.getElementById("levelSelect");
const topicSelect = document.getElementById("topicSelect");
const startPracticeButton = document.getElementById("startPracticeButton");

const assistantMessages = [];
const assistantApiEndpoint = "";

let toastTimer;
let sharedTopicsData = null;

function showPlaceholderMessage() {
  if (!toast) {
    return;
  }

  toast.hidden = false;
  window.clearTimeout(toastTimer);

  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}

placeholderButtons.forEach((button) => {
  button.addEventListener("click", showPlaceholderMessage);
});

async function loadSharedTopicsData() {
  const response = await fetch(TOPICS_DATA_PATH);

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

function fillSelect(selectElement, items) {
  selectElement.innerHTML = "";

  items.forEach((item) => {
    const option = document.createElement("option");

    option.value = item.id;
    option.textContent = item.name;

    selectElement.appendChild(option);
  });
}

function getSelectedSubject() {
  return sharedTopicsData.subjects.find((subject) => {
    return subject.id === subjectSelect.value;
  });
}

function getSelectedLevel() {
  const selectedSubject = getSelectedSubject();

  return selectedSubject?.levels.find((level) => {
    return level.id === levelSelect.value;
  });
}

function updateLevelOptions() {
  const selectedSubject = getSelectedSubject();

  fillSelect(levelSelect, selectedSubject?.levels || []);
  updateTopicOptions();
}

function updateTopicOptions() {
  const selectedLevel = getSelectedLevel();

  fillSelect(topicSelect, selectedLevel?.topics || []);
}

function handleStartPractice() {
  const subjectId = subjectSelect.value;
  const levelId = levelSelect.value;
  const topicId = topicSelect.value;

  if (!subjectId || !levelId || !topicId) {
    return;
  }

  const params = new URLSearchParams({
    subject: subjectId,
    level: levelId,
    topic: topicId
  });

  window.location.href = `${MODE_PAGE_PATH}?${params.toString()}`;
}

async function initialisePracticeSelectors() {
  try {
    sharedTopicsData = await loadSharedTopicsData();

    fillSelect(subjectSelect, sharedTopicsData.subjects);
    updateLevelOptions();

    subjectSelect.addEventListener("change", updateLevelOptions);
    levelSelect.addEventListener("change", updateTopicOptions);
    startPracticeButton.addEventListener("click", handleStartPractice);
  } catch (error) {
    console.error("Unable to initialise practice selectors:", error);

    subjectSelect.disabled = true;
    levelSelect.disabled = true;
    topicSelect.disabled = true;
    startPracticeButton.disabled = true;
  }
}

async function sendAssistantMessage() {
  // Future API connection will be added here.
}

initialisePracticeSelectors();