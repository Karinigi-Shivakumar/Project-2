const { connectToDatabase } = require("../db/dbConnector")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const org_id = event.user["custom:org_id"]
	let page = event.queryStringParameters?.page ?? null
	if (page == null) {
		page = 1
	}
	page = parseInt(page)
	const limit = 10
	let offset = (page - 1) * 10
	offset = Math.max(offset, 0)
	const client = await connectToDatabase()
	const totalPagesQuery = `
                SELECT COUNT(*) AS total_count
                FROM employee e
                LEFT JOIN emp_detail ed2 ON e.emp_detail_id = ed2.id
                LEFT JOIN emp_designation ed ON ed2.designation_id = ed.id
                LEFT JOIN emp_type et ON ed2.emp_type_id = et.id
				WHERE e.org_id = $1
    `
	const query = `
                SELECT
					e.id,
                    e.first_name,
                    e.last_name,
					e.dob,
					e.gender,
					e.number,
					e.emergency_number,
					e.highest_qualification,
                    e.email,
					e.work_email,
                    e.invitation_status,
                    e.image,
                    ed.designation,
                    ed2.employee_id,
                    et.type AS emp_type
                FROM
                    employee e
                LEFT JOIN emp_detail ed2 ON e.id = ed2.emp_id
                LEFT JOIN emp_designation ed ON ed2.designation_id = ed.id
                LEFT JOIN emp_type et ON ed2.emp_type_id = et.id
                LEFT JOIN department d ON ed2.department_id = d.id
				WHERE
                  e.org_id = $1
                ORDER BY e.first_name 
                LIMIT 10 OFFSET ${offset}
    `
	const totalPagesResult = await client.query(totalPagesQuery, [org_id])
	const totalRecords = totalPagesResult.rows[0].total_count
	const totalPages = Math.ceil(totalRecords / limit)
	const EmployeeMetaData = await client.query(query, [org_id])
	const resultArray = EmployeeMetaData.rows.map(row => ({
		id: row.id,
		employee_name: `${row.first_name} ${row.last_name}`,
		employee_status: row.invitation_status,
		designation: row.designation,
		employee_type: row.emp_type,
		image: row.image || "",
		first_name: row.first_name,
		last_name: row.last_name,
		dob: row.dob,
		gender: row.gender,
		number: row.number,
		emergency_number: row.emrgency_number,
		email: row.email,
		work_email: row.work_email,
		highest_qualification: row.highest_qualification,
	}))
	await client.end()
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({
			totalPages: totalPages,
			currentPage: page,
			employees: resultArray,
		}),
	}
})
	.use(authorize())
	.use(errorHandler())
