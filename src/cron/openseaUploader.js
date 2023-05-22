const config = require('../const/config.js');
const fct = require('../util/fct.js');
const keys = require('../const/keys.js');
const path = require('path');
const categoryModel = require('../models/categoryModel.js');
const imageModel = require('../models/imageModel.js');
const url = require('url');


module.exports = async (page) => {
  await closeMetaMaskPages(await page.browser());
  await uploadNext(page);
  await listForSaleNext(page);
  await listForSaleNext(page);
}

const uploadNext = async (page) => {
  const image = await imageModel.getNextToUpload('opensea');
  if (!image) {
    //console.log('openseaUploader: No next image to upload.');
    return false;
  }
  console.log('openseaUploader: Uploading image: ' + fct.limitString(image.promptText,20));

  if (!(await goToLoginGatedUrl(page,'https://opensea.io/asset/create'))) {
    console.log('openseaUploader: Failed loading create page .');
    return false;
  }

  const category = await categoryModel.get(image.categoryName);
  if (!category) {
    console.log('openseaUploader: Failed getting category of image.');
    return false;
  }

  if (!(await fillCreateForm(page,category,image))){
    console.log('openseaUploader: Failed fillform .');
    return false;
  }

  const captchaRes = await page.solveRecaptchas();
  if (captchaRes.error) {
    console.log('openseaUploader: Captcha error - ' + captchaRes.error);
    return false;
  }

  const success = await fct.waitForElementWithTagAndFieldValue(page,'h4','innerHTML','You created',60);

  if (success) {
    await imageModel.set(image.categoryName, image.promptText, 'openseaUrl', page.url().split("?")[0]);
    await imageModel.set(image.categoryName, image.promptText, 'openseaUploaded', true);

    console.log('openseaUploader: Successfully uploaded image "' + fct.limitString(image.promptText, 30) + '"');
    return true;
  } else {
    const error = await getCreateErrorMessage(page,image);
    await imageModel.set(image.categoryName, image.promptText, 'openseaError', error);
    return false;
  }
}

const listForSaleNext = async (page) => {
  const image = await imageModel.getNextImageToListForSale('opensea');
  if (!image) {
    //console.log('openseaUploader: No next image to list for sale.');
    return false;
  }

  console.log('openseaUploader: Listing image for sale: ' + fct.limitString(image.promptText,20));
  if (!(await goToLoginGatedUrl(page, image.openseaUrl + '/sell'))) {
    console.log('openseaUploader: Failed loading asset page.');
    return false;
  }

  const openedListingPage = await fct.waitForElementWithTagAndFieldValue(page,'button','innerHTML','Complete listing',20);
  if (!openedListingPage) {
    console.log('openseaUploader: Failed opening image sell page.');
    const error404 = await fct.waitForElementWithTagAndFieldValue(page,'h1','innerHTML','This page is lost.',2);
    if (error404)
      await imageModel.set(image.categoryName, image.promptText, 'openseaError', 'Failed opening image (404 error) page for listing ' + fct.limitString(image.promptText,20));

    const isSoldout = await fct.waitForElementWithTagAndFieldValue(page,'button','innerHTML','Make offer',2);
    if (isSoldout)
      await imageModel.set(image.categoryName, image.promptText, 'openseaSoldout',true);

    return false;
  }

  if (!(await fillSellForm(page,image))) {
    console.log('openseaUploader: Failed fillform.');
    return false;
  }

  if (!(await handleMetaMaskSignatureRequest(await page.browser()))) {
    console.log('openseaUploader: Failed MetaMask signature request.');
    return false;
  }

  const success = await fct.waitForElementWithTagAndFieldValue(page,'h4','innerHTML','item has been listed',40);

  if (success) {
    console.log('openseaUploader: Successfully listed image "' + fct.limitString(image.promptText, 30) + '"');
    await imageModel.set(image.categoryName, image.promptText, 'openseaListForSaleUntilDate', Date.now() + config.listingDurationDays * 24 * 60 * 60 * 1000);
    return true;
  } else {
    return false;
  }
}

const getCreateErrorMessage = async (page,image) => {
  let error = await page.evaluate(() => {
    let error = null;

    const li = document.querySelector('.AssetForm-status * li');
    if (li)
      error = li.innerHTML;

    return error;
  });

  if (!error)
    error = 'n/a';

  return error;
}

const fillSellForm = async (page,image) => {
  // Amount
  const ethPrice = Math.ceil(((image.nftPrice / 1500)  + Number.EPSILON) * 1000) / 1000;
  await page.focus('#price');
  await page.keyboard.type(ethPrice + '');
  await fct.sleep(1000);

  // Duration
  if (config.listingDurationDays != 30) {
    await page.click('[value="expand_more"]');
    await fct.sleep(1000);
    await page.click('.tippy-content * [value="keyboard_arrow_down"]');
    await fct.sleep(1000);
    const durationSelectSuccess = await page.evaluate((durationString) => {
      for (const button of document.querySelectorAll('button')) {
        for (const span of button.querySelectorAll('span')) {
          if (span.innerHTML == durationString) {
            button.click();
            return true;
          }
        }
      }
      return false;
    }, getDurationString(config.listingDurationDays));

    if (!durationSelectSuccess)
      return false;
    await fct.sleep(1000);
  }

  // Submit
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('button')) {
      if (button.innerHTML == 'Complete listing')
        button.click();
    }
  });
  await fct.sleep(1000);

  return true;
}

