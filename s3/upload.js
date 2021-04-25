const s3config = {
  bucketName: "tfvirtualphoto",
  dirName: "customers",
  region: "us-east-2",
  accessKeyId: "AKIA4JTIAKNMJPDZFS7U",
  secretAccessKey: "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",
  s3Url: "https://tfvirtualphoto.s3.us-east-2.amazonaws.com",
};


async function uploadS3(keyname, image) {
  try {
    const body = new FormData();
    body.append(keyname, image);

    await $.ajax({
      url: `${s3config.s3Url}?AWSAccessKeyId=${s3config.accessKeyId}&Signature=${s3config.secretAccessKey}`,
      contentType: "image/png",
      method: "put",
      data: body,
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
