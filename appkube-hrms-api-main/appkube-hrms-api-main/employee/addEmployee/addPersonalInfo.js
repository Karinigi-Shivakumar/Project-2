const { connectToDatabase } = require("../../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../../util/authorizer")
const { errorHandler } = require("../../util/errorHandler")
const { bodyValidator } = require("../../util/bodyValidator")

const requestBodySchema = z.object({
	first_name: z
		.string()
		.min(3, { message: "first_name must be at least 3 characters long" }),
	last_name: z
		.string()
		.min(3, { message: "last_name must be at least 3 characters long" }),
	email: z.string().email().optional(),
	work_email: z.string().email().optional(),
	gender: z.string().min(1),
	dob: z.coerce.date(),
	number: z.string(),
	emergency_number: z.string().optional(),
	highest_qualification: z.string().optional(),
	address_line_1: z.string().optional(),
	address_line_2: z.string().optional(),
	landmark: z.string().optional(),
	country: z.string().optional(),
	state: z.string().optional(),
	city: z.string().optional(),
	zipcode: z.string().optional(),
	emp_type: z.number().int().optional(),
	image: z.string().optional().default(""),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const requestBody = JSON.parse(event.body)
	const org_id = event.user["custom:org_id"]
	const currentTimestamp = new Date().toISOString()

	const personalInfoQuery = `
        INSERT INTO employee 
            ( first_name, last_name, email, work_email, gender, dob, number, emergency_number,
            highest_qualification, image,  org_id, invitation_status )
        VALUES
            ($1,$2,$3,$4,$5,$6,$7, $8, $9, $10, $11, $12)
        returning *
            `
	const empAddressQuery = `
            INSERT INTO address
                (address_line_1, address_line_2, landmark, country, state ,city,zipcode, emp_id)
            VALUES
                ($1,$2,$3,$4,$5,$6,$7, $8)
            returning *
            `

	const empProfessionalQuery = `
            INSERT INTO emp_detail
                (emp_id, emp_type_id)
            VALUES
                ($1,$2)
            RETURNING emp_detail.*, (
                SELECT type
                FROM emp_type
                WHERE id = $2
            ) AS emp_type_name
        `

	const client = await connectToDatabase()
	await client.query("BEGIN")
	try {
		const personalInfoQueryResult = await new Promise((resolve, reject) => {
			client.query(
				personalInfoQuery,
				[
					requestBody.first_name,
					requestBody.last_name,
					requestBody.email,
					requestBody.work_email,
					requestBody.gender,
					requestBody.dob,
					requestBody.number,
					requestBody.emergency_number,
					requestBody.highest_qualification,
					requestBody.image,
					org_id,
					"DRAFT",
				],
				(err, res) => {
					if (err) {
						reject(err)
					} else {
						resolve(res)
					}
				},
			)
		})

		const [empAddressQueryResult, empProfessionalQueryResult] =
			await Promise.all([
				new Promise((resolve, reject) => {
					client.query(
						empAddressQuery,
						[
							requestBody.address_line_1,
							requestBody.address_line_2,
							requestBody.landmark,
							requestBody.country,
							requestBody.state,
							requestBody.city,
							requestBody.zipcode,
							personalInfoQueryResult.rows[0].id,
						],
						(err, res) => {
							if (err) {
								reject(err)
							} else {
								resolve(res)
							}
						},
					)
				}),
				new Promise((resolve, reject) => {
					client.query(
						empProfessionalQuery,
						[
							personalInfoQueryResult.rows[0].id,
							requestBody.emp_type,
						],
						(err, res) => {
							if (err) {
								reject(err)
							} else {
								resolve(res)
							}
						},
					)
				}),
			])
		const dobDate = personalInfoQueryResult.rows[0].dob.toISOString()
		const dobWithoutTime = dobDate.slice(0, 10)
		const res = {
			personalInfoQueryResult: {
				...personalInfoQueryResult.rows[0],
				dob: dobWithoutTime,
				emp_detail_id: undefined,
				current_task_id: undefined,
				access_token: undefined,
				refresh_token: undefined,
				role_id: undefined,
				invitation_status: undefined,
				org_id: undefined,
			},
			empAddressQueryResult: {
				...empAddressQueryResult.rows[0],
				id: undefined,
				emp_id: undefined,
			},
			empProfessionalQueryResult: {
				...empProfessionalQueryResult.rows[0],
				id: undefined,
				emp_id: undefined,
				designation_id: undefined,
				reporting_manager_id: undefined,
				employee_id: undefined,
			},
		}
		await client.query("COMMIT")
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Credentials": true,
			},
			body: JSON.stringify({
				...res.personalInfoQueryResult,
				...res.empAddressQueryResult,
				...res.empProfessionalQueryResult,
				id: personalInfoQueryResult.rows[0].id,
			}),
		}
	} catch (error) {
		await client.query("ROLLBACK")
		throw error
	} finally {
		await client.end()
	}
})
	.use(authorize())
	.use(bodyValidator(requestBodySchema))
	.use(errorHandler())
