const { connectToDatabase } = require("../db/dbConnector")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const empId = event.pathParameters.emp_id
	const client = await connectToDatabase()

	const deleteQuery = `
            DELETE FROM employee
            WHERE id = $1 ;
        `
	const data = await client.query(deleteQuery, [empId, org_id])
	if (data.rowCount === 0) {
		await client.end()
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({ message: "content not available" }),
		}
	}
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({ message: "resource deleted successfully" }),
	}
})
	.use(authorize())
	.use(errorHandler())
