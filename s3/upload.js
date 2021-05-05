const S3 = require("aws-s3");

const s3configResults = {
  bucketName: "tfvirtualphoto",
  dirName: "Customers/Results",
  region: "us-east-2",
  accessKeyId: "AKIA4JTIAKNMJPDZFS7U",
  secretAccessKey: "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",
  s3Url: "https://tfvirtualphoto.s3.us-east-2.amazonaws.com",
};

const s3configUnknown = {
  bucketName: "tfvirtualphoto",
  dirName: "Customers/Results",
  region: "us-east-2",
  accessKeyId: "AKIA4JTIAKNMJPDZFS7U",
  secretAccessKey: "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",
  s3Url: "https://tfvirtualphoto.s3.us-east-2.amazonaws.com",
};

/**
  bucketName : tfvirtualphoto
  dirName : Customers/Results (有揭露)
  dirName : Customers/Unknown (未揭露) 
  region : us-east-2
  accessKeyId : AKIA4JTIAKNMJPDZFS7U
  secretAccessKey : 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
  s3Url : https://tfvirtualphoto.s3.us-east-2.amazonaws.com
 */

window.S3ClientResults = new S3(s3configResults);
window.S3ClientUnknown = new S3(s3configUnknown);

/**
 * {
 *   Response: {
 *     bucket: "your-bucket-name",
 *     key: "photos/image.jpg",
 *     location: "https://your-bucket.s3.amazonaws.com/photos/image.jpg"
 *   }
 * }
 */
