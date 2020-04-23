const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const { gameId, playerNumber } = data;

  getGame(gameId).then((gameQueryResult) => {
    const {PlayerCount, ImageList, NextImageIndex, CurrentRound} = gameQueryResult.Items[0];
    const masterPlayerNumber = CurrentRound % PlayerCount;
    if (playerNumber !== masterPlayerNumber) {
      console.log(`Player ${playerNumber} not allowed to begin round ${CurrentRound + 1} (${gameId})`);
      callback(null, {
        statusCode: 403,
        body: JSON.stringify({
          Error: 'ERROR: Not allowed to begin round',
        }),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
      return;
    }

    const nextImageIndex = NextImageIndex + PlayerCount;
    const currentRound = CurrentRound + 1;
    console.log(`Begin Round ${currentRound} (${gameId})`);

    sendPlayerImages(gameId, currentRound, ImageList, NextImageIndex, event.requestContext);
    updateGameInfo(gameId, nextImageIndex, currentRound).then(() => {
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
      GuessedImages: {},
      DateCreated: new Date().toISOString(),
    },
  }).promise();
}

function updateGameInfo(gameId, nextImageIndex, currentRound) {
  return ddb.update({
    TableName: 'Games',
    Key:{
      GameId: gameId,
    },
    UpdateExpression: 'set NextImageIndex = :nii, CurrentRound = :cr',
    ExpressionAttributeValues:{
      ":nii": nextImageIndex,
      ":cr": currentRound,
    },
  }).promise();
}

function sendPlayerImages(gameId, currentRound, ImageList, NextImageIndex, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  return getPlayers(gameId).then((playersQueryResult) => {
    const connectionList = playersQueryResult.Items.map((player) => player.ConnectionId);
    for (var i = 0; i < connectionList.length; i++) {
      wsAPI.postToConnection({
        ConnectionId: connectionList[i],
        Data: JSON.stringify({
          action: 'BEGIN_ROUND',
          currentRound,
          gameId,
          newPlayerImage: ImageList[NextImageIndex + i],
        }),
      }).promise();
    }
  });
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

function getPlayers(gameId) {
  return ddb.query({
    TableName: 'Players',
    KeyConditionExpression: `GameId = :s`,
    ExpressionAttributeValues: {
      ':s': gameId,
    },
  }).promise();
}
