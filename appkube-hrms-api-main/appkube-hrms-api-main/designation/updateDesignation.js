const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")

const DesignationSchema = z.object({
	designation: z.string().min(3, {
		message: "designation name must be at least 3 characters long",
	}),
	id: z.number().int(),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const { designation, id } = JSON.parse(event.body)
	const client = await connectToDatabase()

	const result = await client.query(
		`UPDATE emp_designation SET designation = $1 WHERE id = $2 RETURNING *`,
		[designation, id],
	)
	if (result.rowCount === 0) {
		await client.end()
		return {
			statusCode: 404,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				message: "Designation not found",
			}),
		}
	}
	const updatedDesignation = result.rows[0]
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(updatedDesignation),
	}
})
	.use(authorize())
	.use(bodyValidator(DesignationSchema))
	.use(errorHandler())
