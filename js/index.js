/////////////////
//  Constants  //
/////////////////

const wsURL = 'wss://nffqcwwwj3.execute-api.sa-east-1.amazonaws.com/websocket'
const imageList = ['img40','img41','img42','img43','img44','img45','img46','img47','img48','img51','img52','img53','img54','img55','img56','img57','img58','img59','img61','img62','img63','img64','img65','img66','img67','img68','img69','img73','img74','img75','img76','img77','img78','img79','img80','img81','img88','img89','img90','img91','img92','img93','img94','img95','img96','img99','img100','img101','img102','img103','img104','img105','img106','img107','img110','img111','img112','img113','img114','img115','img116','img117','img118','img121','img122','img123','img124','img125','img126','img127','img128','img129','img131','img132','img133','img134','img135','img136','img137','img138','img139','img141','img142','img143','img144','img145','img146','img147','img148','img149','img152','img153','img154','img155','img156','img157','img158','img159','img160','img163','img164','img165','img166','img167','img168','img169','img170','img171'];
const states = {
  WAITING_MASTER: 0,
  SELECTING_MY_IMAGE: 1,
  WAITING_OTHERS_SELECT: 2,
  SELECTING_MASTER_IMAGE: 3,
  WAITING_OTHERS_SELECT_MASTER: 4,
};

/////////////////
//  Variables  //
/////////////////

let gameState = states.WAITING_MASTER;
let wsConnection;
let gameId;
let playerNumber;
let playerList = [];
let partyDetails = {};
let currentRound;
let masterPlayerNumber;
let isRoundMaster;
let playerImages;
let selectedImage;
let guessImages;
let guessedImage;

/////////////////////
//  HTML Elements  //
/////////////////////

const pageEls = {};
let loadingEl;
let gameIdEl;
let nicknameInputEl;
let gameIdInputEl;
let playerListEl;
let startGameButtonEl;
let roundMasterInfoEl;
let imageListEl;
let selectedImageEl;
let hintInputEl;
let imageHintEl;
let partyButtonEl;
let partyInfoEl;
let partyDetailsEl;
let expandedImageEl;
let donateEl;

document.addEventListener('DOMContentLoaded', function(event) {
  pageEls.home = document.getElementById('home');
  pageEls.invite = document.getElementById('invite');
  pageEls.join = document.getElementById('join');
  pageEls.selectImage = document.getElementById('selectImage');
  pageEls.confirmImage = document.getElementById('confirmImage');
  pageEls.roundResult = document.getElementById('roundResult');
  loadingEl = document.getElementById('loading');
  gameIdEl = document.getElementById('gameId');
  nicknameInputEl = document.getElementById('nicknameInput');
  gameIdInputEl = document.getElementById('gameIdInput');
  playerListEl = document.getElementById('playerList');
  startGameButtonEl = document.getElementById('startGameButton');
  roundMasterInfoEl = document.getElementById('roundMasterInfo');
  imageListEl = document.getElementById('imageList');
  selectedImageEl = document.getElementById('selectedImage');
  hintInputEl = document.getElementById('hintInput');
  imageHintEl = document.getElementById('imageHint');
  partyButtonEl = document.getElementById('partyButton');
  partyInfoEl = document.getElementById('partyInfo');
  partyDetailsEl = document.getElementById('partyDetails');
  expandedImageEl =  document.getElementById('expandedImage');
  donateEl =  document.getElementById('donate');
});

///////////////////////////////
//  Prevent Backbutton Exit  //
///////////////////////////////

document.addEventListener('DOMContentLoaded', function() {
  history.pushState({}, '');
})

window.addEventListener('popstate', (event) => {
  console.log('Tried to leave using backbutton');
  history.pushState({}, '');
});

////////////////////////////
//  Websocket Connection  //
////////////////////////////

