const config = require('../const/config.js');
const fct = require('../util/fct.js');
const promptModel = require('../models/promptModel.js');
const unidecode = require('unidecode');

module.exports = async (count) => {
  //console.log('SanitizePrompts.');
  const prompts = await promptModel.getUnsanitizedPrompts(count);
  if (prompts.length == 0)
    return;

  for (const prompt of prompts)
    prompt.sanitizedText = sanitizePromptText(prompt.text);

  await promptModel.updateSanitizedTexts(prompts);
  console.log('sanitizePrompts: Sanitized ' + prompts.length + ' prompts.');
  //console.log(unsanitizedPrompts);
}

const sanitizePromptText = (text) => {
  //const intermediates = ['and', 'by', 'a', 'to', 'so', 'the', 'in', 'to', 'for', 'from', 'on', 'as', 'of', 'at', ''];
  text = unidecode(text);
  let regExpPatterns = [
    '<.*>','Upscaled by', ';',':','\\+','/', '\\.','4K','4k','8K','8k','12K','12k','16K','16k','32K','32k','!',
    '\\*',',','\\[.*\\]','"','\\(.*\\)'
  ];
  for (const pattern of regExpPatterns)
    text = text.replace(new RegExp(`${pattern}`, 'g'),'');


  const removeWords = ['-', '|'];
  const temp = [], params = [];
  for (let word of text.split(' ')) {
    if (removeWords.indexOf(word) != -1)
      continue;

    //word = word.replace(new RegExp(`\\s`, 'g'),'');
    if (word == '' || word.startsWith('-'))
      continue;
    if (countNumbers(word) > 4)
      continue;

    if (word == 'by')
      break;

    temp.push(word);
  }

  text = temp.join(' ').toLowerCase();

  if (text == '')
    text = 'n/a';

  return text;
}

const countNumbers = (string) => {
  let n = 0;
  for (const s of string) {
    if (Number.isInteger(parseInt(s)))
      n++;
  }
  return n;
}
