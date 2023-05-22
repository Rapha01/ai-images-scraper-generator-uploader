const config = require('../const/config.js');
const fct = require('../util/fct.js');
const imageModel = require('../models/imageModel.js');
const fs = require('fs');
const path = require('path');
const client = require('https');

module.exports = async (page) => {
  const image = await imageModel.getNextToDownload();

  if (!image)
    return;

  const folderName = image.categoryName == '' ? 'none' : image.categoryName;
  if (!fs.existsSync(path.join(config.containerImagesFolderPath,'download',folderName)))
    fs.mkdirSync(path.join(config.containerImagesFolderPath,'download',folderName));

  //const fileName = Array.from(new Set((image.categoryPrefix + image.promptText).split(' '))).join(' ');
  const res = await downloadImage(image.url, path.join(config.containerImagesFolderPath,'download',folderName, image.promptText + '.png'));
  await imageModel.set(image.categoryName,image.promptText,'downloaded',true);
  console.log(`imageDownloader: Downloaded to category ${folderName} "${fct.limitString(image.promptText,20)}"`);
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    client.get(url, (res) => {
      if (res.statusCode === 200) {
        res.pipe(fs.createWriteStream(filepath))
          .on('error', reject)
          .once('close', () => resolve(filepath));
      } else {
        res.resume();
        reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
      }
    });
  });
}
