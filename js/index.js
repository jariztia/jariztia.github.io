const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'
const imageList = ['img40','img41','img42','img43','img44','img45','img46','img47','img48','img51','img52','img53','img54','img55','img56','img57','img58','img59','img61','img62','img63','img64','img65','img66','img67','img68','img69','img73','img74','img75','img76','img77','img78','img79','img80','img81','img88','img89','img90','img91','img92','img93','img94','img95','img96','img99','img100','img101','img102','img103','img104','img105','img106','img107','img110','img111','img112','img113','img114','img115','img116','img117','img118','img121','img122','img123','img124','img125','img126','img127','img128','img129','img131','img132','img133','img134','img135','img136','img137','img138','img139','img141','img142','img143','img144','img145','img146','img147','img148','img149','img152','img153','img154','img155','img156','img157','img158','img159','img160','img163','img164','img165','img166','img167','img168','img169','img170','img171'];
let wsConnection;

const pageEls = {};

let gameIdEl;
let nicknameInputEl;
let gameIdInputEl;
let playerListEl;
let startGameButtonEl;
let roundMasterInfoEl;
let selectedImageEl;
let loadingEl;

let gameId;
let playerNumber;
let playerList = [];
let selectedImage;

document.addEventListener('DOMContentLoaded', function(event) {
  pageEls.home = document.getElementById('home');
  pageEls.invite = document.getElementById('invite');
  pageEls.join = document.getElementById('join');
  pageEls.selectImage = document.getElementById('selectImage');
  pageEls.confirmImage = document.getElementById('confirmImage');
  gameIdEl = document.getElementById('gameId');
  nicknameInputEl = document.getElementById('nicknameInput');
  gameIdInputEl = document.getElementById('gameIdInput');
  playerListEl = document.getElementById('playerList');
  startGameButtonEl = document.getElementById('startGameButton');
  roundMasterInfoEl = document.getElementById('roundMasterInfo');
  selectedImageEl = document.getElementById('selectedImage');
  loadingEl = document.getElementById('loading');
});

function joinGame(isCreate) {
  if (nicknameInputEl.value && (!isCreate === !!gameIdInputEl.value)) {
    showLoading();
    wsConnection = new WebSocket(wsURL);
    wsConnection.onmessage = receiveMessage;
    wsConnection.onopen = function () {
      wsConnection.send(JSON.stringify({
        action: isCreate ? 'createGame' : 'joinGame',
        gameId: isCreate ? undefined: gameIdInputEl.value,
        nickname: nicknameInputEl.value,
      }));
    };
  } else {
    nicknameInputEl.classList.add('shake');
    gameIdInputEl.classList.add('shake');
    setTimeout(() => {
      nicknameInputEl.classList.remove('shake');
      gameIdInputEl.classList.remove('shake');
    }, 300);
  }
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
      requestHint(data);
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
  hideLoading();
}

function updatePlayers(data) {
  let playerListHtml = '';
  playerList = data.playerList;
  playerList.forEach(player => playerListHtml += `<li>${player.nickname}</li>`);
  playerListEl.innerHTML = playerListHtml;
  hideLoading();
}

function updatePlayerImages(data) {
  let imageList = '';
  playerImages = data.playerImages;
  playerImages.forEach(img => imageList += `<img onclick="selectImage('${img}')" src="img/image-set/${img}.jpg">`);
  pageEls.selectImage.innerHTML = imageList;
  hideLoading();
}

function requestHint(data) {
  if (playerNumber !== data.currentRound % playerList.length) {
    return;
  }
  roundMasterInfoEl.style.display = 'flex';
}

function goToPage(page) {
  if (page === 'join' && !nicknameInputEl.value) {
    nicknameInputEl.classList.add('shake');
    setTimeout(() => {
      nicknameInputEl.classList.remove('shake');
    }, 300);
    return;
  }
  pageEls.home.style.display = 'none';
  pageEls.invite.style.display = 'none';
  pageEls.join.style.display = 'none';
  pageEls.selectImage.style.display = 'none';
  pageEls.confirmImage.style.display = 'none';

  if (page === 'selectImage') {
    pageEls[page].style.display = 'block';
  } else {
    pageEls[page].style.display = 'flex';
  }
}

function copyGameId() {
  let range = document.createRange();
  range.selectNode(gameIdEl);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
}

function startGame() {
  showLoading();
  wsConnection.send(JSON.stringify({
    action: 'startGame',
    gameId,
    playerNumber,
    imageList,
  }));
}

function selectImage(img) {
  selectedImage = img;
  selectedImageEl.innerHTML = `<img src="img/image-set/${img}.jpg">`;
  goToPage('confirmImage');
}

function hideInfo() {
  roundMasterInfoEl.style.display = 'none';
}

function backToImageSelection() {
  goToPage('selectImage');
}

function confirmImageSelection() {
}

function showLoading() {
  loadingEl.style.display = 'flex';
}

function hideLoading() {
  loadingEl.style.display = 'none';
}

