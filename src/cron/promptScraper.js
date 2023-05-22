const config = require('../const/config.js');
const fct = require('../util/fct.js');
const promptModel = require('../models/promptModel.js');
const categoryModel = require('../models/categoryModel.js');

module.exports = async (page) => {
  const nextCategory = await categoryModel.getNextToScrape();
  if (!nextCategory)
    return;

  await scrape(page, nextCategory);
}


const goToLoginGatedUrl = async (page,url) => {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await fct.sleep(2000);
  if (page.url().includes(url))
    return true;

  const needsLogin = await fct.waitForElementWithTagAndFieldValue(page,'button','innerText','Sign In',2);

  if (needsLogin) {
    page.evaluate(() => {
      for (const button of document.querySelectorAll('button'))
        if (button.innerText == 'Sign In') button.click();
    });
    await fct.sleep(10000);
    page.evaluate(() => {
      for (const button of document.querySelectorAll('button'))
        if (button.innerText == 'Authorize') button.click();
    });
    await fct.sleep(10000);
  }

  await page.goto(url, { waitUntil: 'networkidle0' });
  await fct.sleep(3000);
  if (page.url().includes(url))
    return true;

  return false;
};

const scrape = async (page, category) => {
  await goToLoginGatedUrl(page,'https://www.midjourney.com/app/search/advanced/' + encodeQueryParameters(category.scrapeSearchText));

  let aggregatedPrompts = [], emptyRounds = 0, scrolledHeight = 0;
  while (scrolledHeight < category.scrollHeight) {
    const res = await page.evaluate(() => {
      const images = document.getElementsByTagName("img");

      const res = [];
      for (const image of images)
        res.push(image.alt);

      return res;
    });

    let newCount = 0, dupCount = 0;
    for (const r of res) {
      const prompt = {};
      if (r == '' || r.length < 16)
        continue;

      prompt.categoryName = category.name;
      prompt.text = r;
      prompt.createDate = Math.round(Date.now());
      prompt.generateDate = 0;
      prompt.sanitizedText = '';

      if (!aggregatedPrompts.find(p => p.text == prompt.text)) {
        aggregatedPrompts.push(prompt);
        newCount++;
      } else
        dupCount++
    }
    //console.log('Scraped ' + newCount + ' new prompts and ' + dupCount + ' duplicates');

    if (newCount == 0) {
      emptyRounds++;
      if (emptyRounds >= 3) break;

      await fct.randomSleep(30000,10);
    } else
      emptyRounds = 0;

    scrolledHeight += 3000;
    await fct.emulateScrollBy(page, 3000);
    await fct.randomSleep(1500,50);
  }

  await categoryModel.updateLastScraped(category.name);
  const insertRes = await promptModel.insertMulti(aggregatedPrompts);
  console.log('promptScraper: Inserted prompts: ' + insertRes.message);
}

const autoCreateNewCategories = async () => {
  /*
  const res = await promptModel.getRandom(1000);

  const words = new Map();
  for (const row of res) {
    for (const word of row.sanitizedText.split(' ')) {
      if (words.has(word))
        words.set(word, words.get(word) + 1)
      else
        words.set(word, 1)
    }
  }
  const wordsSortedByCount = new Map([...words.entries()].sort((a, b) => b[1] - a[1]));*
  const ignoreWords = ['and', '', '', '', '', '', '', '', '', ''];
  console.log(wordsSortedByCount);*/

}

const encodeQueryParameters = (parameter) => {
let sorting = '', rand = fct.between(1,2);
  if (rand == 1)
    sorting = 'top-all'

  if (parameter == '')
    return '?sort=' + sorting;
  else
    return '?search=' +encodeURIComponent(parameter) + '&sort=' + sorting;
}
