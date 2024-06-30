const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const {
	CognitoIdentityProviderClient,
	RespondToAuthChallengeCommand,
	AdminInitiateAuthCommand,
} = require("@aws-sdk/client-cognito-identity-provider")
const { bodyValidator } = require("../util/bodyValidator")
const { errorHandler } = require("../util/errorHandler")

const reqSchema = z.object({
	email: z.string(),
	password: z.string(),
	newPassword: z.string(),
})

const cognitoClient = new CognitoIdentityProviderClient({
	region: "us-east-1",
})

const updateInvitationStatus = `
                                UPDATE employee SET 
                                invitation_status  = $1
                                WHERE work_email = $2
                                RETURNING invitation_status ;`

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const {email, password, newPassword } = JSON.parse(event.body)
	const workEmail = email
	const client = await connectToDatabase()

	const inputAuth = {
		UserPoolId: process.env.COGNITO_POOL_ID,
		ClientId: process.env.COGNITO_CLIENT_ID,
		AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
		AuthParameters: {
			USERNAME: email,
			PASSWORD: password,
		},
	}
	const authResponse = await cognitoClient.send(
		new AdminInitiateAuthCommand(inputAuth),
	)
	const authChallengeInput = {
		ChallengeName: "NEW_PASSWORD_REQUIRED",
		ClientId: process.env.COGNITO_CLIENT_ID,
		ChallengeResponses: {
			USERNAME: email,
			NEW_PASSWORD: newPassword,
		},
		Session: authResponse.Session,
	}
	newPasswordResponse = await cognitoClient.send(
		new RespondToAuthChallengeCommand(authChallengeInput),
	)

	await client.query(updateInvitationStatus, ["ACTIVE", workEmail])
	await client.end()
	return {
		statusCode: 301,
		headers: {
			"Access-Control-Allow-Origin": "*",
			Location: "https://workflow.synectiks.net/",
		},
		body: JSON.stringify({
			message: " Password-Reset Successfully ",
		}),
	}
})
	.use(bodyValidator(reqSchema))
	.use(errorHandler())
