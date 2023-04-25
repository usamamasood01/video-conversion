const fs = require("fs");
const probe = require("node-ffprobe");
const s3 = require("../config/s3_config").s3;
const sharedService = require("../services/shared.service");

// Change probe file name based on OS
probe.FFPROBE_PATH = "ffprobe";

const { performance } = require("perf_hooks");

// CONFIGS:
const BUCKET_NAME = process.env.BUCKET_TO_PROCESS;

init();
async function init() {
  await sharedService.writeFile("output/analyzed/requireConversion.txt");
  await sharedService.writeFile("output/analyzed/skippedVideos.txt");
  await sharedService.writeFile("output/analyzed/errors.txt");

  console.log(
    "...................................................................................."
  );
  console.log(
    "...................................................................................."
  );
  console.log(
    "...........................Initializing video conversion script......................"
  );
  console.log(
    "...................................................................................."
  );
  console.log(
    "...................................................................................."
  );

  console.log("Analyzing bucket objects...");
  videoCodecs(BUCKET_NAME);
}

function printProgress(progress) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(progress);
}
async function mkdirpath(dirPath) {
  console.log(dirPath);
  await fs.mkdirSync(dirPath, { recursive: true });
}

async function videoCodecs(bucket) {
  var pendingVideoConversion = [];
  var skippedVideos = [];
  var probeErrors = [];

  function _isVideo(key) {
    if (!key) return false;

    return (
      key.endsWith(".mov") ||
      key.endsWith(".mp4") ||
      key.endsWith(".MOV") ||
      key.endsWith(".MP4")
    );
  }

  function _getVideoStreamFromProbe(probe) {
    if (!probe || !probe.streams || !probe.streams.length) return null;

    return probe.streams.filter((stream) => stream.codec_type === "video");
  }
  function _getCodecNameFromVideoStream(probe) {
    const stream = _getVideoStreamFromProbe(probe);
    if (!stream || stream.length == 0) return null;
    return {
      codec_name: stream[0].codec_name,
      codec_long_name: stream[0].codec_long_name,
    };
  }
  function _isSupportedCodec(probe, codec = "h264") {
    const stream = _getVideoStreamFromProbe(probe);
    if (stream || stream.length > 0) {
      return stream[0].codec_name === codec;
    } else {
      false;
    }
  }
  function _getLogDirectory() {
    var d = new Date();
    var datestring =
      d.getDate() +
      "-" +
      (d.getMonth() + 1) +
      "-" +
      d.getFullYear() +
      "T" +
      d.getHours() +
      ":" +
      d.getMinutes();
    const directory = "../output/analyzed";
    return directory;
  }
  var t0 = performance.now();
  const directory = _getLogDirectory();
  // mkdirpath(directory);

  var requireConversionFile = fs.createWriteStream(
    directory + "/requireConversion.txt",
    {
      flags: "a",
    }
  );
  var skippedVideosFile = fs.createWriteStream(
    directory + "/skippedVideos.txt",
    {
      flags: "a",
    }
  );
  var errorsFile = fs.createWriteStream(directory + "/errors.txt", {
    flags: "a",
  });

  for await (const contents of ListObjects(s3, {
    MaxKeys: 1000,
    Bucket: bucket,
  })) {
    const keys = contents.map(({ Key }) => Key);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      printProgress("Analyzing: " + key);
      if (_isVideo(key)) {
        const url = await s3.getSignedUrl("getObject", {
          Bucket: bucket,
          Key: key,
          Expires: 60 * 60 * 30,
        });
        const probeData = await probe(url);
        if (!probeData.error) {
          if (!_isSupportedCodec(probeData)) {
            pendingVideoConversion.push(key);
            requireConversionFile.write(key + ",");
          } else {
            skippedVideos.push({
              key,
              streams: _getCodecNameFromVideoStream(probeData),
            });
            skippedVideosFile.write(
              JSON.stringify({
                key,
                streams: _getCodecNameFromVideoStream(probeData),
              }) + ",\n"
            );
          }
        } else {
          probeErrors.push({
            key,
            error: probeData.error,
          });
          printProgress("Analyzing: " + key);
          errorsFile.write(
            JSON.stringify({
              key,
              error: probeData.error,
            }) + ",\n"
          );
        }
      }
    }
  }

  requireConversionFile.end();
  skippedVideosFile.end();
  errorsFile.end();
  printProgress("Analyzing took: ");

  var t1 = performance.now();
  console.log(Math.floor((t1 - t0) / 1000) / 60 + " minutes.");

  console.log("pendingVideoConversion", pendingVideoConversion);
  console.log("see output/analyzed directory for details");
}

async function* ListObjects(s3, params) {
  let isTruncated = false;
  let token;
  do {
    const response = await s3
      .listObjectsV2({
        ...params,
        ContinuationToken: token,
      })
      .promise();
    yield response.Contents;

    ({ IsTruncated: isTruncated, NextContinuationToken: token } = response);
  } while (isTruncated);
}
