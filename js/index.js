const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'

var homeEl;
var inviteEl;
var gameIdEl;
var joinGameButton;
var wsConnection;

let gameId;
let playerId;

document.addEventListener('DOMContentLoaded', function(event) {
  gameIdEl = document.getElementById('gameId');
  homeEl = document.getElementById('home');
  inviteEl = document.getElementById('invite');
});

function createGame(event) {
  wsConnection = new WebSocket(wsURL);
  wsConnection.onmessage = receiveMessage;
  wsConnection.onopen = function (event) {
    wsConnection.send(JSON.stringify({
      action: 'createGame',
    }));
  };
}

function joinGame(event) {
}

function receiveMessage(event) {
  const data = JSON.parse(event.data);
  switch (data.action) {
    case 'GAME_CREATED':
      startGame(data);
      break;
    default:
      console.log('INVALID MESSAGE: ', event.data);
  }
}

function startGame(data) {
  gameId = data.gameId;
  playerId = data.playerId;

  gameIdEl.innerHTML = gameId;
  homeEl.style.display = 'none';
  inviteEl.style.display = 'flex';
}

function copyGameId(event) {
  navigator.clipboard.writeText(gameId)
  .then(function() {
    console.log('gameId copied to clipboard');
  });
}
