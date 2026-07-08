const PAGE_CONFIG = {
  questionPartPath: "../MAXI_question/main.html"
};

function startMode(mode) {
  const currentParams = new URLSearchParams(window.location.search);

  const nextParams = new URLSearchParams({
    mode,
    subject: currentParams.get("subject") || "",
    level: currentParams.get("level") || "",
    topic: currentParams.get("topic") || ""
  });

  window.location.href =
    `${PAGE_CONFIG.questionPartPath}?${nextParams.toString()}`;
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.mode;

    if (mode !== "quiz" && mode !== "short") {
      return;
    }

    startMode(mode);
  });
});