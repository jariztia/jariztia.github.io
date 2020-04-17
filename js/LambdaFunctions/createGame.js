const randomBytes = require('crypto').randomBytes;
const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId
  const gameId = toUrlString(randomBytes(16));
  const playerId = gameId + 'p00';
  const playerNickname = JSON.parse(event.body).nickname;

  console.log('Creating game ' + gameId);

  createGame(gameId).then(() => {
    addPlayer(gameId, playerId, playerNickname, connectionId).then(() => {
      sendBackGameId(gameId, playerId, event.requestContext).then(() => {
        callback(null, {
          statusCode: 201,
          body: JSON.stringify({
            GameId: gameId,
            PlayerId: playerId,
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
      RequestTime: new Date().toISOString(),
    },
  }).promise();
}

function addPlayer(gameId, playerId, playerNickname, connectionId) {
  return ddb.put({
    TableName: 'Players',
    Item: {
      PlayerId: playerId,
      GameId: gameId,
      ConnectionId: connectionId,
      Nickname: playerNickname,
      RequestTime: new Date().toISOString(),
    },
  }).promise();
}

function sendBackGameId(gameId, playerId, requestContext) {
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: requestContext.domainName + '/' + requestContext.stage,
  });
  return apigwManagementApi.postToConnection({
    ConnectionId: requestContext.connectionId,
    Data: JSON.stringify({
      action: 'GAME_CREATED',
      gameId,
      playerId,
    }),
  }).promise();
}

function toUrlString(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
