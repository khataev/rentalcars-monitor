const puppeteer = require('puppeteer');
const util = require('./util');

const fs = require('fs')

function errCallback(err) {
  if (err) {
    console.log(err)
  } else {
    // console.log(`The file ${file_name} was saved!`);
  }
}

async function enableInterception(page) {
  await page.setRequestInterception(true)

  page.on('request', async request => {
    fs.appendFile('./log/requests.log', "\n", errCallback);
    fs.appendFile('./log/requests.log', request.url(), errCallback);

    if (request.url().endsWith('QuotePopupAction.do')) {
      fs.appendFile('./log/req_headers.log', request.postData(), errCallback);
      fs.appendFile('./log/req_headers.log', '\n', errCallback);
      fs.appendFile('./log/req_headers.log', JSON.stringify(request.headers()), errCallback);
      fs.appendFile('./log/req_headers.log', '\n', errCallback);
      fs.appendFile('./log/req_headers.log', JSON.stringify(request.postData()), errCallback);
      request.continue();
    }

    if (request.url().endsWith('.png') ||
        request.url().endsWith('.jpg') ||
        request.url().endsWith('.svg') ||
        request.url().endsWith('.gif'))
        request.abort();
    else {
      request.continue();
    }
  });

  page.on('response', async response => {
    if (response.url().endsWith('QuotePopupAction.do' || response.url().endsWith(':9000'))) 
    {
      fs.appendFile('./log/responses.log', "\n", errCallback);
      fs.appendFile('./log/responses.log', response.url() + '\n', errCallback);
      // fs.appendFile('./log/responses.log', (await response.buffer()) + '\n', errCallback);
    }
  })

  return;
}

// TODO: how to replace with native approach
async function getLocationValue(page, locationText) {
  let locationValue;
  const locations = await page.$$('#pu-location > optgroup:nth-child(2) > option');

  await util.asyncForEach(locations, async(_index, option) => {
    const textHandle = await option.getProperty('innerText');
    const text = (await textHandle.jsonValue()).trim();
    if (text === locationText) {
      const valueHandle = await option.getProperty('value');
      locationValue = await valueHandle.jsonValue();
    }
  })
  
  return locationValue;
}

async function fillFilterAndSubmit(page) {
  // Input page
  const PU_COUNTRY_SELECTOR = '#pu-country';
  const PU_CITY_SELECTOR = '#pu-city';
  const PU_LOCATION_SELECTOR = '#pu-location';
  const PU_DATE_YEAR_SELECTOR = '#SearchResultsForm > div > input[type=hidden][name=puYear]';
  const PU_DATE_MONTH_SELECTOR = '#SearchResultsForm > div > input[type=hidden][name=puMonth]';
  const PU_DATE_DAY_SELECTOR = '#SearchResultsForm > div > input[type=hidden][name=puDay]';

  const DO_DATE_YEAR_SELECTOR = '#SearchResultsForm > div > input[type=hidden][name=doYear]';
  const DO_DATE_MONTH_SELECTOR = '#SearchResultsForm > div > input[type=hidden][name=doMonth]';
  const DO_DATE_DAY_SELECTOR = '#SearchResultsForm > div > input[type=hidden][name=doDay]';

  const PU_HOUR_SELECTOR = '#puHour'; //  '#SearchResultsForm > div > input[type=hidden][name=puMonth]'
  const PU_MINUTE_SELECTOR = '#puMinute';
  const DO_HOUR_SELECTOR = '#doHour';
  const DO_MINUTE_SELECTOR = '#doMinute';
  const REASON_LEIZURE_SELECTOR = '#travel-reason-leisure';
  const SUBMIT_SELECTOR = '#formsubmit';

  // Values
  // const  LOCATION_AIRPORT = '164434'; // from RU
  // const  LOCATION_AIRPORT = '266604'; // from LT
  // const  LOCATION_AIRPORT_TERM2 = '1796083';

  const LOCATION_AIRPORT_TEXT = 'Барселона аэропорт';

  try {
    // await page.goto('https://rentalcars.com/ru', {waitUntil: 'networkidle0'});

    await page.goto('https://rentalcars.com/ru');

    await page.select(PU_COUNTRY_SELECTOR, 'Испания');
    await page.waitForSelector('#pu-city > option:nth-child(2)');
    await page.select(PU_CITY_SELECTOR, 'Барселона');
    await page.waitForSelector('#pu-location > optgroup:nth-child(2) > option:nth-child(1)');
  
    // await page.select(PU_LOCATION_SELECTOR, LOCATION_AIRPORT);
    const locationValue = await getLocationValue(page, LOCATION_AIRPORT_TEXT);
    await page.select(PU_LOCATION_SELECTOR, locationValue);
    // Pickup
    // Date
    await page.$eval(PU_DATE_YEAR_SELECTOR, el => el.value = '2019');
    await page.$eval(PU_DATE_MONTH_SELECTOR, el => el.value = '9');
    await page.$eval(PU_DATE_DAY_SELECTOR, el => el.value = '14');
    // Time
    await page.select(PU_HOUR_SELECTOR, '10');
    await page.select(PU_MINUTE_SELECTOR, '0');

    // Drop off
    // Date
    await page.$eval(DO_DATE_YEAR_SELECTOR, el => el.value = '2019');
    await page.$eval(DO_DATE_MONTH_SELECTOR, el => el.value = '9');
    await page.$eval(DO_DATE_DAY_SELECTOR, el => el.value = '28');
    // Time
    await page.select(DO_HOUR_SELECTOR, '8');
    await page.select(DO_MINUTE_SELECTOR, '30');
    // Buttons
    await page.click(REASON_LEIZURE_SELECTOR);
    await page.click(SUBMIT_SELECTOR);
    // await page.waitForNavigation({waitUntil: 'networkidle0'});
    await page.waitForNavigation();
    console.log('fillFilterAndSubmit', 'continue navigation');

    return true;
  } catch (error) {
    console.log('fillFilterAndSubmit error:', error.message);
    return false;
  }
}

