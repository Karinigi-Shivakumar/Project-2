const {
	SchedulerClient,
	CreateScheduleCommand,
	DeleteScheduleCommand,
} = require("@aws-sdk/client-scheduler")
const { connectToDatabase } = require("../db/dbConnector")
const uuid = require("uuid")
require("dotenv").config()
const { z } = require("zod")
const middy = require("@middy/core")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const schema = z.object({
	timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
	id: z.string().uuid(),
})

exports.handler = middy(async (event, context) => {
	const scheduler = new SchedulerClient({ region: "us-east-1" })

	const requestBody = JSON.parse(event.body)
	console.log(requestBody)
	console.log("timestamp", requestBody.timestamp)

	const schduler_name = uuid.v4()
	let response // Declare response variable here

	const insertInviteQuery =
		"INSERT INTO invite (employee_id, scheduler, scheduled_time) VALUES ($1, $2, $3);"

	const inputPrams = {
		timestamp: requestBody.timestamp,
		pathParameters: {
			id: requestBody.id,
		},
		queryStringParameters: {
			invitation_status: "SCHEDULED",
		},
	}

	try {
		response = await scheduler.send(
			new CreateScheduleCommand({
				ActionAfterCompletion: "DELETE",
				FlexibleTimeWindow: {
					Mode: "OFF", // OFF | FLEXIBLE
				},
				ScheduleExpression: `at(${requestBody.timestamp})`,
				ScheduleExpressionTimezone: "UTC+05:30",
				Target: {
					Arn: `arn:aws:lambda:us-east-1:${process.env.ACC_NO}:function:hrms-dev-inviteUser`,
					Input: JSON.stringify(inputPrams),
					RoleArn: `arn:aws:iam::${process.env.ACC_NO}:role/service-role/Amazon_EventBridge_Scheduler_LAMBDA_5d666aa429`,
				},
				Name: schduler_name,
			}),
		)
		const arn = response.ScheduleArn
		console.log("arn", arn)
		// Split the ARN string by '/'
		const arnParts = arn.split("/")
		// The last part contains the UUID
		const lastUuid = arnParts[arnParts.length - 1]
		console.log("uuid", lastUuid)

		if (response.$metadata.httpStatusCode === 200) {
			const client = await connectToDatabase()
			console.log("client connnected")
			await client.query(insertInviteQuery, [
				requestBody.id,
				schduler_name,
				requestBody.timestamp,
			])
			console.log("query executed")
		}
		await client.end()
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Credentials": true,
			},
			body: JSON.stringify({
				message: `user invited scheduled successfully at ${requestBody.timestamp}`,
			}),
		}
	} catch (error) {
		console.log("Error:", error)
		if (response) {
			const arn = response.ScheduleArn
			console.log("arn", arn)
			// Split the ARN string by '/'
			const arnParts = arn.split("/")
			// The last part contains the UUID
			const lastUuid = arnParts[arnParts.length - 1]
			console.log("uuid", lastUuid)
			await scheduler.send(new DeleteScheduleCommand({ Name: lastUuid }))
		}
		throw error
	}
})
	.use(authorize())
	.use(bodyValidator(schema))
	.use(errorHandler())
