require("dotenv").config()
const { z } = require("zod")
const {
	CognitoIdentityProviderClient,
	ConfirmForgotPasswordCommand,
} = require("@aws-sdk/client-cognito-identity-provider")
const middy = require("@middy/core")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const reqSchema = z.object({
	email: z.string().email(),
	otp: z.string(),
	newPassword: z.string(),
})
exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const requestBody = JSON.parse(event.body)
	const req = {
		email: requestBody.email,
		confirmationCode: requestBody.otp.trim(),
		newPassword: requestBody.newPassword,
	}
	const client = new CognitoIdentityProviderClient({ region: "us-east-1" })
	const input = {
		ClientId: process.env.COGNITO_CLIENT_ID,
		Username: req.email,
		ConfirmationCode: req.confirmationCode,
		Password: req.newPassword,
	}

	const command = new ConfirmForgotPasswordCommand(input)
	await client.send(command)
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({ message: "Password confirmed successfully" }),
	}
})
	.use(bodyValidator(reqSchema))
	.use(errorHandler())
