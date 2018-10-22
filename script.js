//Init
const settings = {
  search:         'Квартиры', //What will you look for
  region:         'ZZ',     //Which region is selected
  countOfPages:    100       //How many pages do you need
}

/*
=============================================================================================
=============================================================================================
=============================================================================================
*/
const puppeteer = require('puppeteer');

//For catch errors
const {TimeoutError} = require('puppeteer/Errors');

//For saving files
const fs = require('fs');

//For xls
const node_xj = require("xls-to-json");




//Functions
//Filter array from json
function filterArray(arr) {

  const uniq = {};

  return arr.filter(obj => {			
        
    return !uniq[obj.Domain] && (uniq[obj.Domain] = true);
        
  });
}

//Testing zero for Date(h:m:s)
function testZero(number) {
  return ( (number <= 9) ? ('0' + number) : number );
}


//Push into array
async function pushIntoArray(currentArr, pushArr) {

  if(currentArr.length) {
    pushArr.push(currentArr);
  }

  return pushArr;
}

//Flatting array
async function flatArray(arr) {
  return arr.reduce((prev, curr) => prev.concat(curr), []);
}

// Delete repeated elements in array
async function noRepeatArray(arr) {

  return arr.reduce((prev, curr) => {
    
    if( prev.indexOf(curr) < 0 ) {
      prev.push(curr);
    }

    return prev;

  }, []);
}

//Delete 'mailto:' && '?'
async function deleteStrings(arr) {
  return arr.map(str => str.slice('mailto:'.length).replace(/\?(.*)$/, '') );
}

//Focus and click on selector
async function doClickOnThePath(selector, page) {
  await page.focus(selector);
  await page.click(selector);
}

//Make a choice of region
async function makeСhoice(regionInitials, page) {  
  await page.focus(` div[data-value="${regionInitials}"] `);
  await page.click(` div[data-value="${regionInitials}"] `);
}




