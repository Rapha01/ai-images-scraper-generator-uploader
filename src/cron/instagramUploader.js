const config = require('../const/config.js');
const fct = require('../util/fct.js');
const path = require('path');
const categoryModel = require('../models/categoryModel.js');
const imageModel = require('../models/imageModel.js');
const url = require('url');

const uploadHistory = [];
const homeUrl = 'https://www.instagram.com/perplexed_art_gallery/';
let lastUrl = '';
let randomProfileUrls = [];

exports.follow = async (page,followProbability) => {
  if (!(await goToUrl(page,homeUrl))) {
    console.log('instagramFollow: Failed loading home page.');
    return false;
  }

  if (!(await unfollow(page))) {
    console.log('instagramFollow: Failed unfollow.');
    return false;
  }

  if (!(await fillRandomProfileUrls(page))) {
    console.log('instagramFollow: Failed fillRandomProfileUrls.');
    return false;
  }

  const profileDetails = await searchFittingProfileAndGetDetails(page);
  if (!profileDetails) {
    console.log('instagramFollow: Failed searchFittingProfileAndGetDetails.');
    return false;
  }

  if (!(await followLikeComment(page,profileDetails,followProbability))) {
    console.log('instagramFollow: Failed followLikeCommentPosts.');
    return false;
  }

  console.log('instagramFollow: Successfully followed/liked/commented profile "' + profileDetails.url.split('.com/')[1] + '".');
  return true;
}

const unfollow = async (page) => {
  const followingCount = await page.evaluate(() => {
    function getVal (val) {
      multiplier = val.substr(-1).toLowerCase();
      if (multiplier == "k") return parseInt(val) * 1000;
      else if (multiplier == "m") return parseInt(val) * 1000000;
      else return parseInt(val);
    }

    for (const li of document.querySelectorAll('li')) {
      if (li.innerText.includes('following'))
          return getVal(li.innerText.replace('.','').replace(',','').match(/\d+[kKmM]?/)[0]);
    }
    return null;
  });

  if (!followingCount) return false
  if (followingCount < 2000) return true

  await page.evaluate(() => {
    for (const button of document.querySelectorAll('a'))
      if (button.innerText.includes('following')) button.click();
  });
  await fct.sleep(2000);

  for (let i = 0; i < 10; i++) {
    const scrollDowns = fct.between(2,6);
    for (let j = 0; j < scrollDowns; j++) {
      await page.evaluate(() => {
        document.querySelector('._aano').scrollBy(0,1000);
      });

      await fct.sleep(2000);
    }

    await page.evaluate(() => {
      const buttons = [];
      for (const button of document.querySelectorAll('button'))
        if (button.textContent == 'Following') buttons.push(button);

      buttons.sort((a, b) => 0.5 - Math.random());
      if (buttons.length > 0) buttons[0].click();
    });
    await fct.sleep(2000);

    await page.evaluate(() => {
      for (const button of document.querySelectorAll('button'))
        if (button.textContent == 'Unfollow') button.click();
    });
    await fct.sleep(2000);
  }

  await page.keyboard.press('Escape');
  await fct.sleep(1000);
  await page.keyboard.press('Escape');
  await fct.sleep(1000);

  return true;
}

const followLikeComment = async (page,profileDetails,followProbability) => {
  // Follow
  if (Math.random() < followProbability) {
    await page.evaluate(() => {
      for (const button of document.querySelectorAll('button'))
        if (button.innerText == 'Follow') button.click();
    });
    await fct.sleep(1000);
  }

  // Select Posts
  const selectedPostUrls = [];
  selectedPostUrls.push(profileDetails.posts.shift());
  profileDetails.posts.sort((a, b) => 0.5 - Math.random());
  selectedPostUrls.push(profileDetails.posts.shift());
  selectedPostUrls.push(profileDetails.posts.shift());

  for (const url of selectedPostUrls) {
    if (!(await goToUrl(page,url))) return false;
    await fct.sleep(1000);

    // Like
    await page.evaluate(() => {
      const buttons = [];
      for (const button of document.querySelectorAll('button'))
          if (button.textContent == 'LikeLike') buttons.push(button);
      if (buttons.length > 0)
          buttons.shift().click();
      buttons.sort((a, b) => 0.5 - Math.random());
      if (buttons.length > 0 && Math.random() < 0.5)
          buttons.shift().click();
      if (buttons.length > 4 && Math.random() < 0.5)
          buttons.shift().click();
    });
    await fct.sleep(1000);

    // Comment
    if (fct.between(0,1) == 1) {
      await page.evaluate(() => {
        for (const button of document.querySelectorAll('button'))
          if (button.textContent == 'CommentComment') button.click();
      });
      await fct.sleep(1000);

      await page.keyboard.type(generateRandomComment());
      await fct.sleep(1000);

      await page.evaluate(() => {
        for (const div of document.querySelectorAll('div'))
            if (div.innerText == 'Post') div.click();
      });
      await fct.sleep(5000);
    }
  }

  return true;
}

