const fs = require("fs");
const s3 = require("../config/s3_config").s3;
const directory = "../output/backup";
const directoryAnalyzed = "../output/analyzed";
const bucket = process.env.BUCKET_TO_PROCESS;
const backup_bucket = process.env.BACKUP_BUCKET;
const sharedService = require("../services/shared.service");

var backupLogsFile = fs.createWriteStream(directory + "/backedUpObjects.txt", {
  flags: "a",
});

var errorBackupLogsFile = fs.createWriteStream(
  directory + "/errorBackedUpObjects.txt",
  {
    flags: "a",
  }
);

async function main() {
  await sharedService.writeFile("output/backup/backedUpObjects.txt");
  await sharedService.writeFile("output/backup/errorBackedUpObjects.txt");
  const content = await sharedService.readFile(
    directoryAnalyzed + "/requireConversion.txt"
  );
  var keys = content ? content.split(",") : [];
  createBackups(keys);
}

async function createBackups(keys) {
  if (keys.length) {
    keys.pop();
    for (let i = 0; i < keys.length; i++) {
      console.log(keys[i], i);
      var key = keys[i];
      await takeBackup(key)
        .then(() => {
          backupLogsFile.write("Successfully backed up: " + key + "\n");
        })
        .catch(() => {
          errorBackupLogsFile.write("Error backing up: " + key + "\n");
        });
    }
  }
}

async function takeBackup(key) {
  return new Promise(async (resolve, reject) => {
    await s3.copyObject(
      {
        Bucket: backup_bucket,
        CopySource: bucket + "/" + key,
        Key: key,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      }
    );
  });
}

main();
