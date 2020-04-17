const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'
let wsConnection;

var homeEl;
var inviteEl;
var gameIdEl;
var joinGameButton;
let nicknameInputEl;

let gameId;
let playerId;

document.addEventListener('DOMContentLoaded', function(event) {
  gameIdEl = document.getElementById('gameId');
  homeEl = document.getElementById('home');
  inviteEl = document.getElementById('invite');
  nicknameInputEl = document.getElementById('nicknameInput');
});

function createGame(event) {
  wsConnection = new WebSocket(wsURL);
  wsConnection.onmessage = receiveMessage;
  wsConnection.onopen = function (event) {
    wsConnection.send(JSON.stringify({
      action: 'createGame',
      nickname: nicknameInputEl.value,
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
