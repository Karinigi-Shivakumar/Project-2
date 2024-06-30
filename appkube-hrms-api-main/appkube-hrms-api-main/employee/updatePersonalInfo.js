const { connectToDatabase } = require("../db/dbConnector")
const { z } = require("zod")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")
const { pathParamsValidator } = require("../util/pathParamsValidator")

const idSchema = z.object({
	id: z.string().uuid({ message: "Invalid employee id" }),
})

const requestBodySchema = z.object({
	first_name: z
		.string()
		.min(3, { message: "first_name must be at least 3 characters long" }),
	last_name: z
		.string()
		.min(3, { message: "last_name must be at least 3 characters long" }),
	email: z.string().email().optional(),
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
	image: z.string().optional(),
})

const personalInfoQuery = `
			UPDATE employee
			SET first_name = COALESCE($1, first_name),
				last_name = COALESCE($2, last_name),
				email = COALESCE($3, email),
				work_email = COALESCE($4, work_email),
				gender = COALESCE($5, gender),
				dob = COALESCE($6, dob),
				number = COALESCE($7, number),
				emergency_number = COALESCE($8, emergency_number),
				highest_qualification = COALESCE($9, highest_qualification),
				image = COALESCE($10, image),
				updated_at = $11
			WHERE id = $12;
		`

const addressQuery = `
		UPDATE address
		SET address_line_1 = COALESCE($1, address_line_1),
			address_line_2 = COALESCE($2, address_line_2),
			landmark = COALESCE($3, landmark),
			country = COALESCE($4, country),
			state = COALESCE($5, state),
			city = COALESCE($6, city),
			zipcode = COALESCE($7, zipcode)
		WHERE emp_id = $8;        `

exports.handler = middy(async (event, context) => {
	const requestBody = JSON.parse(event.body)
	requestBody.id = event.pathParameters.id
	const currentTimestamp = new Date().toISOString()	
	const client = await connectToDatabase()
	await client.query("BEGIN")
	try {
		const personalInfoQueryResult = await client.query(personalInfoQuery, [
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
			currentTimestamp,
			requestBody.id,
		])
		const addressQueryResult = await client.query(addressQuery, [
			requestBody.address_line_1,
			requestBody.address_line_2,
			requestBody.landmark,
			requestBody.country,
			requestBody.state,
			requestBody.city,
			requestBody.zipcode,
			requestBody.id,
		])
		await client.query("COMMIT")
		return {
			statusCode: 200,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				message: "user details updated successfully"
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
	.use(pathParamsValidator(idSchema))
	.use(bodyValidator(requestBodySchema))
	.use(errorHandler())
