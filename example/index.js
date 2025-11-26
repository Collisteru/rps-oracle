// example/index.js - Complete version
var predict = require("../src"); // Require src/index.js
var kefir = require("kefir");
var mean = require("../src/running-mean");

window.onload = function () {
  if (localStorage.getItem("hasCodeRunBefore") === null) {
    console.log("Hello");
    localStorage.setItem("hasCodeRunBefore", true);
  }
};

function round(num) {
  return Math.floor(num * 100);
}

function whichKey(e) {
  if (window.event)
    // IE
    return e.keyCode;
  return e.which;
}

// --- Function to map letter to emoji ---
function getEmoji(move) {
  switch (move) {
    case "r":
      return "🪨"; // Rock
    case "p":
      return "📄"; // Paper
    case "s":
      return "✂️"; // Scissors
    default:
      return move;
  }
}

// Determine winner: returns 'ai', 'player', or 'tie'
function determineWinner(aiMove, playerMove) {
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

document.addEventListener("DOMContentLoaded", () => {
  var sufficientCorpusForAccuracy = 0;
  var avgEl = document.getElementById("avg");
  var pwins = document.getElementById("player_wins");
  var aiwins = document.getElementById("ai_wins");
  var ties = document.getElementById("ties");
  var totalGames = document.getElementById("total_games");
  var lastGuessesEl = document.getElementById("lastGuesses");

  // Track game stats
  var aiWins = 0;
  var playerWins = 0;
  var tieCount = 0;
  var gamesPlayed = 0;

  var pressS = kefir
    .stream((emitter) => {
      document.body.addEventListener("keypress", emitter.emit);
    })
    .map(whichKey)
    .map(String.fromCharCode)
    .filter((l) => l === "r" || l === "p" || l === "s");

  var predictionS = predict(pressS);
  var countS = predictionS.scan((acc) => (acc += 1), 0);
  var sufficientCorpusS = countS.filter((z) => z > sufficientCorpusForAccuracy);
  var goodPredictionS = predictionS.sampledBy(sufficientCorpusS);
  var accuracyS = mean(goodPredictionS);

  console.log("index loaded");

  accuracyS.onValue((z) => {
    avgEl.innerHTML = round(z) + "%";
    return;
  });

  // Track wins/losses/ties
  predictionS.onValue((p) => {
    var aiMove = p[0];
    var playerMove = p[1];
    var winner = determineWinner(aiMove, playerMove);

    gamesPlayed++;

    if (winner === "ai") {
      aiWins++;
    } else if (winner === "player") {
      playerWins++;
    } else {
      tieCount++;
    }

    // Update display
    aiwins.innerHTML = aiWins;
    pwins.innerHTML = playerWins;
    ties.innerHTML = tieCount;
    totalGames.innerHTML = gamesPlayed;

    // Calculate Your score: 0.5 + (AI_wins - AI_losses) / (2 * games_played)
    var yourScore = 0.5 + (playerWins - aiWins) / (2 * (aiWins + playerWins));

    // Update the avg element with AI score
    avgEl.innerHTML = "Your Score: " + (yourScore * 100).toFixed(1) + "%";
  });

  // --- Global variable to track the game number ---
  let gameCount = 0;

  // A new function to handle the update logic
  function updateGameHistory(ps) {
    // 1. Get the latest game from the sliding window
    // Since you are using .reverse() later, the latest game is ps[ps.length - 1]
    // before the reverse, or ps[0] after the reverse logic.
    // Let's assume the sliding window gives the oldest game first (ps[0])
    // and the newest game last (ps[ps.length - 1]).

    // Get the latest game data
    const latestGame = ps[ps.length - 1];
    if (!latestGame) return; // Guard against empty array

    const aiMove = latestGame[0];
    const playerMove = latestGame[1];
    const winner = determineWinner(aiMove, playerMove);

    // 2. Increment the global game counter
    gameCount++;

    // 3. Determine color and emoji output for the latest game
    const color =
      winner === "ai" ? "red" : winner === "player" ? "lightgreen" : "yellow";

    // 4. Create the new HTML entry for the latest game
    const newGuessHtml = `<span style="background-color:${color}">
        Game ${gameCount}: AI played: ${getEmoji(
      aiMove
    )}, You played: ${getEmoji(playerMove)} (${
      winner === "ai" ? "AI wins" : winner === "player" ? "You win" : "Tie"
    })</span><br>`;

    // 5. Append the new game to the history container

    // Since you used .reverse() in your original code, it suggests you want
    // the newest game at the TOP. We use insertAdjacentHTML to prepend it.

    // Check if the element exists before trying to modify it
    if (lastGuessesEl) {
      lastGuessesEl.insertAdjacentHTML("afterbegin", newGuessHtml);

      // OPTIONAL: Keep the history trimmed to the window size (100)
      // This is complex because we are no longer using .map(). You might want
      // to re-think if the sliding window is necessary if you are only
      // using the latest entry. If you MUST trim, you'd need to manually
      // count and remove the last child elements if the count exceeds 100.
    }
  }

  // --- Replace your original .onValue() block with the new logic ---
  predictionS.slidingWindow(100).onValue(updateGameHistory);
});
