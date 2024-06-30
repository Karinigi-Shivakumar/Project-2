const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const reqSchema = z.object({
	type: z.string().min(3, {
		message: "type must be at least 3 characters long",
	}),
})
exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const { type } = JSON.parse(event.body)
	const client = await connectToDatabase()
	const result = await client.query(
		`INSERT INTO emp_type (type, org_id) VALUES ($1, $2) RETURNING *`,
		[type, org_id],
	)
	const insertedEmptype = result.rows[0]
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(insertedEmptype),
	}
})
	.use(authorize())
	.use(bodyValidator(reqSchema))
	.use(errorHandler())
