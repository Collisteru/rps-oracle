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

    // Calculate AI score: 0.5 + (AI_wins - AI_losses) / (2 * games_played)
    var yourScore = 0.5 + (playerWins - aiWins) / (2 * (aiWins + playerWins));

    // Update the avg element with AI score
    avgEl.innerHTML = "Your Score: " + (yourScore * 100).toFixed(1) + "%";
  });

  predictionS.slidingWindow(4).onValue((ps) => {
    var guesses = ps
      .map((p) => {
        var aiMove = p[0];
        var playerMove = p[1];
        var winner = determineWinner(aiMove, playerMove);
        var color =
          winner === "ai"
            ? "red"
            : winner === "player"
            ? "lightgreen"
            : "yellow";
        return `<span style="background-color:${color}">AI played: ${aiMove}, You played: ${playerMove} (${
          winner === "ai" ? "AI wins" : winner === "player" ? "You win" : "Tie"
        })</span><br>`;
      })
      .reverse()
      .join("");
    lastGuessesEl.innerHTML = guesses;
  });
});
