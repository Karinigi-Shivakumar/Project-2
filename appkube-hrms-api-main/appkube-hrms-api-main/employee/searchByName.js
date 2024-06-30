const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { queryParamsValidator } = require("../util/queryParamsValidator")

const nameSchema = z.object({
	name: z.string({ message: "Invalid employee name" }),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	const params = event.queryStringParameters?.name ?? null
	const client = await connectToDatabase()
	const query = `
            SELECT 
                e.*, 
                ed.*, 
                d.name AS department,
                et.type AS emp_type,
                edg.designation,
                ed.start_date
            FROM 
                employee e
            LEFT JOIN 
                emp_detail ed ON e.emp_detail_id = ed.id
            LEFT JOIN 
                department d ON ed.department_id = d.id
            LEFT JOIN 
                emp_type et ON ed.emp_type_id = et.id
            LEFT JOIN 
                emp_designation edg ON ed.designation_id = edg.id
            WHERE
                (e.first_name ILIKE '%' || $1 || '%' OR e.last_name ILIKE '%' || $1 || '%') AND
				e.org_id = $2
        `

	const res = await client.query(query, [params, org_id])
	const extractedData = res.rows.map(row => ({
		employee_name: `${row.first_name} ${row.last_name}`,
		employee_id: row.id,
		email_address: row.work_email,
		designation: row.designation,
		employee_type: row.emp_type,
		department: row.department,
		start_date: row.start_date,
	}))
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(extractedData),
	}
})
	.use(authorize())
	.use(queryParamsValidator(nameSchema))
	.use(errorHandler())
