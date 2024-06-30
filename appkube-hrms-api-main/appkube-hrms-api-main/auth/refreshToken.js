const {
	CognitoIdentityProviderClient,
	InitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider")
require("dotenv").config()
const cognitoIdentity = new CognitoIdentityProviderClient({
	region: "us-east-1",
})
const { connectToDatabase } = require("../db/dbConnector")
exports.handler = async event => {
	const requestBody = JSON.parse(event.body)
	const { email } = requestBody
	const authHeader =
		event.headers.Authorization || event.headers.authorization
	const token = authHeader.substring(7)
	const client = await connectToDatabase()
	const params = {
		ClientId: process.env.COGNITO_CLIENT_ID,
		AuthFlow: "REFRESH_TOKEN_AUTH",
		AuthParameters: {
			REFRESH_TOKEN: token,
		},
	}

	try {
		const command = new InitiateAuthCommand(params)
		const result = await cognitoIdentity.send(command)
		await client.query(
			`UPDATE employee
             SET access_token = $1
             WHERE work_email = $2`,
			[result.AuthenticationResult.IdToken, email],
		)
		await client.end();
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				Access_token: result.AuthenticationResult.IdToken,
			}),
		}
	} catch (error) {
		await client.end();
		return {
			statusCode: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({ message: error.message }),
		}
	}
}