const fillCreateForm = async (page,category,image) => {
  // Image
  const imagePath = path.join(config.hostImagesFolderPath,'sortedout',image.categoryName,image.promptText + '.' + image.format);
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.evaluate(() => {
      document.querySelector('#media').click() ;
    })
  ]);
  await fct.sleep(1000);
  await fileChooser.accept([imagePath]);
  await fct.sleep(1000);

  // Name
  await page.focus('#name');
  await page.keyboard.type(fct.limitStringFullWords(image.promptText,99));
  await fct.sleep(1000);

  // Description
  await page.focus('#description');
  let desc = '';
  if (category.imageDescription != '') desc += category.imageDescription + '\n\n';
  desc += image.promptText;
  await page.keyboard.type(desc);
  await fct.sleep(1000);

  // Collection
  let collectionName = category.collectionName;
  if (collectionName == 'anime' || collectionName == 'cat') collectionName += 's';
  collectionName = 'Perplexed ' + fct.capitalizeFirstLetter(collectionName) + ' Collection'
  await page.click('[value="keyboard_arrow_down"]');
  await fct.sleep(1000);
  const collectionSelectSuccess = await page.evaluate((collectionName) => {
    for (const button of document.querySelectorAll('button')) {
      for (const span of button.querySelectorAll('span')) {
        if (span.innerHTML == collectionName) {
          button.click();
          return true;
        }
      }
    }
    return false;
  }, collectionName);

  if (!collectionSelectSuccess)
    return false;
  await fct.sleep(1000);

  // Submit
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('button')) {
      if (button.innerHTML == 'Create')
          button.click();
    }
  });
  await fct.sleep(1000);

  return true;
}

const goToLoginGatedUrl = async (page,url) => {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await fct.sleep(2000);
  if (!page.url().includes('/login'))
    return true;

  const res = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      for (const child of button.children) {
        if (child.innerText == 'MetaMask')
          button.click();
      }
    }
  });
  await fct.sleep(6000);

  let metaMaskPage = await grabMetaMaskNotificationPage(await page.browser());
  if (!metaMaskPage)
    return false;
  await fct.sleep(3000);

  const needsLogin = await fct.waitForElementWithTagAndFieldValue(metaMaskPage,'h1','innerHTML','Welcome back!',1);
  const needsSign = await fct.waitForElementWithTagAndFieldValue(metaMaskPage,'button','innerHTML','Sign',1);

  if (needsLogin) {
    if (!(await loginMetaMask(metaMaskPage)))
      return false;
  }

  if (needsSign) {
    if (!(await signMetaMask(metaMaskPage)))
      return false;

  }

  await fct.sleep(3000);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await fct.sleep(3000);
  if (!page.url().includes('/login') && page.url().includes(url))
    return true;

  return false;
};


const grabMetaMaskNotificationPage = async (browser) => {
  const pages = await browser.pages();

  for (let i = 0;i < 15;i++) {
    for (const p of pages) {
      const title = await p.title();
      if (title.includes('MetaMask Notification')) {
        //await p.waitForNetworkIdle();
        await fct.sleep(3000);
        return p;
      }

    }
    await fct.sleep(1000);
  }

  return null;
}

const signMetaMask = async (metaMaskPage) => {

  const res = await metaMaskPage.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.innerText == 'Sign')
        button.click();
    }
  });
  await fct.sleep(5000);

  return true;
};

const handleMetaMaskSignatureRequest = async (browser) => {
  await fct.sleep(10000);
  let metaMaskPage = await grabMetaMaskNotificationPage(browser);

  if (!metaMaskPage)
    return false;

  const loaded = await fct.waitForElementWithTagAndFieldValue(metaMaskPage,'button','innerHTML','Sign',20);
  if (!loaded)
    return false;
  await fct.sleep(2000);

  await metaMaskPage.click('[aria-label="Scroll down"]');
  await fct.sleep(2000);

  await metaMaskPage.evaluate(() => {
    for (const button of document.querySelectorAll('button')) {
      if (button.innerHTML == 'Sign')
          button.click();
    }
  });

  return true;
}

const loginMetaMask = async (metaMaskPage) => {
  await metaMaskPage.focus('#password');
  await fct.sleep(500);
  await metaMaskPage.keyboard.type(keys.metaMaskPassword);
  await fct.sleep(500);

  await metaMaskPage.evaluate(() => {
    for (const button of document.querySelectorAll('button')) {
      if (button.innerHTML == 'Unlock')
          button.click();
    }
  });
  await fct.sleep(5000);

  return true;
}

const closeMetaMaskPages = async (browser) => {
  const pages = await browser.pages();

  const closePages = [];

  for (const p of pages) {
    const title = await p.title();
    if (title.includes('MetaMask Notification'))
      closePages.push(p);
  }

  for (const cp of closePages) {
    await cp.close();
    await fct.sleep(3000);
  }

  return true;
}

const getDurationString = (listingDurationDays) => {
  if (listingDurationDays == 1)
    return '1 day';
  else if (listingDurationDays <= 3)
    return '3 days';
  else if (listingDurationDays <= 7)
    return '7 days';
  else if (listingDurationDays <= 30)
    return '1 month';
  else if (listingDurationDays <= 90)
    return '3 months';
  else if (listingDurationDays <= 180)
    return '6 months';
  else
    return '';
}
