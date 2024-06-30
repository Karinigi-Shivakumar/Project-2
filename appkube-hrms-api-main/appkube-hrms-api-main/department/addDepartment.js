const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const reqSchema = z.object({
	name: z.string().min(3, {
		message: "Department name must be at least 3 characters long",
	}),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const requestBody = JSON.parse(event.body)
	const { name } = requestBody
	const client = await connectToDatabase()
	const result = await client.query(
		`INSERT INTO department (name, org_id) VALUES ($1, $2) RETURNING id, name`,
		[name, org_id],
	)
	const insertedDepartment = result.rows[0]
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(insertedDepartment),
	}
})
	.use(authorize())
	.use(bodyValidator(reqSchema))
	.use(errorHandler())
