const config = require('../const/config.js');
const fct = require('../util/fct.js');
const promptModel = require('../models/promptModel.js');
const categoryModel = require('../models/categoryModel.js');
const imageModel = require('../models/imageModel.js');

module.exports = async (discordClient) => {
  const promptRes = await createPromptText();
  if (!promptRes)
    return
  const { category, promptText } = promptRes;

  await generateImage(discordClient,category,promptText);
}

const generateImage = async (discordClient,category,promptText) => {

  const fullPromptText = fct.assembleFullPromptText(category,promptText);
  console.log('imageGeneration: Sending slash command with fullPromptText: "' + fullPromptText + '"');

  const channel = discordClient.channels.cache.get(config.autoImageGenerationChannelId);
  await channel.sendSlash(config.midJourneyBotId, 'imagine', fullPromptText);
  discordClient.appData.imageGenerationCache.push({category,promptText});
}

const createPromptText = async () => {
  let category = await categoryModel.getNextToGenerateImage();

  if (!category) {
    console.log('imageGeneration: No valid category found.');
    return null;
  }

  const firstCategoryName = category.name;
  let promptText = await createPromptTextInCategory(category);

  while (true) {
    promptText = await createPromptTextInCategory(category);

    if (promptText != null) {
      //console.log('imageGeneration: Synthesized:\n  category: "' + category.name + '"\n  promptText: "' + promptText + '"' + '\n  parameters: "' + parameters + '"');
      return { promptText, category };
    }

    category = await categoryModel.getNextToGenerateImage();
    if (category.name == firstCategoryName) {
      console.log('imageGeneration: createPromptText unsuccessfull in all Categories!');
      return null;
    }
  }
}

const createPromptTextInCategory = async (category) => {
  for (let i = 0; i < 5; i++) {
    const prompts = await promptModel.getThreeMediumSizedPromptsByCategory(category.name);

    if (prompts.length < 3) {
      //console.log('imageGeneration: Did not find three medium sized prompts in category ' + category.name);
      return null;
    }

    let newPromptText = '';
    const p1 = prompts[0].sanitizedText.split(' ');
    const p2 = prompts[1].sanitizedText.split(' ');
    const p3 = prompts[2].sanitizedText.split(' ');

    newPromptText += p1.slice(0,Math.floor(p1.length / 3)).join(' ') + ' ';
    newPromptText += p2.slice(Math.floor(p2.length / 3),Math.floor(2 * p2.length / 3)).join(' ') + ' ';
    newPromptText += p3.slice(Math.floor(2 * p3.length / 3),Math.floor(p3.length - 1)).join(' ');

    newPromptText = Array.from(new Set(newPromptText.split(' '))).join(' ');
    //newPromptText = newPromptText.replace(category.promptPrefix, '');
    //newPromptText = newPromptText.trim();
    newPromptText = addPromptPrefixIfNotAlreadyPartOfPromptText(category.promptPrefix, newPromptText);

    newPromptText = fct.limitStringFullWords(newPromptText,250);

    const image = await imageModel.get(category.name,newPromptText);
    if (!image)
      return newPromptText;
  }
  console.log('imageGeneration: 5x Duplicate newPromptText generated - Skipping category ' + category.name + ' for now.');
  await fct.sleep(1);
  return null;
}

const addPromptPrefixIfNotAlreadyPartOfPromptText = (promptPrefix,promptText) => {
  let title = promptText;
  if (promptPrefix != '') {
    for (const prefix of promptPrefix.split(' ').reverse()) {
      if (!title.includes(prefix) && !title.includes(prefix + 's') && !title.includes(prefix + 'es'))
        title = prefix + ' ' + title;
    }
  }
  return title;
}

/*
* Wait for suggestion pictures
*/
/*
console.log('ImageGeneration: Generate suggestion pictures.');
let message, i;
for (i=0;i<120;i++) {
  message = (await channel.messages.fetch({limit: 1})).first();

  const hasPercentage = (new RegExp('\\(\[0\-9\][0\-9\]\?%\\)')).test(message.content);
  const isFinished = message.content.includes(promptText) && !message.content.includes('(Waiting to start)') &&
                     !message.content.includes('(paused)') && !hasPercentage;
  if (isFinished)
    break;

  await fct.sleep(1000);
}
if (i >= 120) {
  console.log('ImageGeneration: Generate suggestion pictures unsuccessfull.');
  return;
}*/

/*
* Wait for upscaling
*/
/*await fct.sleep(fct.between(2000,5000));
const row = 0, col = fct.between(0,3);
await message.clickButton({ row, col });

console.log('ImageGeneration: Generate upscaled image.');
for (i=0;i<180;i++) {
  message = (await channel.messages.fetch({limit: 1})).first();

  const isFinished = message.content.includes(promptText) && message.content.includes('Upscaled by');
  if (isFinished)
    break;

  await fct.sleep(1000);
}
if (i >= 180) {
  console.log('ImageGeneration: Generate upscaled image unsuccessfull.');
  return;
}*/

/*
* Wait for upscaling light
*/
/*await fct.sleep(fct.between(2000,5000));
await message.clickButton({ row:0, col:1 });

console.log('ImageGeneration: Generate upscaled (light) image.');
for (i=0;i<180;i++) {
  message = (await channel.messages.fetch({limit: 1})).first();

  const isFinished = message.content.includes(promptText) && message.content.includes('Upscaled (Light) by');
  if (isFinished)
    break;

  await fct.sleep(1000);
}
if (i >= 180) {
  console.log('ImageGeneration: Generate upscaled image unsuccessfull.');
  return;
}*/

/*
* Wait for upscaling detailed
*/
/*
await fct.sleep(fct.between(2000,5000));
await message.clickButton({ row:0, col:1 });

console.log('ImageGeneration: Generate upscaled (detailed) image.');
for (i=0;i<180;i++) {
  message = (await channel.messages.fetch({limit: 1})).first();


  const isFinished = message.content.includes(promptText) && message.content.includes('Upscaled by');
  if (isFinished)
    break;

  await fct.sleep(1000);
}
if (i >= 180) {
  console.log('ImageGeneration: Generate upscaled (detailed) image unsuccessfull.');
  return;
}
*/
/*message = (await channel.messages.fetch({limit: 1})).first();
const attachment = message.attachments.first();

if (attachment)
  return attachment.url;

return null;*/
