const fs = require("fs");

exports.readFile = async function readFile(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "utf8", function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

exports.writeFile = async function writeFile(path) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, "", function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};
