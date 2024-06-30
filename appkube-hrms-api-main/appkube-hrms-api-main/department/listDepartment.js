const { connectToDatabase } = require("../db/dbConnector")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const httpCors = require("@middy/http-cors")

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const client = await connectToDatabase()
	const query = `
                        SELECT 
                            id, name
                        FROM
                             department
                        WHERE
                            org_id = $1::uuid`
	const result = await client.query(query, [org_id])
	if (result.rowCount > 0) {
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
			body: JSON.stringify(result.rows),
		}
	} else {
		await client.end()
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify([]),
		}
	}
})
	.use(authorize())
	// .use(httpCors())
	.use(errorHandler())
