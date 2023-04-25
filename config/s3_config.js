require("dotenv").config();

const AWS = require("aws-sdk");
exports.s3 = new AWS.S3({
  region: process.env.BUCKET_LOCATION,
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_ID,
    secretAccessKey: process.env.BUCKET_SECRET_KEY,
  },
});
