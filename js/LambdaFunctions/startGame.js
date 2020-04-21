const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const { gameId, playerNumber, imageList } = data;
  shuffleArray(imageList);
  const currentRound = 0;

  if (playerNumber !== 0) {
    callback(null, {
      statusCode: 403,
      body: JSON.stringify({
        Error: 'ERROR: Not allowed to start game',
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
    return;
  }

  console.log('Starting Game "' + gameId);

  getPlayers(gameId).then((queryResponse) => {
    const playerCount = queryResponse.Count;
    const nextImageIndex = playerCount*6;
    const connectionList = queryResponse.Items.map((player) => player.ConnectionId);

    sendPlayerImages(gameId, currentRound, imageList, connectionList, event.requestContext);
    updateGameInfo(gameId, playerCount, imageList, nextImageIndex, currentRound).then(() => {
      addRound(gameId, currentRound).then(() => {
        callback(null, {
          statusCode: 201,
          body: JSON.stringify({
            GameId: gameId,
            PlayerNumber: playerNumber,
          }),
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
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

function addRound(gameId, currentRound) {
  return ddb.put({
    TableName: 'Rounds',
    Item: {
      RoundNumber: currentRound,
      GameId: gameId,
      ImageHint: null,
      SelectedImages: {},
      DateCreated: new Date().toISOString(),
    },
  }).promise();
}

function updateGameInfo(gameId, playerCount, imageList, nextImageIndex, currentRound) {
  return ddb.update({
    TableName: 'Games',
    Key:{
      GameId: gameId,
    },
    UpdateExpression: 'set PlayerCount = :pc, ImageList = :il, NextImageIndex = :nii, CurrentRound = :cr',
    ExpressionAttributeValues:{
      ":pc": playerCount,
      ":il": imageList,
      ":nii": nextImageIndex,
      ":cr": currentRound,
    },
  }).promise();
}

function sendPlayerImages(gameId, currentRound, imageList, connectionList, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  for (var i = 0; i < connectionList.length; i++) {
    const playerImages = imageList.slice((i*6), (i*6 + 6));
    wsAPI.postToConnection({
      ConnectionId: connectionList[i],
      Data: JSON.stringify({
        action: 'BEGIN_ROUND',
        currentRound,
        gameId,
        playerImages,
      }),
    }).promise();
  }
}

function getPlayers(gameId) {
  return ddb.query({
    TableName: 'Players',
    KeyConditionExpression: `GameId = :s`,
    ExpressionAttributeValues: {
      ':s': gameId,
    },
  }).promise();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
