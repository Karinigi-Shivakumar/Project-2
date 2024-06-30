const { connectToDatabase } = require("../db/dbConnector")
const middy = require("@middy/core")
const { errorHandler } = require("../util/errorHandler")
const { authorize } = require("../util/authorizer")

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const client = await connectToDatabase()

	const countQuery = `
        SELECT
            (
                SELECT COUNT(id) FROM employee WHERE org_id = $1
            ) AS employee_count,
            (
                SELECT COUNT(id) FROM projects_table WHERE org_id = $2
            ) AS project_count;
        `
	const countResult = await client.query(countQuery, [org_id, org_id])
	const employeeCount = countResult.rows[0].employee_count
	const projectCount = countResult.rows[0].project_count

	await client.end()
    console.log("db closed");
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({
			Totalemployees: employeeCount,
			Totalprojects: projectCount,
		}),
	}
})
	.use(authorize())
	.use(errorHandler())
