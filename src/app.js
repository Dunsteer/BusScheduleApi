const HTMLParser = require('node-html-parser');
const express = require('express');
const NodeCache = require('node-cache');
const fs = require('fs');
const puppeteer = require('puppeteer');
const compression = require('compression');
const parsers = require('./util/parsers');
const nodeCron = require('node-cron');

const cache = new NodeCache();
const app = express();

app.use(compression());

const modals = {
  'myModal-jje': 1,
  'myModal-jjk': 1,
  'myModal-dva': 2,
  'myModal-dvaa': 2,
  'myModal-jz': 3,
  'myModal-jzz': 3,
  'myModal-pp': 4,
  'myModal-ppp': 4,
  'myModal-kuj': 5,
  'myModal-kje': 5,
  'myModal-kok': 6,
  'myModal-juu': 6,
  'myModal-bgbge': 7,
  'myModal-bbfe': 7,
  'myModal-hrt': 8,
  'myModal-hrw': 8,
  'myModal-hrte': 9,
  'myModal-hrwe': 9,
  'myModal-hrtel': 10,
  'myModal-hrwel': 10,
  'myModal-hrtelme': 11,
  'myModal-hrwelme': 11,
  'myModal-hrtec': 12,
  'myModal-hrwec': 12,
  'myModal-hrtecr': 13,
  'myModal-hrwecr': 13,
  'myModal-hrtecrt': 34,
  'myModal-hrwecrt': 34,
};

const specialModals = {
  'myModal-hrtecrtw': 36,
  'myModal-hrwecrtw': 36,
};

nodeCron.schedule('0 */12 * * *', async () => {
  await load();
});

app.get('/', function (req, res) {
  res.send('Hello World');
});

app.get('/to', async (req, res) => {
  let all = cache.get('to');
  if (!all) {
    await load();

    all = cache.get('to');
  }

  return res.json(all);
});

app.get('/from', async (req, res) => {
  let all = cache.get('from');
  if (!all) {
    await load();

    all = cache.get('from');
  }

  return res.json(all);
});

app.get('/clear-cache', (req, res) => {
  cache.del(['to', 'from']);
  res.send('Success');
});

app.listen(3000, async () => {
  console.log(`Server started on port 3000.`);

  await load();
});

async function load() {
  const content = await getHtmlFromUrl('http://www.jgpnis.com/red-voznje/');

  const allTo = parseTo(content);
  const oldTo = cache.get('to');

  const res1 = objectTester(oldTo, allTo);

  cache.set('to', allTo, 60 * 60 * 13);

  const allFrom = parseFrom(content);
  const oldFrom = cache.get('from');

  const res2 = objectTester(oldFrom, allFrom);

  cache.set('from', allFrom, 60 * 60 * 13);

  console.log('Load successfull.');
}

function logHTML(html) {
  console.log(html.map((x) => x.tagName));
}

function parseTo(content) {
  const json = Object.keys(modals).map((x, i) => {
    if (i % 2 != 0) return;
    return parsers.parseGenericLine(content, modals[x], x);
  });

  const special = Object.keys(specialModals).map((x, i) => {
    if (i % 2 != 0) return;
    return parsers.parseGenericLine(content, specialModals[x], x, parsers.parseSpecialLineTime);
  });

  const nodes = [...content.querySelector('#myModal-99 .modal-body').childNodes].filter(
    (x) => x.innerHTML
  );

  const prigradski = parsers.parseNodes(nodes);

  all = [...json, ...special, ...prigradski].filter((x) => x);

  return all;
}

function parseFrom(content) {
  const json = Object.keys(modals).map((x, i) => {
    if (i % 2 != 1) return;
    return parsers.parseGenericLine(content, modals[x], x);
  });

  const special = Object.keys(specialModals).map((x, i) => {
    if (i % 2 != 1) return;
    return parsers.parseGenericLine(content, specialModals[x], x, parsers.parseSpecialLineTime);
  });

  const nodes = [...content.querySelector('#myModal-88 .modal-body').childNodes].filter(
    (x) => x.innerHTML
  );

  const prigradski = parsers.parseNodes(nodes);

  all = [...json, ...special, ...prigradski].filter((x) => x);

  return all;
}

async function getHtmlFromUrl(url) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(url);

  const content = HTMLParser.parse(await page.content());

  await browser.close();
  return content;
}

function compare(comp1, comp2) {}

// Helper to return a value's internal object [[Class]]
// That this returns [object Type] even for primitives
function getClass(obj) {
  return Object.prototype.toString.call(obj);
}

/*
 ** @param a, b        - values (Object, RegExp, Date, etc.)
 ** @returns {boolean} - true if a and b are the object or same primitive value or
 **                      have the same properties with the same values
 */
function objectTester(a, b) {
  // If a and b reference the same value, return true
  if (a === b) return true;

  // If a and b aren't the same type, return false
  if (typeof a != typeof b) return false;

  // Already know types are the same, so if type is number
  // and both NaN, return true
  if (typeof a == 'number' && isNaN(a) && isNaN(b)) return true;

  // Get internal [[Class]]
  var aClass = getClass(a);
  var bClass = getClass(b);

  // Return false if not same class
  if (aClass != bClass) return false;

  // If they're Boolean, String or Number objects, check values
  if (aClass == '[object Boolean]' || aClass == '[object String]' || aClass == '[object Number]') {
    return a.valueOf() == b.valueOf();
  }

  // If they're RegExps, Dates or Error objects, check stringified values
  if (aClass == '[object RegExp]' || aClass == '[object Date]' || aClass == '[object Error]') {
    return a.toString() == b.toString();
  }

  // Otherwise they're Objects, Functions or Arrays or some kind of host object
  if (typeof a == 'object' || typeof a == 'function') {
    // For functions, check stringigied values are the same
    // Almost certainly false if a and b aren't trivial
    // and are different functions
    if (aClass == '[object Function]' && a.toString() != b.toString()) return false;

    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);

    // If they don't have the same number of keys, return false
    if (aKeys.length != bKeys.length) return false;

    // Check they have the same keys
    if (
      !aKeys.every(function (key) {
        return b.hasOwnProperty(key);
      })
    )
      return false;

    // Check key values - uses ES5 Object.keys
    return aKeys.every(function (key) {
      return objectTester(a[key], b[key]);
    });
  }
  return false;
}