async function chooseDesisiredCategory(page, desiredCategory) {
  const CLICK_DELAY = 1000;
  const CATEGORY_ITEM_SELECTOR = '.sr-CarCategories_Item';
  const CATEGORY_ITEM_TITLE_SELECTOR = '.sr-CarCategories_Title > span';

  try {
    await page.waitForSelector(CATEGORY_ITEM_SELECTOR);
    const categories = await page.$$(CATEGORY_ITEM_SELECTOR);
  
    let desiredCategoryElement;
    // TODO: find native way of async filter/find
    await util.asyncForEach(categories, async (_index, categoryHandle) => {
      let titleHandler = await categoryHandle.$(CATEGORY_ITEM_TITLE_SELECTOR);
      let textHandle = await titleHandler.getProperty('innerText');
      let text = (await textHandle.jsonValue()).trim();    
      if (text === desiredCategory) {
        console.log('FOUND', text);
        desiredCategoryElement = categoryHandle;
      }
      console.log(text);
    });
    await util.sleep(CLICK_DELAY);
    await desiredCategoryElement.click();

    return true;
  } catch (error) {
    console.log('chooseDesisiredCategory error:', error.message);

    return false;
  }
}

async function sortResultsWithAutomatically(page) {
  const PRICE_ORDER_SELECTOR = '#sr-sort-price'

  await page.waitForSelector(PRICE_ORDER_SELECTOR);
  const orderOption = await page.$(PRICE_ORDER_SELECTOR);
  await orderOption.click();
}

// TODO: find out why first result is not clickable
async function findCheapestPrice(page, clickFilter = false) {
  const RESULT_ROW_SELECTOR = '.carResultRow'
  const RESULT_ROW_PRICE_SELECTOR = '.carResultRow_Price-now'
  
  try {
    if (clickFilter) await sortResultsWithAutomatically(page);

    await page.waitForSelector(RESULT_ROW_SELECTOR);
    const results = await page.$$(RESULT_ROW_SELECTOR);
  
    let price = 1000000000;
    let cheapestResult;
    const regEx = /^\w+\s(\d+\.\d+)$/i
    // const regEx = /^(\d+,\d+)\s.+$/i
  
    await util.asyncForEach(results, async (_index, result) => {
      const priceElement = await result.$(RESULT_ROW_PRICE_SELECTOR);
      const textHandle = await priceElement.getProperty('innerText');
      const priceText = (await textHandle.jsonValue()).trim();
      const regExResult = priceText.match(regEx);
      if (regExResult) {
        // console.log(regExResult[1].replace(',','.'));
        const rowPrice = Number(regExResult[1]);
        // const rowPrice = Number(regExResult[1].replace(',','.'));
        if (rowPrice < price /*&& rowPrice > 10000*/) {                  // MIN PRICE
        // if (rowPrice < price && rowPrice > 10000) {                      // SECOND MIN PRICE
          console.log('decrease price');
          price = rowPrice;
          cheapestResult = result;
        }
      };
    });
    console.log(price);

    return cheapestResult;
  } catch (error) {
    console.log('findCheapestPrice error:', error.message);

    return false;
  }
}

function consoleEventListener (msg) {
  console.log('PAGE LOG:', msg.text());
}

