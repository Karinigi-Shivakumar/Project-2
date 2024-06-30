const {
	SchedulerClient,
	GetScheduleCommand,
	UpdateScheduleCommand,
} = require("@aws-sdk/client-scheduler")
const { connectToDatabase } = require("../db/dbConnector")
require("dotenv").config()
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const schema = z.object({
	timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/),
	id: z.string().uuid(),
})
const getQuery = "SELECT scheduler FROM invite WHERE employee_id = $1"

const updateScheduledTime = `
                        UPDATE invite SET 
                        scheduled_time = $1
                        WHERE employee_id = $2
                        RETURNING scheduled_time ;`

exports.handler = middy(async (event, context) => {
	const client = new SchedulerClient({ region: "us-east-1" })
	const requestBody = JSON.parse(event.body)
	console.log(requestBody)
	const employee_id = requestBody.id
	const timestamp = requestBody.timestamp
	console.log(timestamp)
	const client1 = await connectToDatabase()
	const result = await client1.query(getQuery, [employee_id])
	console.log(result.rows[0].scheduler)
	const getinput = {
		// GetScheduleInput
		Name: result.rows[0].scheduler, // required
	}
	const getcommand = new GetScheduleCommand(getinput)
	const response1 = await client.send(getcommand)
	;(response1.ScheduleExpression = `at(${timestamp})`),
		(response1.Target.Input.timestamp = timestamp)
	const input = response1
	const command = new UpdateScheduleCommand(input)
	const response = await client.send(command)
	console.log(response)
	const result1 = await client1.query(updateScheduledTime, [
		timestamp,
		employee_id,
	])
	console.log(result1)
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Credentials": true,
		},
		body: JSON.stringify({
			message: `user invite updated to be scheduled at ${timestamp}`,
		}),
	}
})
	.use(authorize())
	.use(errorHandler())
	.use(bodyValidator(schema))
