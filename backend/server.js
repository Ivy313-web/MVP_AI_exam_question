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

app.post("/api/grade-short-answer", (req, res) => {
  const { questionId, userAnswer, status } = req.body;

  const normalizedStatus = String(status || "").toLowerCase();
  const isCorrect = normalizedStatus === "correct";
  const isSkipped = normalizedStatus === "skipped";

  res.json({
    questionId: questionId || null,
    userAnswer: userAnswer || "",
    status: isSkipped ? "skipped" : isCorrect ? "correct" : "incorrect",
    isCorrect: isCorrect,
    marksAwarded: isCorrect ? 1 : 0,
    marksAvailable: 1,
    percentage: isCorrect ? 100 : 0,
    markBreakdown: [],
    feedback: "Mock grading result based on the current frontend status. This will later be replaced by backend or AI grading."
  });
});

app.listen(PORT, () => {
  console.log(`MAXI mock backend running at http://localhost:${PORT}`);
});