// TODO: make native puppeteer function findCheapestPrice gonna work
async function findCheapestPriceInBrowser(page, clickFilter = false) {
  const RESULT_ROW_SELECTOR = '.carResultRow'
  const RESULT_ROW_PRICE_SELECTOR = '.carResultRow_Price-now';

  try {
    if (clickFilter) await sortResultsWithAutomatically(page);

    await page.waitForSelector(RESULT_ROW_PRICE_SELECTOR); // wait for price selector, rather parent result row element
  
    util.sleep(1000);
    page.on('console', consoleEventListener);

    let sleep = util.sleep;

    await page.exposeFunction('puppeteerSleep', duration => util.sleep(duration));

    await page.evaluate(async () => {
      const RESULT_ROW_SELECTOR = '.carResultRow';
      const RESULT_ROW_PRICE_SELECTOR = '.carResultRow_Price-now';
      const SAVE_FOR_LATER_SELECTOR = '.save-for-later.cf > a';
      const STARTING_PRICE = 1000000000;

      const results = $(RESULT_ROW_SELECTOR);

      let cheapestPrice = STARTING_PRICE;
      let cheapestResult;
      const regEx = /^\w+\s(\d+\.\d+)$/i // CUR XXX.XX
      // const regEx = /^(\d+,\d+)\s.+$/i // XXX,XX CUR

      for (let index = 0; index < results.length; index++) {
        // console.log(`processing row: ${index}`)
        const $resultRow = $(results[index]);
        const rowPriceElements = $resultRow.find(RESULT_ROW_PRICE_SELECTOR);
        // console.log('rowPriceElements.length', rowPriceElements.length);
        if (!rowPriceElements && rowPriceElements.length === 0) {
          console.log('Price element not found in result row');
          continue;
        }

        const regExResult = rowPriceElements[0] && rowPriceElements[0].innerText.match(regEx);
        if (!regExResult)
          throw new Error('Price element was not found within row');

        if (regExResult) {
          const rowPrice = Number(regExResult[1]);
          // const rowPrice = Number(regExResult[1].replace(',','.'));
          if (rowPrice < cheapestPrice) {
            cheapestPrice = rowPrice;
            const rowSaveForLaterElements = $resultRow.find(SAVE_FOR_LATER_SELECTOR);
            if (!rowSaveForLaterElements && rowSaveForLaterElements.length === 0) {
              console.log('SaveForLater element not found in result row');
              continue;
            }
            cheapestResult = rowSaveForLaterElements[0];
            console.log('decrease price to:', cheapestPrice);
          }
        };
      }
      console.log(cheapestPrice);
      await window.puppeteerSleep(4000);
      cheapestResult.click();
    })

    page.removeListener('console', consoleEventListener);
    console.log('STOPPING LOGG');
    // await util.sleep(100000)

    return true;
  } catch (error) {
    console.log('findCheapestPriceInBrowser error:', error.message);
    console.log('findCheapestPriceInBrowser error trace:', error.stack);

    return false;
  }
}