function joinGame(isCreate) {
  const nickname = nicknameInputEl.value.replace(/[^a-zA-Z0-9]/g, '');
  const gameIdVal = gameIdInputEl.value;
  if (nickname && (!isCreate === !!gameIdVal)) {
    showLoading();
    wsConnection = new WebSocket(wsURL);
    wsConnection.onmessage = receiveMessage;
    wsConnection.onopen = function () {
      wsConnection.send(JSON.stringify({
        action: isCreate ? 'createGame' : 'joinGame',
        gameId: isCreate ? undefined: gameIdVal,
        nickname,
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

//////////////////////////
//  Websocket Messages  //
//////////////////////////

function startGame() {
  showLoading();
  wsConnection.send(JSON.stringify({
    action: 'startGame',
    gameId,
    playerNumber,
    imageList,
  }));
}

function confirmImageSelection() {
  if (gameState === states.SELECTING_MASTER_IMAGE) {
    gameState = states.WAITING_OTHERS_SELECT_MASTER;
    wsConnection.send(JSON.stringify({
      action: 'playerGuessedImage',
      gameId,
      playerNumber,
      guessedImage,
    }));
  } else {
    const imageHint = hintInputEl.value.replace(/[^a-zA-Z0-9 ñ]/g, '');
    if (isRoundMaster) {
      imageHintEl.innerHTML = imageHint;
    }
    gameState = states.WAITING_OTHERS_SELECT;
    wsConnection.send(JSON.stringify({
      action: 'playerSelectedImage',
      gameId,
      playerNumber,
      selectedImage,
      imageHint,
    }));
  }
  highlightSelectedImage();
  backToImageSelection();
}

function nextRound() {
  showLoading();
  wsConnection.send(JSON.stringify({
    action: 'nextRound',
    gameId,
    playerNumber,
  }));
}

//////////////////////////////////
//  React to Incoming Messages  //
//////////////////////////////////

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
      setUpRound(data);
      goToPage('selectImage');
      break;
    case 'READY_PLAYERS':
      updateReadyPlayers(data);
      break;
    case 'GUESS_MASTER_IMAGE':
      guessMasterImage(data);
      break;
    case 'FINISH_ROUND':
      showPlayerSelection(data);
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

function setUpRound(data) {
  currentRound = data.currentRound;
  masterPlayerNumber = currentRound % playerList.length;
  isRoundMaster = playerNumber === masterPlayerNumber;
  let playerImagesHTML = '';

  if (data.playerImages) {
    playerImages = data.playerImages;
  } else {
    playerImages.splice(playerImages.indexOf(selectedImage), 1);
    playerImages.push(data.newPlayerImage);
  }
  
  playerImages.forEach(img => playerImagesHTML += `<img onclick="selectImage('${img}')" src="img/image-set/${img}.jpg">`);
  imageListEl.innerHTML = playerImagesHTML;
  
  selectedImage = undefined;
  guessedImage = undefined;
  imageHintEl.innerHTML = '';
  hintInputEl.style.display = 'none';
  document.body.classList.remove('public-section');
  gameState = states.WAITING_MASTER;
  hideLoading();

  if (isRoundMaster) {
    roundMasterInfoEl.style.display = 'flex';
    hintInputEl.style.display = 'flex';
  }

  if (currentRound === 0) {
    playerList.forEach((player) => {
      partyDetails[player.playerNumber] = {
        nickname: player.nickname,
        ready: false,
        points: 0,
      };
    });
    partyDetailsEl.innerHTML = buildPartyHTML();
    partyButtonEl.style.display = 'flex';
  } else {
    playerList.forEach(({ playerNumber }) => {
      partyDetails[playerNumber].ready = false;
    });
    partyDetailsEl.innerHTML = buildPartyHTML();
  }
}

function updateReadyPlayers(data) {
  data.readyPlayers.forEach((playerNumber) => {
    partyDetails[playerNumber].ready = true;
  });
  partyDetailsEl.innerHTML = buildPartyHTML();

  if (gameState === states.WAITING_MASTER) {
    if (data.hint) {
      imageHintEl.innerHTML = data.hint;
      imageHintEl.classList.add('shake');
      setTimeout(() => {
        imageHintEl.classList.remove('shake');
      }, 300);
    }
    gameState = states.SELECTING_MY_IMAGE;
  }

  partyButtonEl.classList.add('pop');
  setTimeout(() => {
    partyButtonEl.classList.remove('pop');
  }, 300);
}

function guessMasterImage(data) {
  document.body.classList.add('public-section');
  playerList.forEach(({ playerNumber }) => {
    partyDetails[playerNumber].ready = false;
  });
  partyDetailsEl.innerHTML = buildPartyHTML();

  let guessImagesHTML = '';
  guessImages = data.shuffledImages;
  guessImages.forEach(img => guessImagesHTML +=
    `<img
      class="set-${playerList.length}${img === selectedImage ? ' my-image' : ''}"
      onclick="selectImage('${img}')"
      src="img/image-set/${img}.jpg"
    >`);
  imageListEl.innerHTML = guessImagesHTML;
  gameState = states.SELECTING_MASTER_IMAGE;
}

function showPlayerSelection(data) {
  let pointsDiff = {};
  playerList.forEach(({ playerNumber }) => {
    pointsDiff[playerNumber] = data.points[playerNumber] - partyDetails[playerNumber].points;
    partyDetails[playerNumber].points = data.points[playerNumber];
  });
  partyDetailsEl.innerHTML = buildPartyHTML();

  // build round result page
  buildRoundResultPage(data, pointsDiff);
  donateEl.style.display = 'block';
  goToPage('roundResult');
}

////////////////////////////
//  Additional App Logic  //
////////////////////////////

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
  pageEls.roundResult.style.display = 'none';
  donateEl.style.display = 'none';

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
  gameIdEl.classList.add('copied');
  setTimeout(() => {
    gameIdEl.classList.remove('copied');
  }, 150);
}

function buildPartyHTML() {
  let partyDetailsHTML = '';
  playerList.forEach(({playerNumber, nickname}) => {
    const details = partyDetails[playerNumber];
    partyDetailsHTML += `
      <div class="listItem">
        ${details.ready ? '<i class="material-icons">done_outline</i>' : '<i class="material-icons">hourglass_empty</i>'}
        <span class="list-nickname">${nickname} ${playerNumber === masterPlayerNumber ? '<i class="material-icons master-star">star</i>' : ''}</span>
        <span class="list-points">${details.points}</span>
      </div>
    `;
  });
  return partyDetailsHTML;
}

function buildRoundResultPage(data, pointsDiff) {
  const { selectedImages, guessedImages } = data;
  const roundPoints = {};
  const masterImage = selectedImages[masterPlayerNumber];
  const selectedImagesArray = Object.values(selectedImages);
  const votesPerPlayer = {};

  playerList.forEach(({playerNumber, nickname}) => {
    if (playerNumber !== masterPlayerNumber) {
      let imageOwner = selectedImagesArray.indexOf(guessedImages[playerNumber]);
      if (votesPerPlayer[imageOwner]) {
        votesPerPlayer[imageOwner] += `<span class="list-nickname">${nickname}</span>`;
      } else {
        votesPerPlayer[imageOwner] = `<span class="list-nickname">${nickname}</span>`;
      }
    }
  });

  let roundResultHTML = `
    <div class="listItem headers">
      <span>Votes</span>
      <span>Points</span>
    </div>
  `;
  playerList.forEach(({playerNumber, nickname}) => {
    roundResultHTML += `
      <div class="listItem">
        <img class="list-image" onclick="expandImage('${selectedImages[playerNumber]}')" src="img/image-set/${selectedImages[playerNumber]}.jpg">
        <span class="list-nickname">${nickname} ${playerNumber === masterPlayerNumber ? '<i class="material-icons master-star">star</i>' : ''}</span>
        <div class="list-votes">${votesPerPlayer[playerNumber] || ' '}</div>
        <span class="list-points">+${pointsDiff[playerNumber]}</span>
      </div>
    `;
  });
  if (isRoundMaster) {
    roundResultHTML += '<button class="separate-button" onclick="nextRound()">Next Round</button>';
  }
  pageEls.roundResult.innerHTML = roundResultHTML;
}

function selectImage(img) {
  const notAllowed = (gameState === states.WAITING_MASTER && !isRoundMaster) ||
                     gameState === states.WAITING_OTHERS_SELECT ||
                     (gameState === states.SELECTING_MASTER_IMAGE && isRoundMaster) ||
                     gameState === states.WAITING_OTHERS_SELECT_MASTER ||
                     selectedImage === img;
  if (notAllowed) {
    return;
  }
  if (gameState === states.SELECTING_MASTER_IMAGE) {
    guessedImage = img;
  } else {
    selectedImage = img;
  }
  selectedImageEl.innerHTML = `<img src="img/image-set/${img}.jpg">`;
  goToPage('confirmImage');
}

function highlightSelectedImage() {
  if (gameState === states.WAITING_OTHERS_SELECT_MASTER) {
    let imageIndex = guessImages.indexOf(guessedImage);
    const guessedListImageEl = imageListEl.children.item(imageIndex);
    guessedListImageEl.classList.add('guessed-image');
  } else {
    let imageIndex = playerImages.indexOf(selectedImage);
    const selectedListImageEl = imageListEl.children.item(imageIndex);
    selectedListImageEl.classList.add('my-image');
  }
}

function expandImage(img) {
  expandedImageEl.innerHTML = `<img src="img/image-set/${img}.jpg">`;
  expandedImageEl.style.display = 'flex';
}

function closeExpandedImage() {
  expandedImageEl.style.display = 'none';
}

function showParty() {
  partyInfoEl.style.display = 'flex';
}

function hideParty() {
  partyInfoEl.style.display = 'none';
}

function hideInfo() {
  roundMasterInfoEl.style.display = 'none';
}

function backToImageSelection() {
  goToPage('selectImage');
}

function showLoading() {
  loadingEl.style.display = 'flex';
}

function hideLoading() {
  loadingEl.style.display = 'none';
}

