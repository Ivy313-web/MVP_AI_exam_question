const guideImages = [
  "images/01-welcom.png",
  "images/02-intro.png",
  "images/03-func-explain.png",
  "images/04-practice-btn.png",
  "images/05-explaintopicbar.png",
  "images/06-explainphysics.png",
  "images/07-explainlevel.png",
  "images/08-explaintopic.png",
  "images/09-explain-unavailable.png",
  "images/10-intro.png",
  "images/11-try-shortanswer.png",
  "images/12-quiz-eg.png",
  "images/13-shortanswer-eg.png",
  "images/14-skip-eg.png",
  "images/15-next-eg.png",
  "images/16-switch-intro.png",
  "images/17-switch-warning.png",
  "images/18-result-summary.png",
  "images/19-unicorn-eg.png",
  "images/20-eg-question.png",
  "images/21-click-next.png",
  "images/22-reviewpage.png",
  "images/23-thanks.png"
];

const guideImage = document.getElementById("guideImage");
const guideProgress = document.getElementById("guideProgress");
const backButton = document.getElementById("backButton");
const nextButton = document.getElementById("nextButton");

let currentStepIndex = 0;

function renderGuideStep() {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === guideImages.length - 1;

  guideImage.src = guideImages[currentStepIndex];
  guideImage.alt = `MAXI guide step ${currentStepIndex + 1}`;

  guideProgress.textContent =
    `Step ${currentStepIndex + 1} of ${guideImages.length}`;

  backButton.disabled = isFirstStep;
  nextButton.textContent = isLastStep ? "Finish" : "Next";
}

backButton.addEventListener("click", () => {
  if (currentStepIndex > 0) {
    currentStepIndex -= 1;
    renderGuideStep();
  }
});

nextButton.addEventListener("click", () => {
  const isLastStep = currentStepIndex === guideImages.length - 1;

  if (isLastStep) {
    window.location.href = "../MAXI_home/home.html";
    return;
  }

  currentStepIndex += 1;
  renderGuideStep();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    backButton.click();
  }

  if (event.key === "ArrowRight") {
    nextButton.click();
  }

  if (event.key === "Escape") {
    window.location.href = "../MAXI_home/home.html";
  }
});

renderGuideStep();