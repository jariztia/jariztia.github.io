const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const { gameId, playerNumber, guessedImage } = data;

  console.log('Player ' + playerNumber + ' selected image ' + guessedImage);

  getGame(gameId).then((gameQueryResult) => {
    const gameData = gameQueryResult.Items[0];
    const currentRound = gameData.CurrentRound;
    getRound(gameId, currentRound).then((roundQueryResult) => {
      const roundData = roundQueryResult.Items[0];
      let selectedImages = roundData.SelectedImages;
      let guessedImages = { ...roundData.GuessedImages };
      guessedImages[playerNumber] = guessedImage;

      updateRound(gameId, currentRound, guessedImages).then(() => {
        let readyPlayers = Object.keys(guessedImages);
        getPlayers(gameId).then((playersQueryResult) => {
          const connectionList = playersQueryResult.Items.map((player) => player.ConnectionId);
          updateReadyPlayers(gameId, readyPlayers, connectionList, event.requestContext);
          if (readyPlayers.length === (gameData.PlayerCount - 1)) {
            const points = gameData.Points;
            const masterPlayerNumber = gameData.CurrentRound % gameData.PlayerCount;
            const masterImage = selectedImages[masterPlayerNumber];
            const selectedImagesArray = Object.values(selectedImages);

            let correctCount = 0;
            for (var i = gameData.PlayerCount - 1; i >= 0; i--) {
              if (i !== masterPlayerNumber) {
                if (guessedImages[i] === masterImage) {
                  correctCount += 1;
                  points[i] += 3;
                } else {
                  let imageOwner = selectedImagesArray.indexOf(guessedImages[i]);
                  points[imageOwner] += 1;
                }
              }
            }
            points[masterPlayerNumber] += (correctCount > 0 && correctCount < (gameData.PlayerCount - 1) ? 3 : 0);

            sendSelectedImagesAndPoints(gameId, selectedImages, guessedImages, points, connectionList, event.requestContext);
            updateGame(gameId, points);
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

function updateRound(gameId, currentRound, guessedImages) {
  return ddb.update({
    TableName: 'Rounds',
    Key:{
      GameId: gameId,
      RoundNumber: currentRound,
    },
    UpdateExpression: 'set GuessedImages = :gi',
    ExpressionAttributeValues:{
      ":gi": guessedImages,
    },
  }).promise();
}

function updateGame(gameId, points) {
  return ddb.update({
    TableName: 'Games',
    Key:{
      GameId: gameId,
    },
    UpdateExpression: 'set Points = :p',
    ExpressionAttributeValues:{
      ":p": points,
    },
  }).promise();
}

function updateReadyPlayers(gameId, readyPlayers, connectionList, requestContext) {
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
      }),
    }).promise();
  }
}

function sendSelectedImagesAndPoints(gameId, selectedImages, guessedImages, points, connectionList, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  for (var i = 0; i < connectionList.length; i++) {
    wsAPI.postToConnection({
      ConnectionId: connectionList[i],
      Data: JSON.stringify({
        action: 'FINISH_ROUND',
        gameId,
        selectedImages,
        guessedImages,
        points,
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
