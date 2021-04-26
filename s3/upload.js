const s3config = {
  bucketName: "tfvirtualphoto",
  dirName: "customers",
  region: "us-east-2",
  accessKeyId: "AKIA4JTIAKNMJPDZFS7U",
  secretAccessKey: "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",
  s3Url: "https://tfvirtualphoto.s3.us-east-2.amazonaws.com",
};

const S3Client = new S3(s3config);


  /**
   * {
   *   Response: {
   *     bucket: "your-bucket-name",
   *     key: "photos/image.jpg",
   *     location: "https://your-bucket.s3.amazonaws.com/photos/image.jpg"
   *   }
   * }
   */
async function uploadS3(image, fileName) {
  try {
    return await S3Client.uploadFile(image, fileName);
  } catch (err) {
    console.error(err);
  }
}
