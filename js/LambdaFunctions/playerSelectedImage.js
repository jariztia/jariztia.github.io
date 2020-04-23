const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const { gameId, playerNumber, selectedImage, imageHint } = data;

  console.log(`Player ${playerNumber} (${gameId}) selected image ${selectedImage} (Hint: ${imageHint})`);

  getGame(gameId).then((gameQueryResult) => {
    const gameData = gameQueryResult.Items[0];
    const currentRound = gameData.CurrentRound;
    getRound(gameId, currentRound).then((roundQueryResult) => {
      const roundData = roundQueryResult.Items[0];
      let roundHint = roundData.ImageHint;
      if (!roundHint && playerNumber === 0 && imageHint) {
        roundHint = imageHint;
      }
      let selectedImages = { ...roundData.SelectedImages };
      selectedImages[playerNumber] = selectedImage;

      updateRound(gameId, currentRound, selectedImages, roundHint).then(() => {
        let readyPlayers = Object.keys(selectedImages);
        getPlayers(gameId).then((playersQueryResult) => {
          const connectionList = playersQueryResult.Items.map((player) => player.ConnectionId);
          updateReadyPlayers(gameId, readyPlayers, roundHint, connectionList, event.requestContext);
          if (readyPlayers.length === gameData.PlayerCount) {
            let shuffledImages = Object.values(selectedImages);
            shuffleArray(shuffledImages);
            sendShuffledImages(gameId, shuffledImages, connectionList, event.requestContext);
          }
          callback(null, {
            statusCode: 201,
            body: JSON.stringify({
              GameId: gameId,
              PlayerINumber: playerNumber,
            }),
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
          });
        });
      });
    });
  }).catch((err) => {
    console.error(err);

    callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        Error: err.message,
        Reference: context.awsRequestId,
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  });
};

function updateRound(gameId, currentRound, selectedImages, roundHint) {
  return ddb.update({
    TableName: 'Rounds',
    Key:{
      GameId: gameId,
      RoundNumber: currentRound,
    },
    UpdateExpression: 'set SelectedImages = :si, ImageHint = :ih',
    ExpressionAttributeValues:{
      ":si": selectedImages,
      ":ih": roundHint,
    },
  }).promise();
}

function updateReadyPlayers(gameId, readyPlayers, roundHint, connectionList, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  for (var i = 0; i < connectionList.length; i++) {
    wsAPI.postToConnection({
      ConnectionId: connectionList[i],
      Data: JSON.stringify({
        action: 'READY_PLAYERS',
        gameId,
        readyPlayers,
        hint: roundHint,
      }),
    }).promise();
  }
}

function sendShuffledImages(gameId, shuffledImages, connectionList, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  for (var i = 0; i < connectionList.length; i++) {
    wsAPI.postToConnection({
      ConnectionId: connectionList[i],
      Data: JSON.stringify({
        action: 'GUESS_MASTER_IMAGE',
        gameId,
        shuffledImages,
      }),
    }).promise();
  }
}

function getGame(gameId) {
  return ddb.query({
    TableName: 'Games',
    KeyConditionExpression: `GameId = :g`,
    ExpressionAttributeValues: {
      ':g': gameId,
    },
  }).promise();
}

function getRound(gameId, currentRound) {
  return ddb.query({
    TableName: 'Rounds',
    KeyConditionExpression: `GameId = :g and RoundNumber = :r`,
    ExpressionAttributeValues: {
      ':g': gameId,
      ':r': currentRound,
    },
  }).promise();
}

function getPlayers(gameId) {
  return ddb.query({
    TableName: 'Players',
    KeyConditionExpression: `GameId = :g`,
    ExpressionAttributeValues: {
      ':g': gameId,
    },
  }).promise();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