// TODO: divide into fill and process submit
async function saveForLater(page, cheapestPriceResult) {
  // Email results pop-up
  const EMAIL_POPUP_SELECTOR = '.quote-pop-up.cf'

  const QUOTE_TITLE_SELECTOR = '#quote_title'
  const FIRSTNAME_INPUT_SELECTOR = '#f_name_input'
  const SURNAME_INPUT_SELECTOR = '#surname_input'
  const EMAIL_INPUT_SELECTOR = '#email_input'
  const PHONE_INPUT_SELECTOR = '#phone_input'
  const SUBMIT_RESULT = '.quote-pop-up.cf .quote-form div.buttons a.cta'

  const SUCCESS_SELECTOR = '.success-message:not([style*="display:none"]):not([style*="display: none"])';
  const ERROR_SELECTOR = '.error-message:not([style*="display:none"]):not([style*="display: none"])';
  const SUCCESS_TEST_SELECTOR = '.success-message';

  const TITLE = 'Господин';
  const SAVE_FOR_LATER_SELECTOR = '.save-for-later.cf > a.save-for-later__action';

  const CURRENT_SUBMIT_JS = 'javascript:{GAQPushLinkByPost(document.forms.BookingDetailsForm);saveQuote(this);}'
  const NEW_SUBMIT_JS = 'javascript:{saveQuote(this);}'

  try {
    // Uncomment if findCheapestPrice used ------------------------

    // saveForLaterElement = await cheapestPriceResult.$(SAVE_FOR_LATER_SELECTOR);
    // const textHandle = await saveForLaterElement.getProperty('href');
    // const priceText = (await textHandle.jsonValue()).trim();
    // console.log(priceText);
    // util.sleep(20000);
    // await saveForLaterElement.click();

    // Uncomment if findCheapestPrice used ------------------------

    // await util.sleep(100000);  
    // await util.sleep(10000);  
  
    // await page.screenshot({path: `./screenshots/popup03-${new Date().toISOString()}.png`});
    // Emailing result 
    await page.waitForSelector(EMAIL_POPUP_SELECTOR);

    const popup = await page.$eval(EMAIL_POPUP_SELECTOR, (element) => {
      return element.innerHTML;
    });

    // console.log('popup', popup);

    await page.select(QUOTE_TITLE_SELECTOR, TITLE);
    // await page.screenshot({path: `./screenshots/screenshot-${new Date().toISOString()}.png`});
  
    // TODO: how to link constants from this context and browser context?
    await page.$eval(FIRSTNAME_INPUT_SELECTOR, el => el.value = 'Andrey');
    await page.$eval(SURNAME_INPUT_SELECTOR, el => el.value = 'Khataev');
    await page.$eval(EMAIL_INPUT_SELECTOR, el => el.value = 'khataev@yandex.ru');
    await page.$eval(PHONE_INPUT_SELECTOR, el => el.value = '+79099185880');
    // await page.type(FIRSTNAME_INPUT_SELECTOR, 'Andrey', { delay: 200 });
    // await page.type(SURNAME_INPUT_SELECTOR, 'Khataev', { delay: 200 });
    // await page.type(EMAIL_INPUT_SELECTOR, 'khataev@yandex.ru', { delay: 200 });
    // await page.type(PHONE_INPUT_SELECTOR, '+79099185880', { delay: 200 });
  
    // await util.sleep(20000);
    await page.waitForSelector(SUBMIT_RESULT);

    // HINT: trying to enlighten submit action (remove google analytics call)
    await page.$eval(SUBMIT_RESULT, element => element.setAttribute('onclick', 'javascript:{saveQuote(this);}'));
    console.log('!!!!!');
    await util.sleep(10000);
    await page.click(SUBMIT_RESULT);
    await util.sleep(2000);
  
    page.waitForSelector(SUCCESS_TEST_SELECTOR);
    const success_area = await page.$$(SUCCESS_SELECTOR);
    const error_area = await page.$$(ERROR_SELECTOR);

    // console.log('success_area', success_area, 'count', success_area.length);
    console.log('success_area', 'count', success_area.length);
    // console.log('error_area', error_area, 'count', error_area.length);
    console.log('error_area', 'count', error_area.length);

    if (success_area.length === 1 && error_area.length === 0) {
      console.log('УСПЕШНО');
    } else {
      console.log('НЕУСПЕШНО');
    }

    return true;
  } catch (error) {
    console.log('saveForLater error:', error.message);
    console.log('saveForLater stack:', error.stack);

    return false;
  }
}

async function processResults(page) {
  // const CATEGORY_ITEM_PRICE_SELECTOR = '.sr-CarCategories_Price > span';
  const DESIRED_CATEGORY = 'Средние автомобили';
  
  if (!(await chooseDesisiredCategory(page, DESIRED_CATEGORY))) return false;
  // const cheapestPriceElementPromise = await findCheapestPrice(page, false);
  const cheapestPriceElementPromise = await findCheapestPriceInBrowser(page, false);
  if (!cheapestPriceElementPromise) return false;

  return saveForLater(page, cheapestPriceElementPromise);
}

function deleteLogFiles() {
  try {
    fs.unlinkSync('./log/requests.log');
  } catch {}
  try {
    fs.unlinkSync('./log/req_headers.log');
  } catch {}
  try {
    fs.unlinkSync('./log/responses.log');
  } catch {}
}

const DEBUG = process.argv[2] === 'true' || false;

(async () => {
  deleteLogFiles();

  let slowMo = DEBUG ? 100 : 0;
  // const browserWSEndpoint = 'ws://127.0.0.1:9222/devtools/browser/89d7304c-802d-4406-868d-40fef007a570';
  // const browser = await puppeteer.connect({
  //   browserWSEndpoint: browserWSEndpoint,
  //   devtools: DEBUG,
  //   slowMo: 0
  // });

  const browser = await puppeteer.launch({ headless: !DEBUG, devtools: DEBUG, slowMo: 0 });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 768});

  // await enableInterception(page);

  const fillResult = await fillFilterAndSubmit(page);
  console.log('fillResult', fillResult);
  if (!fillResult) { 
    DEBUG ? {} : browser.close(); 
    return;
  }
  
  // Reading price
  const processResult = await processResults(page);
  if (!processResult) {
    DEBUG ? {} : browser.close(); 
    return;
  }

  console.log('The END');
  // await browser.close();
})();