const generateRandomComment = () => {
  const emojis = ['😍','😮','🔥','🥰','😊','🤩','😀','👌','🤘','🔥🔥'];
  const emojiCount = fct.between(1,3);

  const temp = [];
  for (let i = 0; i < emojiCount; i++)
      temp.push(emojis[fct.between(0,emojis.length - 1)]);

  return temp.join('');
}

const searchFittingProfileAndGetDetails = async (page) => {
  while (randomProfileUrls.length > 0) {
    const url = randomProfileUrls.shift();
    if (!(await goToUrl(page,url))) return null;

    const profileDetails = await page.evaluate(() => {
      function getVal (val) {
        multiplier = val.substr(-1).toLowerCase();
        if (multiplier == "k") return parseInt(val) * 1000;
        else if (multiplier == "m") return parseInt(val) * 1000000;
        else return parseInt(val);
      }

      const res = { private: false, posts: [], postsCount: 0, followersCount: 0 };
      for ( const li of document.querySelectorAll('li')) {
        if (li.innerText.includes('post'))
            res.postsCount = getVal(li.innerText.replace('.','').replace(',','').match(/\d+[kKmM]?/)[0]);
        if (li.innerText.includes('follower'))
            res.followersCount = getVal(li.innerText.replace('.','').replace(',','').match(/\d+[kKmM]?/)[0]);
      }
      for (const h2 of document.querySelectorAll('h2')) {
        if (h2.innerText.includes('This Account is Private'))
            res.private = true;
      }
      for (const a of document.querySelectorAll('a')) {
        if (a.href.includes('/p/'))
            res.posts.push(a.href);
      }
      return res;
    });

    if (profileDetails.posts.length >= 5 && profileDetails.followersCount > 50 && profileDetails.followersCount < 50000)
      return {...profileDetails, url: url};
  }

  console.log('instagramFollow: No fitting profile found.');
  return null;
}

const fillRandomProfileUrls = async (page) => {
  if (randomProfileUrls.length > 5)
    return true;

  const searchTag = await getFollowSearchTag();
  if (!searchTag) return false;

  await page.click('[aria-label="Search"]');
  await fct.sleep(3000);
  await page.keyboard.type(searchTag);
  await fct.sleep(4000);

  const urls = await page.evaluate(() => {
    const urls = [];
    for (const ele of document.querySelectorAll('[role="none"] > a'))
      if (!ele.href.includes('/explore/'))
        urls.push(ele.href);
    return urls;
  });

  if (urls.length < 1) {
    console.log('instagramFollow: Not enough profiles found for searchTag "' + searchTag + '".');
    return null;
  }

  randomProfileUrls = randomProfileUrls.concat(urls);
  randomProfileUrls.sort((a, b) => 0.5 - Math.random());
  return true;
}

const getFollowSearchTag = async () => {
  let categoryName = 'generic';
  if (uploadHistory.length > 0)
    categoryName = uploadHistory[0].categoryName;

  const image = await imageModel.getRandomOfCategory(categoryName);

  const words = image.promptText.split(' ');

  const final = [words[fct.between(0,Math.max(words.length - 1,2))]];
  if (fct.between(0,1) == 1)
    final.push(words[fct.between(Math.max(words.length - 1,3),Math.max(words.length - 1,6))]);

  return final.join(' ');
}

