const config = require('../const/config.js');
const fct = require('../util/fct.js');
const promptScraper = require('./promptScraper.js')
const imageGenerator = require('./imageGenerator.js');
const sanitizePrompts = require('./sanitizePrompts.js');
const imageDownloader = require('./imageDownloader.js');
const openseaUploader = require('./openseaUploader.js');
const instagramUploader = require('./instagramUploader.js');
const pinterestUploader = require('./pinterestUploader.js');
const discordApp = require('../discordBot/bot.js');
const imageModel = require('../models/imageModel.js');

const isProd = process.env.NODE_ENV == 'production';
const settings = {
  promptScraperDelay: isProd ? 0 : 0,
  imageGenerationDelay: isProd ? 0 : 0,
  cccInterval: isProd ? '30 * * * * *' : '*/10 * * * * *',
};

exports.start = async (pages) => {
  startPromptScraper(pages[0]);
  startSanitizePrompts();
  startImageGenerator();
  startImageDownloader();

  startOpenseaUploader(pages[1]);
  //startInstagramUploader(pages[2]);
  //startPinterestUploader(pages[3]);
};


const startPinterestUploader = async (page) => {
  let lastUploadDate = 0, uploadIntervalDelay = 3600 * 1000;
  let lastFollowDate = 0, followIntervalDelay = 800 * 1000;
  const followProbability = 0.5;
  let uploadIntervalDelayRand = fct.between(uploadIntervalDelay * 0.8,uploadIntervalDelay * 1.2);
  let followIntervalDelayRand = fct.between(followIntervalDelay * 0.8,followIntervalDelay * 1.2);

  while (true) {
    const hour = (new Date()).getHours();
    if (hour <= 7 || hour >= 23) {
      await fct.sleep(30_000).catch(e => console.log(e));
      continue;
    }

    if (lastUploadDate < Date.now() - uploadIntervalDelayRand) {
      const success = await pinterestUploader.uploadNext(page).catch((e) => console.log(e));
      if (success) {
        lastUploadDate = Date.now();
        uploadIntervalDelayRand = fct.between(uploadIntervalDelay * 0.8,uploadIntervalDelay * 1.2);
      }
    }
    if (lastFollowDate < Date.now() - followIntervalDelayRand) {
      /*const success = await pinterestUploader.follow(page,followProbability).catch((e) => console.log(e));
      if (success) {
        lastFollowDate = Date.now();
        followIntervalDelayRand = fct.between(followIntervalDelay * 0.8,followIntervalDelay * 1.2);
      }*/
    }
    await fct.sleep(30_000).catch(e => console.log(e));
  }
};

const startOpenseaUploader = async (page) => {
  while (true) {
    await openseaUploader(page).catch((e) => console.log(e));
    await fct.sleep(30_000).catch(e => console.log(e));
  }
};

const startInstagramUploader = async (page) => {
  let lastUploadDate = 0, uploadIntervalDelay = 3600 * 1000;
  let lastFollowDate = 0, followIntervalDelay = 800 * 1000;
  const followProbability = 0.5;
  let uploadIntervalDelayRand = fct.between(uploadIntervalDelay * 0.8,uploadIntervalDelay * 1.2);
  let followIntervalDelayRand = fct.between(followIntervalDelay * 0.8,followIntervalDelay * 1.2);

  while (true) {
    const hour = (new Date()).getHours();
    if (hour <= 7 || hour >= 23) {
      await fct.sleep(30_000).catch(e => console.log(e));
      continue;
    }

    if (lastUploadDate < Date.now() - uploadIntervalDelayRand) {
      const success = await instagramUploader.uploadNext(page).catch((e) => console.log(e));
      if (success) {
        lastUploadDate = Date.now();
        uploadIntervalDelayRand = fct.between(uploadIntervalDelay * 0.8,uploadIntervalDelay * 1.2);
      }
    }
    if (lastFollowDate < Date.now() - followIntervalDelayRand) {
      /*const success = await instagramUploader.follow(page,followProbability).catch((e) => console.log(e));
      if (success) {
        lastFollowDate = Date.now();
        followIntervalDelayRand = fct.between(followIntervalDelay * 0.8,followIntervalDelay * 1.2);
      }*/
    }
    await fct.sleep(30_000).catch(e => console.log(e));
  }
};

const startPromptScraper = async (page) => {
  while (true) {
    await promptScraper(page).catch((e) => console.log(e));
    await fct.sleep(fct.between(600_000,1200_000)).catch(e => console.log(e));
  }
};

const startSanitizePrompts = async () => {
  while (true) {
    await sanitizePrompts(500).catch((e) => console.log(e));
    await fct.sleep(60000).catch(e => console.log(e));
  }
};

const startImageGenerator = async () => {
  let sleepTime = 150;
  const discordClient = await discordApp.init();

  await fct.sleep(sleepTime*1000).catch(e => console.log(e));
  while (true) {
    await imageGenerator(discordClient).catch((e) => console.log(e));
    await fct.sleep(5_000);

    if (discordClient.appData.lastJobGotQueued) {
      await fct.sleep(30_000);
      sleepTime += 30;
      if (sleepTime > 600) sleepTime = 600;
      discordClient.appData.lastJobGotQueued = false;
    } else {
      if (sleepTime >= 600) sleepTime -= 300;
      else if (sleepTime >= 300) sleepTime -= 100;
      else if (sleepTime >= 150) sleepTime -= 30;
      else if (sleepTime >= 75) sleepTime -= 10;
      else sleepTime -= 1;
      if (sleepTime < 50) sleepTime = 50;
    }

    console.log('imageGeneration: Sleeping for ~' + sleepTime + ' seconds.');
    await fct.sleep(fct.between(sleepTime*0.9*1000,sleepTime*1.1*1000)).catch(e => console.log(e));
  }
};

const startImageDownloader = async () => {
  while (true) {
    await imageDownloader().catch((e) => console.log(e));
    await fct.sleep(fct.between(5_000,10_000)).catch(e => console.log(e));
  }
};
