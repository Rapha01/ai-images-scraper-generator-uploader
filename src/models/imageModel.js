const db = require('./db.js');
const mysql = require('promise-mysql');
const fct = require('../util/fct.js');
const categoryModel = require('../models/categoryModel.js');
const config = require('../const/config.js');
const fs = require('fs');
const path = require('path');

exports.insert = async (image) => {
  const values = [];
  for (const key of Object.keys(image))
    values.push(mysql.escape(image[key]));

  const res = await db.query(`INSERT INTO image (${Object.keys(image).join(',')}) VALUES (${values.join(',')})`);

  return res;
};

exports.get = async (categoryName,promptText) => {
  const res = await db.query(`SELECT * FROM image WHERE categoryName = ${mysql.escape(categoryName)} AND promptText = ${mysql.escape(promptText)}`);

  if (res.length > 0)
    return res[0];
  else
    return null;
};

exports.getNextToDownload = async (promptText) => {
  const res = await db.query(`SELECT * FROM image WHERE downloaded = false ORDER BY createDate ASC LIMIT 1`);

  if (res.length > 0)
    return res[0];
  else
    return null;
};

exports.set = async (categoryName,promptText,field,value) => {
  const res = await db.query(`UPDATE image SET ${field} = ${mysql.escape(value)} WHERE categoryName =${mysql.escape(categoryName)} AND promptText=${mysql.escape(promptText)}`);

  return res;
};

exports.getNextImageToListForSale = async (platform) => {
  const res = await db.query(`SELECT * FROM image WHERE ${platform + 'Uploaded'} = true AND ${platform + 'Soldout'} = false AND  ${platform + 'ListForSaleUntilDate'} < ${Date.now()} AND  ${platform + 'Error'} = '' ORDER BY createDate ASC LIMIT 1`);

  if (res.length > 0)
    return res[0];
  else
    return null;
};

exports.getRandomOfCategory = async (categoryName) => {
  const res = await db.query(`SELECT * FROM image WHERE categoryName = ${mysql.escape(categoryName)} ORDER BY rand() LIMIT 1`);

  if (res.length > 0)
    return res[0];
  else
    return null;
};

exports.redoAllNftPrices = async () => {
  console.log('Starting redoAllNftPrices');

  const images = await db.query(`SELECT * FROM image`);

  for (const image of images) {
    await exports.set(image.categoryName,image.promptText,'nftPrice',fct.getNftPrice());
  }

  console.log('Finished redoAllNftPrices');
};

/*
exports.getNextToUpload = async (platform) => {
  let categoryFolderNames = fs.readdirSync(path.join(config.containerImagesFolderPath));
  categoryFolderNames = categoryFolderNames.sort((a, b) => 0.5 - Math.random());

  for (const categoryFolderName of categoryFolderNames) {
    const imageFileNames = fs.readdirSync(path.join(config.containerImagesFolderPath,categoryFolderName));
    const notUploadedSortedOutImages = await getNotUploadedSortedOut(platform,categoryFolderName);

    for (const image of notUploadedSortedOutImages) {
      const file = imageFileNames.find(fileName => fileName == image.promptText + '.' + image.format);
      if (file)
        return image;
    }
  }

  return null;
};
*/

exports.getNextToUpload = async (platform) => {
  const catgeories = await db.query(`SELECT * FROM category ORDER BY rand()`);

  let categoryFolderNames = fs.readdirSync(path.join(config.containerImagesFolderPath,'sortedout'));

  for (const category of catgeories) {
    if (!categoryFolderNames.includes(category.name))
      continue;

    if (platform == 'opensea' && category.collectionName == '')
      continue;

    const sortedOutImageFileNames = fs.readdirSync(path.join(config.containerImagesFolderPath,'sortedout',category.name));
    const notUploadedImages = await getNotUploaded(platform,category.name);

    for (const image of notUploadedImages) {
      const file = sortedOutImageFileNames.find(fileName => fileName == image.promptText + '.' + image.format);
      if (file)
        return image;
    }
  }

  return null;
};

const getNotUploaded = async (platform,categoryName) => {
  const category = await categoryModel.get(categoryName);
  if (!category)
    return [];

  const res = await db.query(`SELECT * FROM image WHERE categoryName = ${mysql.escape(categoryName)} AND ${platform + 'Uploaded'} = false AND ${platform + 'Error'} = '' ORDER BY createDate ASC`);

  return res;
};

/*
exports.getNextToUpscale = async () => {
  const categoryFolderNames = fs.readdirSync(path.join(config.containerImagesFolderPath));

  for (const categoryFolderName of categoryFolderNames) {
    const imageFileNames = fs.readdirSync(path.join(config.containerImagesFolderPath,categoryFolderName));
    const downloadedNotUpscaled = await getDownloadedNotUpscaled(categoryFolderName);

    for (const image of downloadedNotUpscaled) {
      const file = imageFileNames.find(fileName => fileName == image.promptText + '.' + image.format);
      if (file)
        return image;
    }
  }

  return null;
};

const getDownloadedNotUpscaled = async (categoryName) => {
  const category = await categoryModel.get(categoryName);
  if (!category)
    return [];

  const res = await db.query(`SELECT * FROM image WHERE categoryName = ${mysql.escape(categoryName)} AND downloaded = true AND upscaled = false ORDER BY createDate ASC`);

  return res;
};
*/
