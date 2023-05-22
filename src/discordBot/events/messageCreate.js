const Discord = require('discord.js-selfbot-v13');
const config = require('../../const/config.js');
const fct = require('../../util/fct.js');
const categoryModel = require('../../models/categoryModel.js');
const imageModel = require('../../models/imageModel.js');

module.exports = async (message) => {
  if (config.autoImageGenerationChannelId != message.channel.id)
    return;

  if (message.author.id != config.midJourneyBotId)
    return;

  if (message.components && message.components.length > 0 &&
      message.components[0].components &&
      message.components[0].components.length > 0) {
    const firstRow = message.components[0].components;

    await fct.sleep(fct.between(1000,5000));

    if (firstRow[0].label == 'U1') {
      await clickRandomUpscale(message);
      return;
    }

    if (firstRow.length >= 2 && firstRow[0].label == 'Make Variations') {
      await handleSave(message);

      return;
    }

    if (firstRow.length >= 2 && message.content.includes('- Upscaled (Light) by')) {
      await handleSave(message);
      return;
    }
  }

  if (message.content.includes('Failed to') || message.embeds.length > 0 && ( message.embeds[0].title == 'Job queued' || message.embeds[0].title == 'Queue full' || message.embeds[0].title.includes('error'))) {
    message.client.appData.lastJobGotQueued = true;
  }
}

const handleSave = async (message) => {
  console.log('imageGeneration: handleSave for ' + fct.limitString(message.content,20));

  const data = message.client.appData.imageGenerationCache.find(d => message.content.includes(d.promptText));
  if (!data) return;
  const { category, promptText } = data;

  const attachment = message.attachments.first();
  if (!attachment) return;

  const image = {
    categoryName: category.name,
    promptText: promptText,
    createDate: Date.now(),
    format: 'png',
    url: attachment.url,
    openseaUrl: '',
    openseaError: '',
    nftPrice: fct.getNftPrice(),
    instagramUrl: '',
    instagramError: '',
    pinterestUrl: '',
    pinterestError: ''
  };

  //await categoryModel.increment(category.name,'imagesCreated',1);
  await imageModel.insert(image);
  message.client.appData.imageGenerationCache = message.client.appData.imageGenerationCache.filter((obj) => {
    return obj.promptText != promptText;
  });
}

const clickRandomUpscale = async (message) => {
  console.log('imageGeneration: clickRandomUpscale on ' + fct.limitString(message.content,20));

  const row = 0, col = fct.between(0,3);
  await message.clickButton({ row, col });
}

const clickUpscaleLight = async (message) => {
  console.log('imageGeneration: clickUpscaleLight on ' + fct.limitString(message.content,20));

  const row = 0, col = 1;
  await message.clickButton({ row, col });
}
