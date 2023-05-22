const config = require('../const/config.js')

exports.sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

exports.randomSleep = async (ms,randomPercent) => {
  await exports.sleep(exports.between(ms * (1 - randomPercent/100),ms * (1 + randomPercent/100)));
};

exports.between = (min, max) => {
  return Math.floor(
    Math.random() * (max - min + 1) + min
  )
}

exports.capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

exports.gaussianRandom = (mean=0, stdev=1) => {
    let u = 1 - Math.random(); // Converting [0,1) to (0,1]
    let v = Math.random();
    let z = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    // Transform to the desired mean and standard deviation:
    return z * stdev + mean;
}

exports.emulateScrollBy = async (page,height) => {
  let scrolled = 0, round = 0, mod = exports.between(6,10);

  while (scrolled < height) {
    const stepsize = 160;

    await page.mouse.wheel({deltaY: stepsize});
    await exports.randomSleep(80,30);

    scrolled += stepsize;
    round++;

    if (round % mod == 0) {
      await exports.randomSleep(700,50);
      mod = exports.between(6,10);
    }
  }
}

exports.assembleFullPromptText = (category,promptText) => {
  return (exports.assemblePrefix(category) + ' ' + promptText + ' ' + exports.assembleParameters(category)).trim();
}
exports.assemblePrefix = (category) => {
  return category.promptPrefix == '' ? '' : (category.promptPrefix + '::1.1').trim();
}
exports.assembleParameters = (category) => {
  return (config.globalPromptParameters + ' ' + category.promptParameters).trim();
}

exports.limitString = (str,limit) => {

  if (str.length > limit)
    return str.substr(0,20) + '..';
  else
    return str;c
}

exports.limitStringFullWords = (str,limit) => {
  let aggr = [];
  const arr = str.split(' ');

  while (arr.length > 0 && ([...aggr,arr[0]].join(' ')).length < limit) {
    aggr.push(arr.shift());
  }

  return aggr.join(' ');
}

exports.waitForElementWithTagAndFieldValue = async (page,tag,field,value,seconds) => {
  let success = false;

  for (let i = 0; i <= seconds * 2; i++) {
    success = await page.evaluate((tag,field,value) => {
      console.log(tag,field,value);
      for (element of document.querySelectorAll(tag)) {
        console.log(element);
        if (element[field] && element[field].includes(value))
          return true;
      }
      return false;
    },tag,field,value);

    if (success) {
      await exports.sleep(1000);
      return true;
    }

    await exports.sleep(500);
  }

  return false;
}

exports.upscaleImage = async (image,width) => {
  const filepath = path.join(config.containerImagesFolderPath, image.categoryName, image.promptText + '.' + image.format);
  await sharp(filepath).resize({width: width, kernel: 'lanczos3'}).toFile(path.join(config.containerImagesFolderPath,'temp/temp.png'));
  fs.renameSync('/usr/src/images/test/temp.png', filepath);

  //await sharp('/usr/src/images/test/output.png').sharpen({ sigma: 1 }).toFile('/usr/src/images/test/outputSharpened.png');
}

exports.getNftPrice = () => {
  let nftPrice = 0;
  while (nftPrice < 30)
    nftPrice = Math.round(exports.gaussianRandom(80,100));

  return nftPrice;
}
