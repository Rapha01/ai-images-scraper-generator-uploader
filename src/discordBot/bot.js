const { Client } = require('discord.js-selfbot-v13');
const keys = require('../const/keys.js');
const fs = require('fs');
const path = require('path');

const eventDir = __dirname + '/events/';
const fileNames = fs.readdirSync(eventDir).filter((file) => file.endsWith('.js'));
const client = new Client({checkUpdate: false});

exports.init = async () => {
  client.appData = {};
  client.appData.imageGenerationCache = [];
  client.appData.lastJobGotQueued = false;

  await initEvents();

  await client.login(keys.authToken);

  return client;
}

const initEvents = async () => {
  for (const fileName of fileNames) {
    const event = require(eventDir + fileName);

    client.on(fileName.split('.js')[0], async (...args) => {
      try {
        await event(...args);
      } catch (err) {
        console.log(err);
      }
    });
  }
}
