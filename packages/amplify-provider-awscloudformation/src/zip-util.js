const extract = require('extract-zip');
const fs = require('fs-extra');
const path = require('path');
const { fileLogger } = require('../src/utils/aws-logger');
const logger = fileLogger('zip-util');

function downloadZip(s3, tempDir, zipFileName, envName) {
  return new Promise((resolve, reject) => {
    const log = logger('downloadZip.s3.getFile', [{ Key: zipFileName }, envName]);
    log();
    s3.getFile(
      {
        Key: zipFileName,
      },
      envName,
    )
      .then((objectResult, objectError) => {
        if (objectError) {
          reject(objectError);
          return;
        }

        fs.ensureDirSync(tempDir);

        const buff = Buffer.from(objectResult);
        const tempfile = `${tempDir}/${zipFileName}`;

        fs.writeFile(tempfile, buff, err => {
          if (err) {
            reject(err);
            return;
          }
          resolve(tempfile);
        });
      })
      .catch(e => {
        log(e);
        reject(e);
      });
  });
}

async function extractZip(tempdir, zipFile) {
  const filenameext = path.basename(zipFile);
  const filename = filenameext.split('.')[0];
  const unzippedDir = path.join(tempdir, filename);

  await extract(zipFile, { dir: unzippedDir });

  return unzippedDir;
}

module.exports = {
  downloadZip,
  extractZip,
};
