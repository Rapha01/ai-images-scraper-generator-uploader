const keys = require('./const/keys.js');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const fct = require('./util/fct.js');
const config = require('./const/config.js');
const scheduler = require('./cron/scheduler.js');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha');

puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: '2captcha',
      token: 'ef19895f056bac3a5b478bb13e832bad'
    },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

const start = async () => {
  try {
    console.log('Connecting to browser..');
    const browser = await puppeteer.connect({
      browserWSEndpoint: config.wsChromeEndpointUrl,
    });

    const pages = await browser.pages();

    if (pages.length != 4) {
      console.error('Exactly 3 pages in separate windows needed. ' + pages.length);
      return;
    }

    for (const page of pages)
      await page.setViewport({ width: 1200,height: 800 });

    console.log('Starting scheduler..');
    console.log('Now timestamp: ' + Date.now());
    await scheduler.start(pages);
  } catch (err) {
    console.error(err);
  }
}

start();
