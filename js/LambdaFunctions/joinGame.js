const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;
  const data = JSON.parse(event.body);
  const gameId = data.gameId;
  const playerNickname = data.nickname;

  console.log('Adding player "' + playerNickname + '" to game ' + gameId);

  getPlayers(gameId).then((queryResponse) => {
    if (queryResponse.Count > 5) {
      callback(null, {
        statusCode: 403,
        body: JSON.stringify({
          Error: 'ERROR: maximum 6 players allowed',
        }),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    const playerNumber = queryResponse.Count;
    let playerList = queryResponse.Items.map((player) => ({
      playerNumber: player.PlayerNumber,
      nickname: player.Nickname,
    }));
    playerList.push({
      playerNumber,
      nickname: playerNickname,
    });
    let connectionList = queryResponse.Items.map((player) => player.ConnectionId);
    connectionList.push(connectionId);

    addPlayer(gameId, playerNumber, playerNickname, connectionId).then(() => {
      sendBackGameId(gameId, playerNumber, event.requestContext).then(() => {
        updatePlayers(gameId, playerList, connectionList, event.requestContext);
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

function addPlayer(gameId, playerNumber, playerNickname, connectionId) {
  return ddb.put({
    TableName: 'Players',
    Item: {
      PlayerNumber: playerNumber,
      GameId: gameId,
      ConnectionId: connectionId,
      Nickname: playerNickname,
      DateCreated: new Date().toISOString(),
    },
  }).promise();
}

function sendBackGameId(gameId, playerNumber, requestContext) {
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  return apigwManagementApi.postToConnection({
    ConnectionId: requestContext.connectionId,
    Data: JSON.stringify({
      action: 'JOINED_GAME',
      gameId,
      playerNumber,
    }),
  }).promise();
}

function updatePlayers(gameId, playerList, connectionList, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  connectionList.forEach((ConnectionId) => {
    wsAPI.postToConnection({
      ConnectionId,
      Data: JSON.stringify({
        action: 'UPDATE_PLAYERS',
        gameId,
        playerList,
      }),
    }).promise();
  });
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
