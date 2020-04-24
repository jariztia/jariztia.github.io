const AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
  const eContext = event.requestContext;
  const wsAPI = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: eContext.domainName + '/' + eContext.stage,
  });
  wsAPI.postToConnection({
    ConnectionId: eContext.connectionId,
    Data: JSON.stringify({
      action: 'KEEP_ALIVE',
    }),
  }).promise().then(() => {
    callback(null, {
      statusCode: 201,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
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
