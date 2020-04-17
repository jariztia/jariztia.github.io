const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'
let wsConnection;

const pageEls = {};

let gameIdEl;
let nicknameInputEl;
let gameIdInputEl;
let playerListEl;
let startGameButtonEl;

let gameId;
let playerId;
let players = [];

document.addEventListener('DOMContentLoaded', function(event) {
  pageEls.home = document.getElementById('home');
  pageEls.invite = document.getElementById('invite');
  pageEls.join = document.getElementById('join');
  gameIdEl = document.getElementById('gameId');
  nicknameInputEl = document.getElementById('nicknameInput');
  gameIdInputEl = document.getElementById('gameIdInput');
  playerListEl = document.getElementById('playerList');
  startGameButtonEl = document.getElementById('startGameButton');
});

function createGame() {
  wsConnection = new WebSocket(wsURL);
  wsConnection.onmessage = receiveMessage;
  wsConnection.onopen = function () {
    wsConnection.send(JSON.stringify({
      action: 'createGame',
      nickname: nicknameInputEl.value,
    }));
  };
}

function joinGame() {
  wsConnection = new WebSocket(wsURL);
  wsConnection.onmessage = receiveMessage;
  wsConnection.onopen = function () {
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
    case 'JOINED_GAME':
      saveGameData(data);
      goToPage('invite');
      break;
    case 'UPDATE_PLAYERS':
      updatePlayers(data);
      break;
    default:
      console.log('INVALID MESSAGE: ', event.data);
  }
}

function saveGameData(data) {
  gameId = data.gameId;
  playerId = data.playerId;
  gameIdEl.innerHTML = gameId;

  if (playerId.endsWith('p00')) {
    startGameButtonEl.style.display = 'flex';
  }
}

function updatePlayers(data) {
  let playerList = '';
  players = data.playerList;
  players.forEach(player => playerList += `<li>${player.nickname}</li>`);
  playerListEl.innerHTML = playerList;
}

function goToPage(page) {
  pageEls.home.style.display = 'none';
  pageEls.invite.style.display = 'none';
  pageEls.join.style.display = 'none';

  pageEls[page].style.display = 'flex';
}

function copyGameId() {
  navigator.clipboard.writeText(gameId)
  .then(function() {
    console.log('gameId copied to clipboard');
  });
}

function startGame() {
}
