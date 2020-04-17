const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'
let wsConnection;

let homeEl;
let inviteEl;
let joinEl;
let gameIdEl;
let nicknameInputEl;
let gameIdInputEl;

let gameId;
let playerId;

document.addEventListener('DOMContentLoaded', function(event) {
  homeEl = document.getElementById('home');
  inviteEl = document.getElementById('invite');
  joinEl = document.getElementById('join');
  gameIdEl = document.getElementById('gameId');
  nicknameInputEl = document.getElementById('nicknameInput');
  gameIdInputEl = document.getElementById('gameIdInput');
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
  wsConnection = new WebSocket(wsURL);
  wsConnection.onmessage = receiveMessage;
  wsConnection.onopen = function (event) {
    wsConnection.send(JSON.stringify({
      action: 'joinGame',
      gameId: gameIdInputEl.value,
      nickname: nicknameInputEl.value,
    }));
  };
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

function showJoinGame(event) {
  homeEl.style.display = 'none';
  joinEl.style.display = 'flex';
}

function copyGameId(event) {
  navigator.clipboard.writeText(gameId)
  .then(function() {
    console.log('gameId copied to clipboard');
  });
}