exports.uploadNext = async (page) => {
  const image = await imageModel.getNextToUpload('instagram');
  if (!image) {
    console.log('instagramUploader: No next image to upload.');
    return false;
  }
  console.log('instagramUploader: Uploading image: ' + fct.limitString(image.promptText,20));

  const category = await categoryModel.get(image.categoryName);
  if (!category) {
    console.log('instagramUploader: Failed getting category of image.');
    return false;
  }

  if (!(await goToUrl(page,homeUrl))) {
    console.log('instagramUploader: Failed loading home page .');
    return false;
  }

  if (!(await fillCreateForm(page,category,image))){
    console.log('instagramUploader: Failed fillform .');
    return false;
  }

  const success = await fct.waitForElementWithTagAndFieldValue(page,'span','innerHTML','Your post has been shared.',40);
  if (!success) {
    console.log('instagramUploader: Failed creation .');
    return false;
  }

  await imageModel.set(image.categoryName, image.promptText, 'instagramUploaded', true);

  if (!(await saveImageUrl(page,image))) {
    console.log('instagramUploader: Failed saveImageUrl .');
    return false;
  }

  uploadHistory.push(image);
  console.log('instagramUploader: Successfully uploaded image "' + fct.limitString(image.promptText, 30) + '"');
  return true;
}

const saveImageUrl = async (page,image) => {
  await page.reload();
  await fct.sleep(3000);

  const urls = await page.evaluate(() => {
    const urls = [];
    for (const a of document.getElementsByTagName('a'))
        if (a.href.includes('/p/'))
            urls.push(a.href);
    return urls;
  });

  if (!urls || !urls[0] || urls[0] == lastUrl)
    return false;

  await imageModel.set(image.categoryName, image.promptText, 'instagramUrl', urls[0]);
  lastUrl = urls[0];

  return true;
};

const fillCreateForm = async (page,category,image) => {
  // Open upload page
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('a'))
      if (button.text == 'Create') button.click();
  });

  const success = await fct.waitForElementWithTagAndFieldValue(page,'button','innerHTML','Select from computer',10);
  if (!success) return false;

  // Image
  const imagePath = path.join(config.hostImagesFolderPath,'sortedout',image.categoryName,image.promptText + '.' + image.format);
  const [fileChooser] = await Promise.all([
    page.waitForFileChooser(),
    page.evaluate(() => {
      for (const button of document.querySelectorAll('button')) {
        if (button.innerHTML == 'Select from computer') button.click();
      }
    })
  ]);
  await fct.sleep(1000);
  await fileChooser.accept([imagePath]);
  await fct.sleep(3000);

  // CLick Next
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('div')) {
      if (button.innerHTML == 'Next') button.click();
    }
  });
  await fct.sleep(2000);
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('div')) {
      if (button.innerHTML == 'Next') button.click();
    }
  });
  await fct.sleep(2000);

  // Description
  let tags = [];
  for (const word of image.promptText.split(' '))
    if (!['a','of','the','and','with','to','from','by','in','on','over','above','under','below','off','within','along'].includes(word))
      tags.push('#' + word);

  if (tags.length > 10)
    tags = tags.slice(0,10);
  //await page.focus('[aria-label="Write a caption..."]');
  await fct.sleep(1000);
  await page.click('[aria-label="Write a caption..."]');
  await fct.sleep(1000);
  await page.keyboard.type(tags.join(' '));
  await fct.sleep(1000);

  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await fct.sleep(300);
  }

  // Submit
  await page.evaluate(() => {
    for (const button of document.querySelectorAll('div'))
      if (button.innerHTML == 'Share') button.click();
  });
  await fct.sleep(2000);


  return true;
}

const goToUrl = async (page,url) => {
  await page.goto(url, { waitUntil: 'networkidle0' });
  await fct.sleep(2000);

  if (!page.url().includes('/login') && page.url().includes(url))
    return true;

  return false;
};

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


/*
await page.evaluate(() => {
  function searchChildren(element,attr,value) {
    if (element.getAttribute(attr) == value) {
        return true;
    } else {
        for (const child of element.children) {
            if (searchChildren(child,attr,value) == true)
                return true;
        }
        return false;
    }
  }
  for (const button of document.querySelectorAll('button')) {
    if (searchChildren(button,'aria-label','More options'))
      button.click();
  }
});
*/
