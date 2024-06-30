const { connectToDatabase } = require("../db/dbConnector")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const client = await connectToDatabase()
	const query = `
                SELECT 
                    id, type
                FROM
                     emp_type
                WHERE
                    org_id = $1::uuid`
	const result = await client.query(query, [org_id])
	if (result.rowCount > 0) {
		await client.end()
		return {
			statusCode: 200,
			body: JSON.stringify(result.rows),
		}
	} else {
		await client.end()
		return {
			statusCode: 200,
			body: JSON.stringify([]),
		}
	}
})
	.use(authorize())
	.use(errorHandler())
