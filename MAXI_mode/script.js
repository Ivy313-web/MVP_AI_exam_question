const PAGE_CONFIG = {
  questionPartPath: "../MAXI_question/main.html"
};

function startMode(mode) {
  window.location.href = `${PAGE_CONFIG.questionPartPath}?mode=${mode}`;
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    startMode(button.dataset.mode);
  });
});