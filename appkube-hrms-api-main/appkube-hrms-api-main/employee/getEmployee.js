const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { pathParamsValidator } = require("../util/pathParamsValidator")

const idSchema = z.object({
	id: z.string().uuid({ message: "Invalid employee id" }),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const employeeId = event.pathParameters.id
	const client = await connectToDatabase()

	const query = `
	SELECT
    o.id AS org_id,
    o.*, 
    e.id AS emp_id,
    e.*, 
    a.id AS address_id,
    a.*, 
    ed.id AS emp_detail_id,
    ed.*, 
    d.name AS department_name,
    et.type AS emp_type,
    edg.id AS emp_designation_id,
    edg.designation AS emp_designation,
    m.first_name AS reporting_manager_first_name,
    m.last_name AS reporting_manager_last_name,
    jsonb_agg(doc.*) AS documents,
    (
        SELECT
            jsonb_agg(jsonb_build_object('id', eq.id,'owner', eq.owner,'device_type_name', dt.name,
                'serial_number', eq.serial_number,
                'note', eq.note,
                'supply_date', eq.supply_date, 'device_type_name', dt.name))
        FROM
            equipment eq
        LEFT JOIN
            device_type dt ON eq.device_type_id = dt.id
        WHERE
            eq.emp_id = e.id
    ) AS equipments-- Aggregate equipment details along with device type name
FROM
    employee e
LEFT JOIN
    address a ON e.id = a.emp_id
LEFT JOIN
    emp_detail ed ON e.id = ed.emp_id
LEFT JOIN
    department d ON ed.department_id = d.id
LEFT JOIN
    emp_type et ON ed.emp_type_id = et.id
LEFT JOIN
    emp_designation edg ON ed.designation_id = edg.id
LEFT JOIN
    employee m ON ed.reporting_manager_id = m.id
LEFT JOIN
    document doc ON doc.emp_id = e.id
LEFT JOIN
    organisation o ON e.org_id = o.id  
WHERE
    e.id = $1::uuid
GROUP BY
    o.id, e.id, a.id, ed.id, d.name, et.type, edg.id, m.first_name, m.last_name`

	const result = await client.query(query, [employeeId])
	console.log(JSON.stringify(result.rows[0]))
	await client.end()

	const formattedResult = {
		personal_information: {},
		organization_details: {},
		professional_information: {},
		documents: [],
		equipment: [],
	}
	const data = result.rows[0]
	formattedResult.personal_information = {
		id: data.emp_id,
		email: data.email,
		work_email: data.work_email,
		image: data.image,
		first_name: data.first_name,
		last_name: data.last_name,
		gender: data.gender,
		dob: data.dob,
		number: data.number,
		emergency_number: data.emergency_number,
		highest_qualification: data.highest_qualification,
		address_id: data.address_id,
		address_line_1: data.address_line_1,
		address_line_2: data.address_line_2,
		landmark: data.landmark,
		country: data.country,
		state: data.state,
		city: data.city,
		zipcode: data.zipcode,
	}
	formattedResult.organization_details = {
		org_id: data.org_id,
		org_name: data.name,
		work_email: data.work_email,
		org_logo: data.logo || "",
		org_address_line_1: data.address_line_1,
		org_address_line_2: data.address_line_2,
		org_contact: data.number,
		org_country: data.country,
		org_city: data.city,
		org_state: data.state,
		org_Zipcode: data.zipcode,
	}
	formattedResult.professional_information = {
		emp_detail_id: data.emp_detail_id,
		designation_id: data.emp_designation_id,
		pf: data.pf,
		uan: data.uan,
		department_id: data.department_id,
		reporting_manager_id: data.reporting_manager_id,
		emp_type_id: data.emp_type_id,
		work_location: data.work_location,
		start_date: data.start_date,
		department_name: data.department_name,
		emp_type: data.emp_type,
		emp_designation_id: data.emp_designation_id,
		emp_designation: data.emp_designation,
		reporting_manager_first_name: data.reporting_manager_first_name || "",
		reporting_manager_last_name: data.reporting_manager_last_name || "",
	}

	formattedResult.documents = data.documents || []
	formattedResult.equipment = data.equipments || []

	formattedResult.documents = Object.values(formattedResult.documents)
	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify(formattedResult),
	}
})
	.use(authorize())
	.use(pathParamsValidator(idSchema))
	.use(errorHandler())
