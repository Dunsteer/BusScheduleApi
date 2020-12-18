const fetch = require("node-fetch");
const HTMLParser = require("node-html-parser");
const express = require("express");
const NodeCache = require("node-cache");
const convert = require("cyrillic-to-latin");
const fs = require("fs");
const puppeteer = require("puppeteer");

const cache = new NodeCache();
const app = express();

const mapping = {
  0: "workDays",
  1: "saturday",
  2: "sunday",
};

const modals = {
  "myModal-jje": 1,
  "myModal-jjk": 1,
  "myModal-dva": 2,
  "myModal-dvaa": 2,
  "myModal-jz": 3,
  "myModal-jzz": 3,
  "myModal-pp": 4,
  "myModal-pp": 4,
  "myModal-kuj": 5,
  "myModal-kje": 5,
  "myModal-kok": 6,
  "myModal-juu": 6,
  "myModal-bgbge": 7,
  "myModal-bbfe": 7,
  "myModal-hrt": 8,
  "myModal-hrw": 8,
  "myModal-hrte": 9,
  "myModal-hrwe": 9,
  "myModal-hrtel": 10,
  "myModal-hrwel": 10,
  "myModal-hrtelme": 11,
  "myModal-hrwelme": 11,
  "myModal-hrtec": 12,
  "myModal-hrwec": 12,
  "myModal-hrtecr": 13,
  "myModal-hrwecr": 13,
  "myModal-hrtecrt": 34,
  "myModal-hrwecrt": 34,
  "myModal-hrtecrtw": 36,
  "myModal-hrwecrtw": 36,
};

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.get("/from", function (req, res) {
  let json = cache.get("from");
  if (json == undefined) {
    fetch("http://www.jgpnis.com/red-voznje/")
      .then((x) => x.text())
      .then((x) => HTMLParser.parse(x))
      .then((x) => {
        const nodes = [...x.querySelector("#myModal-88 .modal-body").childNodes].filter((x) => x.innerHTML);

        var json = parseNodes(nodes);

        cache.set("from", json, 3600);

        return res.json(json);
      });
  } else {
    return res.json(json);
  }
});

app.get("/to", function (req, res) {
  let json = cache.get("to");
  if (json == undefined) {
    fetch("http://www.jgpnis.com/red-voznje/")
      .then((x) => x.text())
      .then((x) => HTMLParser.parse(x))
      .then((x) => {
        const nodes = [...x.querySelector("#myModal-99 .modal-body").childNodes].filter((x) => x.innerHTML);

        var json = parseNodes(nodes);

        cache.set("to", json, 3600);

        return res.json(json);
      });
  } else {
    return res.json(json);
  }
});

app.get("/test-to", async (req, res) => {
  let all = cache.get("test-to");
  if (!all) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("http://www.jgpnis.com/red-voznje/");

    const content = HTMLParser.parse(await page.content());

    //fs.writeFileSync("./asd.html", await page.content());

    const json = Object.keys(modals).map((x, i) => {
      if (i % 2 != 0) return;
      return parseGenericLine(content, modals[x], x);
    });

    const nodes = [...content.querySelector("#myModal-99 .modal-body").childNodes].filter((x) => x.innerHTML);

    const prigradski = parseNodes(nodes);

    all = [...json, ...prigradski].filter((x) => x);

    cache.set("test-to", all, 3600);
  }

  return res.json(all);
});

app.get("/test-from", async (req, res) => {
  let all = cache.get("test-from");
  if (!all) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto("http://www.jgpnis.com/red-voznje/");

    const content = HTMLParser.parse(await page.content());

    //fs.writeFileSync("./asd.html", await page.content());

    const json = Object.keys(modals).map((x, i) => {
      if (i % 2 != 1) return;
      return parseGenericLine(content, modals[x], x);
    });

    const nodes = [...content.querySelector("#myModal-88 .modal-body").childNodes].filter((x) => x.innerHTML);

    const prigradski = parseNodes(nodes);

    all = [...json, ...prigradski].filter((x) => x);

    cache.set("test-from", all, 3600);
  }
  return res.json(all);
});

