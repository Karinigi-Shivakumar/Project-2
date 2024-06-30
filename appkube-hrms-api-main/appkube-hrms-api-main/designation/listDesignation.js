const { connectToDatabase } = require("../db/dbConnector")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")

const letDesignations = async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const client = await connectToDatabase()
	const query = `
                        SELECT 
                            id, designation
                        FROM
                             emp_designation
                        WHERE
                            org_id = $1::uuid`
	const result = await client.query(query, [org_id])
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(result.rows),
	}
}

const handler = middy(letDesignations).use(authorize()).use(errorHandler())

module.exports = { handler }
