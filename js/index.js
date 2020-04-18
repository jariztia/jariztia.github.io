const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'
const imageList = ['img40','img41','img42','img43','img44','img45','img46','img47','img48','img51','img52','img53','img54','img55','img56','img57','img58','img59','img61','img62','img63','img64','img65','img66','img67','img68','img69','img73','img74','img75','img76','img77','img78','img79','img80','img81','img88','img89','img90','img91','img92','img93','img94','img95','img96','img99','img100','img101','img102','img103','img104','img105','img106','img107','img110','img111','img112','img113','img114','img115','img116','img117','img118','img121','img122','img123','img124','img125','img126','img127','img128','img129','img131','img132','img133','img134','img135','img136','img137','img138','img139','img141','img142','img143','img144','img145','img146','img147','img148','img149','img152','img153','img154','img155','img156','img157','img158','img159','img160','img163','img164','img165','img166','img167','img168','img169','img170','img171'];
let wsConnection;

const pageEls = {};

let gameIdEl;
let nicknameInputEl;
let gameIdInputEl;
let playerListEl;
let startGameButtonEl;

let gameId;
let playerNumber;
let players = [];

document.addEventListener('DOMContentLoaded', function(event) {
  pageEls.home = document.getElementById('home');
  pageEls.invite = document.getElementById('invite');
  pageEls.join = document.getElementById('join');
  pageEls.selectImage = document.getElementById('selectImage');
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
    case 'BEGIN_ROUND':
      updatePlayerImages(data);
      goToPage('selectImage');
      break;
    default:
      console.log('INVALID MESSAGE: ', event.data);
  }
}

function saveGameData(data) {
  gameId = data.gameId;
  playerNumber = data.playerNumber;
  gameIdEl.innerHTML = gameId;

  if (playerNumber === 0) {
    startGameButtonEl.style.display = 'flex';
  }
}

function updatePlayers(data) {
  let playerList = '';
  players = data.playerList;
  players.forEach(player => playerList += `<li>${player.nickname}</li>`);
  playerListEl.innerHTML = playerList;
}

function updatePlayerImages(data) {
  let imageList = '';
  playerImages = data.playerImages;
  playerImages.forEach(img => imageList += `<img src="img/image-set/${img}.jpg">`);
  pageEls.selectImage.innerHTML = imageList;
}

function goToPage(page) {
  pageEls.home.style.display = 'none';
  pageEls.invite.style.display = 'none';
  pageEls.join.style.display = 'none';
  pageEls.selectImage.style.display = 'none';

  if (page === 'selectImage') {
    pageEls[page].style.display = 'block';
  } else {
    pageEls[page].style.display = 'flex';
  }
}

function copyGameId() {
  navigator.clipboard.writeText(gameId)
  .then(function() {
    console.log('gameId copied to clipboard');
  });
}

function startGame() {
  wsConnection.send(JSON.stringify({
    action: 'startGame',
    gameId,
    playerNumber,
    imageList,
  }));
}