app.listen(3000, () => {
  console.log(`Server started on port 3000.`);
});

function parseNodes(nodes) {
  const res = [];

  for (let i = 0; i < nodes.length; i += 4) {
    let current = nodes[i];
    if (current.childNodes[1].innerHTML) {
      const obj = {};
      res.push(obj);

      obj.id = convert(current.childNodes[1].innerHTML.trim());
      obj.name = convert(current.childNodes[2].rawText.trim().replace(",", ""));

      const regex = /,|\./;
      current = nodes[i + 1];
      if (current.childNodes[3].childNodes[0]) {
        obj.workDays = parseArray(current.childNodes[3].childNodes[0].innerHTML);
        //parseLast(obj.workDays);
      }

      current = nodes[i + 2];
      if (current.childNodes[3].childNodes[0]) {
        obj.saturday = parseArray(current.childNodes[3].childNodes[0].innerHTML);
        //parseLast(obj.saturday);
      }

      current = nodes[i + 3];
      if (current.childNodes[3].childNodes[0]) {
        obj.sunday = parseArray(current.childNodes[3].childNodes[0].innerHTML);
        //parseLast(obj.sunday);
      }
    }
  }

  return res;
}

/**
 * @param {string} inputStr
 */
function stringToArrayOfTime(inputStr) {
  const timeReg = /([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?(\*)?/g;

  const res = inputStr.match(timeReg);

  return res || [];
}

function extractFoosnote(inputStr) {
  const res = inputStr.match(/(\*.*$)/g);
  return res || [];
}

function parseArray(inputStr) {
  return [...stringToArrayOfTime(inputStr), ...extractFoosnote(convert(inputStr))].flat();
}

/**
 *
 * @param {HTMLElement} content
 * @param {number} id
 * @param {string} parent
 */
function parseGenericLine(content, id, parent) {
  content = content.querySelector(`#${parent}`);
  const header = content.querySelector(".modal-title").innerHTML;

  const name = header.match(/([Љ-џ]+)/g).reduce((acc, x) => {
    if (x.length > 2) {
      return (acc = `${acc} ${x}`);
    } else {
      return acc.trim();
    }
  }, "");

  const obj = {
    id,
    name,
  };

  //const raspored1 = Array.from([...content.querySelector("#radnidan1aa").childNodes].filter((x) => x.innerHTML)[1].childNodes[1].childNodes);
  //const raspored2 = Array.from([...content.querySelector("#subota2bb").childNodes].filter((x) => x.innerHTML)[1].childNodes[1].childNodes);
  //const raspored3 = Array.from([...content.querySelector("#nedelja3bb").childNodes].filter((x) => x.innerHTML)[1].childNodes[1].childNodes);

  const days = Array.from([...content.querySelectorAll(".tab-pane")].filter((x) => x.innerHTML));
  days.forEach((day, i) => {
    obj[mapping[i]] = parseGenericLineDay(Array.from([...day.querySelectorAll("tr")].filter((x) => x.innerHTML)));
  });

  // const workDays = parseGenericLine(raspored1);
  // const saturday = parseGenericLine(raspored2);
  // const sunday = parseGenericLine(raspored3);

  return obj;
}

function parseGenericLineDay(node) {
  return node
    .map((x) => {
      const firstHalf = x.childNodes[1].innerHTML.trim();
      if (isNumeric(firstHalf)) {
        const nodes = x.childNodes[3].innerHTML.match(/([0-9]+)(\*)*/g);
        if (!nodes) return [];
        const arr = Array.from(nodes);
        return arr.map((y) => `${firstHalf}:${y}`);
      }
    })
    .flat()
    .filter((x) => x);
}

function isNumeric(str) {
  return /^\d+$/.test(str);
}

function logHTML(html) {
  console.log(html.map((x) => x.tagName));
}
