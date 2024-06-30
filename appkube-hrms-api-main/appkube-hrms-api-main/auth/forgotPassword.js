require("dotenv").config()
const { z } = require("zod")
const {
	CognitoIdentityProviderClient,
	ForgotPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider")
const middy = require("@middy/core")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const reqSchema = z.object({
	email: z.string().email(),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const requestBody = JSON.parse(event.body)
	const req = {
		email: requestBody.email,
	}

	const client = new CognitoIdentityProviderClient({ region: "us-east-1" })
	const input = {
		ClientId: process.env.COGNITO_CLIENT_ID,
		Username: req.email,
	}

	const command = new ForgotPasswordCommand(input)
	const response = await client.send(command)

	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({
			message: "Password reset code sent successfully",
		}),
	}
})
	.use(bodyValidator(reqSchema))
	.use(errorHandler())
