const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const reqSchema = z.object({
	designation: z.string().min(3, {
		message: "Designation name must be at least 3 characters long",
	}),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const { designation } = JSON.parse(event.body)
	const client = await connectToDatabase()
	const result = await client.query(
		`INSERT INTO emp_designation (designation, org_id) VALUES ($1, $2) RETURNING id, designation`,
		[designation, org_id],
	)
	const insertedDesignation = result.rows[0]
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT, DELETE",
			"Access-Control-Allow-Credentials": "true"
		},
		body: JSON.stringify(insertedDesignation),
	}
})
	.use(authorize())
	.use(bodyValidator(reqSchema))
	.use(errorHandler())
