require("dotenv").config()
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")

const s3Client = new S3Client({ region: "us-east-1" })

async function uploadToS3(fileName, data) {
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

	try {
		const result = await s3Client.send(new PutObjectCommand(s3Params))
		const statusCode = result.$metadata.httpStatusCode
		if (statusCode === 200) {
			const link = `https://${bucket}.s3.amazonaws.com/${folder}${newfileName}`
			return { link, fileExtension, statusCode }
		}
	} catch (error) {
		console.error("Error uploading to S3:", error)
		throw error
	}
}

function formatFileName(fileName, fileExtension) {
	fileName = fileName.substring(0, fileName.lastIndexOf("."))
	const newfileName = `${fileName
		.replace(/ /g, "")
		.toLowerCase()}_${Date.now()}.${fileExtension}`
	return newfileName
}

module.exports = {
	uploadToS3,
}
