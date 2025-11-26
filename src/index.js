var kefir = require("kefir");
var _ = require("lodash");

// The model is just a dictionary
var model = {};

function predictNextLetter(fivegram) {
  var m = model[fivegram];
  if (!m) return "s"; // Return s by default

  // Else return the most likely value following the r gram
  const maxVal = Math.max(m.r, m.p, m.s);

  if (m.r === maxVal) return "p"; // Paper beats rock
  if (m.p === maxVal) return "s"; // Scissors beat paper
  if (m.s === maxVal) return "r"; // Rock beats scissors
  return "s";
}

// Helper to determine winner (needed internally for the heuristic strategy)
function getWinner(aiMove, playerMove) {
  if (aiMove === playerMove) return "tie";
  if (
    (aiMove === "r" && playerMove === "s") ||
    (aiMove === "p" && playerMove === "r") ||
    (aiMove === "s" && playerMove === "p")
  ) {
    return "ai";
  }
  return "player";
}

// Helper to find the move that wasn't played
function getUnusedMove(move1, move2) {
  var moves = ["r", "p", "s"];
  return moves.find((m) => m !== move1 && m !== move2);
}

function predict(inputS) {
  // State variables for the stream
  // We use closure variables because we want to maintain state
  // between user keystrokes without buffering them in chunks.
  var history = "";
  var gameCount = 0;
  var lastAiMove = null;
  var lastPlayerMove = null;

  return inputS.map((playerMove) => {
    var prediction;

    // --- STEP 1: PREDICT ---
    if (gameCount === 0) {
      // First game: always Scissors
      prediction = "s";
    } else if (gameCount < 5) {
      // Games 2-5: Heuristic Strategy
      var lastResult = getWinner(lastAiMove, lastPlayerMove);

      if (lastResult === "ai") {
        // If AI won last time, play what the user just played
        prediction = lastPlayerMove;
      } else if (lastResult === "player") {
        // If AI lost, play the thing that didn't come up
        // (e.g. AI:Rock, User:Paper -> AI Lost. Unused is Scissors)
        prediction = getUnusedMove(lastAiMove, lastPlayerMove);
      } else {
        // If Tie, play randomly
        var moves = ["r", "p", "s"];
        prediction = moves[Math.floor(Math.random() * moves.length)];
      }
    } else {
      // Game 6+: Rolling Window Strategy (N-Gram)
      // Use the last 5 moves of history to predict the current one
      if (history.length >= 5) {
        var fiveGram = history.slice(-5);
        prediction = predictNextLetter(fiveGram);
      } else {
        prediction = "s"; // Fallback (should rarely happen given logic flow)
      }
    }

    // --- STEP 2: LEARN (Update Model) ---
    // If we have at least 5 previous moves, we learn from the current event
    // pattern: prev-5-moves -> resulted-in-current-player-move
    if (history.length >= 5) {
      var fiveGramKey = history.slice(-5);
      if (!model[fiveGramKey]) {
        model[fiveGramKey] = { r: 0, p: 0, s: 0 };
      }
      model[fiveGramKey][playerMove] += 1;
    }

    // --- STEP 3: UPDATE STATE ---
    lastAiMove = prediction;
    lastPlayerMove = playerMove;
    history += playerMove;
    gameCount++;

    // Return the pair [AI Prediction, User Move]
    return [prediction, playerMove];
  });
}

module.exports = predict;
