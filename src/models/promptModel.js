const db = require('./db.js');
const mysql = require('promise-mysql');
const fct = require('../util/fct.js');

exports.getThreeMediumSizedPromptsByCategory = async (categoryName) => {
  const res = await db.query(`SELECT * FROM prompt WHERE
      categoryName = ${mysql.escape(categoryName)} AND LENGTH(sanitizedText) > 16 AND
      LENGTH(sanitizedText) < 256 ORDER BY RAND() LIMIT 3`);

  return res;
};

exports.getUnsanitizedPrompts = async (count) => {
  const res = await db.query(`SELECT categoryName,text FROM prompt WHERE sanitizedText = '' LIMIT ${count}`);

  return res;
};

exports.insertMulti = async (prompts) => {
  if (prompts.length == 0)
    return;

  const values = [];
  for (const prompt of prompts) {
    const tmp = [];
    for (const key of Object.keys(prompt))
      tmp.push(mysql.escape(prompt[key]));

    values.push('(' + tmp.join(',') + ')');
  }

  const res = await db.query(`INSERT IGNORE INTO prompt (${Object.keys(prompts[0]).join(',')}) VALUES ${values.join(',')}`);

  return res;
};

exports.updateSanitizedTexts = async (prompts) => {
  if (prompts.length == 0)
    return;

  const queries = [];
  for (const prompt of prompts) {
    queries.push('UPDATE prompt SET sanitizedText=' + mysql.escape(prompt.sanitizedText) + ' WHERE categoryName = ' + mysql.escape(prompt.categoryName) + ' AND text = ' + mysql.escape(prompt.text));
  }

  const res = await db.query(queries.join('; '));

  return res;
};
