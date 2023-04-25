const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const s3 = require("../config/s3_config").s3;
const directory = "../output/analyzed";
const bucket = process.env.BUCKET_TO_PROCESS;
const sharedService = require("../services/shared.service");

async function main() {
  await sharedService.writeFile("output/completed/successful.txt");
  await sharedService.writeFile("output/completed/notConverted.txt");

  var successfulLogFile = fs.createWriteStream(
    "output/completed/successful.txt",
    {
      flags: "a",
    }
  );

  var errorLogFile = fs.createWriteStream("output/completed/notConverted.txt", {
    flags: "a",
  });

  const content = await sharedService.readFile(directory + "/requireConversion.txt");
  var keys = content ? content.split(",") : [];
  if (keys.length) {
    keys.pop();
    for (let i = 0; i < keys.length; i++) {
      var key = keys[i];
      try {
        const url = await createSignedURL(key);
        const outputPath = key.substring(key.lastIndexOf("/") + 1);
        const outputExt = key.substring(key.lastIndexOf(".") + 1);
        await convertVideo(url, outputExt, outputPath, key)
          .then(() => {
            console.log("File Converted and Uploaded");
            successfulLogFile.write(
              "Successful converted and Uploaded: " + key + "\n"
            );
          })
          .catch((err) => {
            errorLogFile.write("Error conversion and uploading: " + key + "\n");
          });
      } catch (err) {
        console.log("caught error: ", err);
        errorLogFile.write("Error ffmpeg: " + key + "\n");
      }
    }
  }
}

async function createSignedURL(key) {
  return await s3.getSignedUrl("getObject", {
    Bucket: bucket,
    Key: key,
    Expires: 60 * 60 * 30,
  });
}

function convertVideo(url, outputExt, outputPath, key) {
  return new Promise(async (resolve, reject) => {
    var proc = await new ffmpeg({
      source: url,
    });
    await proc
      .setFfmpegPath("ffmpeg")
      .format(outputExt)
      .on("end", async () => {
        console.log("file has been converted successfully");
        const fileContent = fs.readFileSync(outputPath);
        await s3.upload(
          {
            Key: key,
            Bucket: bucket,
            Body: fileContent,
          },
          (err, res) => {
            if (err) {
              errorLogFile.write("Error uploading: " + key + "\n");
            } else {
              fs.unlinkSync(outputPath);
              resolve(true);
            }
          }
        );
      })
      .on("error", (err) => {
        errorLogFile.write("Error conversion: " + key + "\n");
      })
      .on("progress", (p) => console.log(p))
      .saveToFile(outputPath);
  });
}

main();
