const randomBytes = require('crypto').randomBytes;
const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId;
  const gameId = toUrlString(randomBytes(16));
  const playerNumber = 0;
  const playerNickname = JSON.parse(event.body).nickname;

  console.log(`Creating game ${gameId}`);

  createGame(gameId).then(() => {
    addPlayer(gameId, playerNumber, playerNickname, connectionId).then(() => {
      sendBackGameId(gameId, playerNumber, event.requestContext).then(() => {
        updatePlayers(gameId, event.requestContext);
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

function createGame(gameId) {
  return ddb.put({
    TableName: 'Games',
    Item: {
      GameId: gameId,
      DateCreated: new Date().toISOString(),
    },
  }).promise();
}

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
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  return wsAPI.postToConnection({
    ConnectionId: requestContext.connectionId,
    Data: JSON.stringify({
      action: 'GAME_CREATED',
      gameId,
      playerNumber,
    }),
  }).promise();
}

function updatePlayers(gameId, requestContext) {
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  getPlayers(gameId).then((queryResponse) => {
    let playerList = queryResponse.Items.map((player) => ({
      playerNumber: player.PlayerNumber,
      nickname: player.Nickname,
    }));
    queryResponse.Items.forEach((player) => {
      wsAPI.postToConnection({
        ConnectionId: player.ConnectionId,
        Data: JSON.stringify({
          action: 'UPDATE_PLAYERS',
          gameId,
          playerList,
        }),
      }).promise();
    });
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

function toUrlString(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
