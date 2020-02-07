const AWS = require('aws-sdk');
const response = require('cfn-response');
const s3control = new AWS.S3Control();

async function respond(event, context, success) {
    const status = (success ? 'SUCCESS' : 'FAILED');
    return new Promise((resolve, reject) => {
        response.send(
            event,
            {
                logStreamName: context.logStreamName,
                done: () => { resolve() }
            },
            status
        );
    });
}

async function denyPublicAccess(account_id) {
    return await s3control.putPublicAccessBlock({
        AccountId: account_id,
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
        }
    }).promise();
}

async function allowPublicAccess(account_id) {
    return await s3control.deletePublicAccessBlock({
        AccountId: account_id,
    }).promise();
}

exports.handler = async (event, context) => {
    try {
        console.log("Event:", JSON.stringify(event));
        const account_id = event.ResourceProperties.AccountId;

        switch (event.RequestType) {
            case 'Create':
            case 'Update':
                await denyPublicAccess(account_id);
                return await respond(event, context, true);
            case 'Delete':
                await allowPublicAccess(account_id);
                return await respond(event, context, true);
            default:
                throw Error(`Unable to handle request type '${event.RequestType}'`);
        }
    } catch (e) {
        console.log("Error:", e);
        return await respond(event, context, false);
    }
};