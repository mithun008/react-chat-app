// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const { TABLE_NAME } = process.env;
const WS_END_POINT = process.env.WS_END_POINT;

exports.handler = async event => {
    console.log('Change received start ..' + JSON.stringify(event));
    console.log('WS Endpoint :' + WS_END_POINT);
    let connectionData;

    try {
        connectionData = await ddb.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId' }).promise();
        console.log("The connection data : " + connectionData);
    } catch (e) {
        return { statusCode: 500, body: e.stack };
    }

    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: WS_END_POINT + '/' + 'Prod'
    });

    const postData = event.Records[0];
    //const postData = JSON.parse(event.body);

    const postCalls = connectionData.Items.map(async ({ connectionId }) => {
        try {
            console.log('Message received' + postData);
            const jsonMsg = { 'name': 'SQS' };
            //jsonMsg.name = 'SQS';
            jsonMsg.data = postData.body;
            //const jsonMsg = JSON.parse(postData);
            //const jsonMsg = JSON.stringify(postData);
            console.log('JSON message :' + JSON.stringify(jsonMsg));
            console.log('ConnectionId' + connectionId);
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
        console.log('Error.....' + e.stack);
        return { statusCode: 500, body: e.stack };
    }

    return { statusCode: 200, body: 'Data sent.' };
};