(async () => {
  // const browser = await puppeteer.launch( {headless: false} );
  const browser = await puppeteer.launch();
  const pageFirst = await browser.newPage();
  const pageSecond = await browser.newPage();

  await pageFirst.bringToFront();
 
  const url = 'https://google.com';
  await pageFirst.goto(url);
  
  await pageFirst.waitFor(1000);

  const settingsSelector = '#fsettl';
  await doClickOnThePath(settingsSelector, pageFirst);

  await pageFirst.waitFor(1000);

  const searchSettingsSelector = '#fsett > a:nth-child(1)';
  await doClickOnThePath(searchSettingsSelector, pageFirst);

  await pageFirst.waitFor(1000);

  const showMoreSelector = '#regionanchormore';
  await doClickOnThePath(showMoreSelector, pageFirst);

  await pageFirst.waitFor(1000);

  await makeСhoice(settings.region, pageFirst)

  await pageFirst.waitFor(1000);


  //Skip alert
  pageFirst.on('dialog', async dialog => {
    console.log( dialog.message() );
    // await dialog.dismiss();
    await dialog.accept();
  });


  const buttonSaveSelector = '#form-buttons > div.goog-inline-block';
  await doClickOnThePath(buttonSaveSelector, pageFirst);

  const inputGoogleSelector = '#lst-ib';
  await pageFirst.waitForSelector(inputGoogleSelector);
  await pageFirst.focus(inputGoogleSelector);

  await pageFirst.keyboard.type(settings.search);

  const userKeyPress = 'Enter';
  await pageFirst.keyboard.press(userKeyPress);

  await pageFirst.waitFor(1500);


  //Create name of file
  const now = new Date();
  const nowDate = ('0' + now.getDate()).slice(-2);
  const nowMonth = ('0' + (now.getMonth() + 1)).slice(-2);
  const nowYear = now.getFullYear();
  const nowHours = testZero( now.getHours() );
  const nowMinutes = testZero( now.getMinutes() );
  const nowSeconds = testZero( now.getSeconds() );

  const nameOfFile = `${settings.search}-${nowDate}${nowMonth}${nowYear}${nowHours}${nowMinutes}${nowSeconds}`;

  //Create unfiltered file
  await fs.appendFile(`${nameOfFile}.xls`, `Domain\n`);

  //Selectors
  // #rso > div:nth-child(1) > div > div:nth-child(7) > div > div > div.r > a
  const linksWithoutAdsSelector = 'div.r > a:first-of-type';

  // #tads > ol > li > div.ad_cclk  
  const linksWithAdsSelector = '.ad_cclk > .V0MxL';

  // #nav > tbody > tr > td > a
  const googlePageNav = '#nav > tbody > tr > td > a';

  //Selectors for finding
  const nameEmailSelector = '[name=email]';
  const namePhoneSelector = '[name=phone]';


  //How many pages U need (countOfPages);
  for(let i = 1, j = 1; i <= settings.countOfPages; i++) {
  
    console.log(`\n\n////////// Page: ${i} //////////\n\n`);

    //Arrays for links and email
    let arrAllLinks = [];

    await pageFirst.waitFor(1500);
    await pageFirst.waitForSelector(googlePageNav);
    
    const arrLinksWithoutAdsOfPage = await pageFirst.$$eval(linksWithoutAdsSelector, nodes => nodes.map(n => n.href));
    await pushIntoArray(arrLinksWithoutAdsOfPage, arrAllLinks);

    const arrLinksWithAdsOfPage = await pageFirst.$$eval(linksWithAdsSelector, nodes => nodes.map(n => n.href));
    await pushIntoArray(arrLinksWithAdsOfPage, arrAllLinks);

    //How many links in array
    console.log(arrAllLinks);

    //Flatting array
    arrAllLinks = await flatArray(arrAllLinks);
    console.log('\n////////// Array all links are flat! //////////\n\n', arrAllLinks);


    for(let linkHref of arrAllLinks) {

      try {
        await pageSecond.goto(linkHref, { 
          waitUntil: ['networkidle0', 'domcontentloaded']
          // timeout: 30000
        });
  
        const arrAllEmailsName = await pageSecond.$$eval(nameEmailSelector, nodes => nodes.map(n => n.name));
        const arrAllPhoneName = await pageSecond.$$eval(namePhoneSelector, nodes => nodes.map(n => n.name));
  
        console.log(linkHref, arrAllEmailsName);
        console.log(linkHref, arrAllPhoneName);

        if( arrAllEmailsName.length || arrAllPhoneName.length ) {

          //Create object
          const obj = {domain: linkHref};
          console.log('\n////////// Create obj //////////\n\n', obj);     

          //Append to unfiltered
          await fs.appendFile(`${nameOfFile}.xls`, `${obj.domain}\n`);
          console.log('\n////////// Append to unfiltered file //////////\n\n', `${obj.domain}\n`);
        }
      }
  
      catch (error) {
        const errorSiteBanned = 'ERR_CONNECTION_REFUSED';
        const errorInternetDisconnect = 'ERR_INTERNET_DISCONNECTED';
        const spaceErrorMessage = error.message.indexOf(' ');
        const stringErrorMessage = error.message.slice(5, spaceErrorMessage);

        // console.log('stringErrorMessage ===>', stringErrorMessage );
        // console.log(stringErrorMessage == errorSiteBanned);
        // console.log(stringErrorMessage == errorInternetDisconnect);

        if (error instanceof TimeoutError) {
          console.log('\nTimeoutError ===>\n', linkHref);

          await pageSecond.goForward(linkHref, {
            waitUntil: ['networkidle0', 'domcontentloaded']
            // timeout: 30000
          });
        }

        else if( stringErrorMessage == errorSiteBanned ) {
          // console.log('errorSiteBanned');
          console.log('\n////////// Site Banned! //////////\n', linkHref);
          await pageSecond.goForward(linkHref, {timeout: 1000});
        }

        else if( stringErrorMessage == errorInternetDisconnect ) {
          // console.log(error.message);
          // console.log('errorInternetDisconnect');
          // console.log(stringErrorMessage == errorInternetDisconnect);
        
          console.log('\n////////// Internet disconnected! //////////\n');

          let secondsWithoutInternet = 0;
          const timerDelay = 2000;

          let timer = setInterval(() => {
            console.log('\n////////// There is no internet yet... Refreshing page... //////////\n');

            secondsWithoutInternet = secondsWithoutInternet + (timerDelay/1000);
            console.log(`${secondsWithoutInternet} sec`);

            pageSecond.reload( {timeout: 0} );
          }, timerDelay);
          
          console.log('Wait For Response of ===>', linkHref);
          const responseSecond = await pageSecond.waitForResponse(linkHref, { timeout: 0 });

          if( responseSecond.ok() ) {
            clearInterval(timer);
            console.log('\n////////// Clear Timer //////////\n`');
            console.log('\n////////// Internet enabled! //////////\n');
            console.log('\n////////// Current link //////////\n\n', linkHref);

            arrAllLinks.push(linkHref);

            console.log('\n////////// Add "push()" current link in array "arrAllLinks" //////////\n\n', linkHref);
            console.log('\n////////// Now array looks like //////////\n\n', arrAllLinks);
          }
        }
      }
    };
      
    try {
      if(i < settings.countOfPages) {
        await pageFirst.click(`a[aria-label="Page ${++j}"]`);
      }
    }
    catch (error) {
      console.log(`\n////////// I can't turn the page ===> "Page ${j}" //////////\n\n`);
      break;
    }
  }


  //Parse unfiltered
  console.log('\n////////// Parse unfiltered file //////////\n\n');   

  await node_xj({
    input: `${nameOfFile}.xls`,  // input xls
    output: `${nameOfFile}.json`, // output json
    // sheet: "sheetname"  // specific sheetname
  }, function(err, result) {
    if(err) {
      console.error(err);
    }
    else {
      const arrFiltered = filterArray(result); 
      console.log('\n////////// Filter //////////\n\n', arrFiltered);

      fs.writeFile(`${nameOfFile}.xls`, 'Domain\n');
    
      arrFiltered.forEach(obj => {
        fs.appendFile(`${nameOfFile}.xls`, `${obj.Domain}\n`);
      });

      console.log('\n////////// Filter completed! //////////\n\n');
    }
  });

  await browser.close();

  console.log('\n////////// Browser closed! //////////\n\n');

  await fs.unlink(`${nameOfFile}.json`, (err) => {
    if (err) throw err;
    console.log(`${nameOfFile}.json was deleted`);
  });

})(); 