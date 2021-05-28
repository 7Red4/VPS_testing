const path = require('path')

module.exports = {
  entry: {
    upload: './s3/upload.js',
  },
  output: {
    filename: 'upload.bundle.js',
    path: path.resolve(__dirname, 's3'),
  }
};
