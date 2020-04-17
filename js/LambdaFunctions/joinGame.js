const randomBytes = require('crypto').randomBytes;
const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
  const connectionId = event.requestContext.connectionId
  const data = JSON.parse(event.body);
  const gameId = data.gameId;
  const playerNickname = data.nickname;

  console.log('Adding player "' + playerNickname + '" to game ' + gameId);

  getPlayers(gameId).then((players) => {
    console.log('players', players);
    const playerId = gameId + 'p0' + players.Count;

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

function getPlayers(gameId) {
  return ddb.query({
    TableName: 'Players',
    KeyConditionExpression: `GameId = :s`,
    ExpressionAttributeValues: {
      ':s': gameId,
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
      action: 'JOINED_GAME',
      gameId,
      playerId,
    }),
  }).promise();
}
