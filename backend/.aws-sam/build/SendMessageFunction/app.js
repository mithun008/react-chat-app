// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const { TABLE_NAME } = process.env;

exports.handler = async event => {
  console.log('Change received start ..' + JSON.stringify(event));
  let connectionData;

  try {
    connectionData = await ddb.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
    console.log("The connection data : " + connectionData);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });

  const postData = JSON.parse(event.body);
  //const postData = JSON.parse(event.body);

  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      console.log('Message received' + postData);
      const jsonMsg = {};
      jsonMsg.name = postData.name;
      jsonMsg.data = postData.data;
      //const jsonMsg = JSON.parse(postData);
      //const jsonMsg = JSON.stringify(postData);
      console.log('JSON message :' + JSON.stringify(jsonMsg));

      await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(jsonMsg) }).promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
      } else {
        throw e;
      }
    }
  });

  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
