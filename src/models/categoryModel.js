const db = require('./db.js');
const mysql = require('promise-mysql');
const fct = require('../util/fct.js');


exports.getNextToScrape = async () => {
  const res = await db.query(`SELECT * FROM category LEFT JOIN (SELECT categoryName,count(*) AS promptsScrapedCount FROM prompt GROUP BY categoryName) AS prompts ON category.name=prompts.categoryName WHERE IFNULL(promptsScrapedCount,0) < maxPromptsScraped ORDER BY lastScrapeDate ASC LIMIT 1`);

  if (res.length == 0)
    return null;
  else {
    await db.query(`UPDATE category SET lastScrapeDate=${Date.now()} WHERE name = ${mysql.escape(res[0].name)}`);
    return res[0];
  }
};

exports.getNextToGenerateImage = async () => {
  const res = await db.query(`SELECT * FROM category LEFT JOIN (SELECT categoryName,count(*) AS imagesCreatedCount FROM image GROUP BY categoryName) AS images ON category.name=images.categoryName WHERE IFNULL(imagesCreatedCount,0) < maxImagesCreated ORDER BY lastImageGenerationDate ASC LIMIT 1`);

  if (res.length == 0)
    return null;
  else {
    await db.query(`UPDATE category SET lastImageGenerationDate=${Date.now()} WHERE name = ${mysql.escape(res[0].name)}`);
    return res[0];
  }
};

exports.getRandom = async (count) => {
  const res = await db.query(`SELECT * FROM category ORDER BY RAND() LIMIT ${count}`);

  if (res.length > 0)
    return res[0];
  else
    return null;
};

exports.get = async (name) => {
  const res = await db.query(`SELECT * FROM category WHERE name = ${mysql.escape(name)}`);

  if (res.length > 0)
    return res[0];
  else
    return null;
};

exports.updateLastScraped = async (name) => {
  const res = await db.query(`UPDATE category SET lastScrapeDate= ${Date.now()} WHERE name=${mysql.escape(name)}`);

  return res;
};

exports.increment = async (name, field, value) => {
  const res = await db.query(`UPDATE category SET ${field} = ${field} + ${mysql.escape(value)} WHERE name=${mysql.escape(name)}`);

  return res;
};
