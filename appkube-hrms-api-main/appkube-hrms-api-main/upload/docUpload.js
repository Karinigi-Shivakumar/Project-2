require("dotenv").config()
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")
const middy = require("@middy/core")
const { authorize } = require("../util/authorizer")
const { errorHandler } = require("../util/errorHandler")
const { bodyValidator } = require("../util/bodyValidator")
const { z } = require("zod")

const s3Client = new S3Client({ region: "us-east-1" })

const reqSchema = z.object({
	fileName: z.string(),
	data: z.string(),
})

exports.handler = middy(async (event, context) => {
	context.callbackWaitsForEmptyEventLoop = false
	const body = JSON.parse(event.body)
	const fileName = body.fileName
	const data = body.data
	const contentType = data.split(";")[0].split(":")[1]
	const fileExtension = contentType.split("/")[1]
	const newfileName = formatFileName(fileName, fileExtension)
	const bucket = process.env.BUCKET_NAME
	const folder = process.env.BUCKET_FOLDER_NAME
	const buffer = Buffer.from(data.split(",")[1], "base64")
	const s3Params = {
		Bucket: bucket,
		Key: `${folder}${newfileName}`,
		Body: buffer,
		ContentType: contentType,
	}

	await s3Client.send(new PutObjectCommand(s3Params))
	const link = `https://${bucket}.s3.amazonaws.com/${folder}${newfileName}`

	return {
		statusCode: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
		},
		body: JSON.stringify({ link }),
	}
})
	.use(authorize())
	.use(bodyValidator(reqSchema))
	.use(errorHandler())

const formatFileName = (fileName, fileExtension) => {
	fileName = fileName.substring(0, fileName.lastIndexOf("."))
	const newfileName = `${fileName
		.replace(/ /g, "")
		.toLowerCase()}_${Date.now()}.${fileExtension}`
	return newfileName
}
