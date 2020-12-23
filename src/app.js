const HTMLParser = require("node-html-parser");
const express = require("express");
const NodeCache = require("node-cache");
const convert = require("cyrillic-to-latin");
const fs = require("fs");
const puppeteer = require("puppeteer");
const compression = require("compression");

const cache = new NodeCache();
const app = express();

app.use(compression());

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
  "myModal-ppp": 4,
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
};

const specialModals = {
  "myModal-hrtecrtw": 36,
  "myModal-hrwecrtw": 36,
};

app.get("/", function (req, res) {
  res.send("Hello World");
});

app.get("/to", async (req, res) => {
  let all = cache.get("to");
  if (!all) {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto("http://www.jgpnis.com/red-voznje/");

    const content = HTMLParser.parse(await page.content());

    await browser.close();

    //fs.writeFileSync("./asd.html", await page.content());

    const json = Object.keys(modals).map((x, i) => {
      if (i % 2 != 0) return;
      return parseGenericLine(content, modals[x], x);
    });

    const special = Object.keys(specialModals).map((x, i) => {
      if (i % 2 != 0) return;
      return parseGenericLine(content, specialModals[x], x, parseSpecialLineTime);
    });

    const nodes = [...content.querySelector("#myModal-99 .modal-body").childNodes].filter((x) => x.innerHTML);

    const prigradski = parseNodes(nodes);

    all = [...json, ...special, ...prigradski].filter((x) => x);

    cache.set("to", all, 3600);
  }

  return res.json(all);
});

app.get("/from", async (req, res) => {
  let all = cache.get("from");
  if (!all) {
    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();
    await page.goto("http://www.jgpnis.com/red-voznje/");

    const content = HTMLParser.parse(await page.content());

    await browser.close();

    //fs.writeFileSync("./asd.html", await page.content());

    const json = Object.keys(modals).map((x, i) => {
      if (i % 2 != 1) return;
      return parseGenericLine(content, modals[x], x);
    });

    const special = Object.keys(specialModals).map((x, i) => {
      if (i % 2 != 1) return;
      return parseGenericLine(content, specialModals[x], x, parseSpecialLineTime);
    });

    const nodes = [...content.querySelector("#myModal-88 .modal-body").childNodes].filter((x) => x.innerHTML);

    const prigradski = parseNodes(nodes);

    all = [...json, ...special, ...prigradski].filter((x) => x);

    cache.set("from", all, 3600);
  }
  return res.json(all);
});

app.get("/clear-cache", (req, res) => {
  cache.del(["to", "from"]);
  res.send("Success");
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
      }

      current = nodes[i + 2];
      if (current.childNodes[3].childNodes[0]) {
        obj.saturday = parseArray(current.childNodes[3].childNodes[0].innerHTML);
      }

      current = nodes[i + 3];
      if (current.childNodes[3].childNodes[0]) {
        obj.sunday = parseArray(current.childNodes[3].childNodes[0].innerHTML);
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

function extractFootnote(inputStr) {
  const res = inputStr.match(/(\*.*$)/g);
  return res || [];
}

function parseArray(inputStr) {
  return [...stringToArrayOfTime(inputStr), ...extractFootnote(convert(inputStr))].flat();
}

/**
 *
 * @param {HTMLElement} content
 * @param {number} id
 * @param {string} parent
 */
function parseGenericLine(content, id, parent, parser) {
  content = content.querySelector(`#${parent}`);
  const header = content.querySelector(".modal-title");

  const names = header.querySelectorAll("font");

  const name = `${names[0].innerHTML} - ${names[1].innerHTML}`;
  //([\*|_]+[Љ-џ\s(),]+|([Љ-џ]+[\s]+))

  const obj = {
    id,
    name,
  };

  const days = Array.from([...content.querySelectorAll(".tab-pane")]);

  days.forEach((day, i) => {
    let parsedFootnotes = parseGenericLineFootnote(day);
    let parsedTime = null;
    if (parser) {
      parsedTime = parser(day);
    } else {
      parsedTime = parseGenericLineTime(Array.from([...day.querySelectorAll("tr")].filter((x) => x.innerHTML)));
    }

    obj[mapping[i]] = parsedTime.concat(parsedFootnotes).flat();
  });

  return obj;
}

/**
 *
 * @param {HTMLElement[]} node
 */
function parseGenericLineTime(node) {
  return node
    .map((x) => {
      const firstHalf = x.childNodes[1].innerHTML.trim();

      if (isNumeric(firstHalf)) {
        const extractedNumbers = x.childNodes[3].innerHTML.match(/[0-9*,]+/g);
        if (extractedNumbers) {
          const nodes = extractedNumbers.join("").match(/([0-9]+)(\*)*/g);

          const arr = Array.from(nodes);
          return arr.map((y) => `${firstHalf}:${y}`);
        } else {
          return [];
        }
      }
    })
    .flat()
    .filter((x) => x);
}

function parseGenericLineFootnote(day) {
  const footnotes = Array.from([...day.querySelectorAll("p")]);

  return footnotes.map((x) => {
    let matches = x.innerHTML.match(/([\*_Љ-џ(),\s\.]+)/g);

    if (matches) {
      return matches
        .reduce((acc, idk) => {
          let trimed = idk.trim();

          if (trimed) {
            if (trimed.includes("*") || trimed.includes("_")) {
              return `${acc} && ${trimed}`;
            } else {
              return `${acc} ${trimed}`;
            }
          } else {
            return acc;
          }
        }, "")
        .split("&&")
        .map((x) => x.trim())
        .filter((x) => x);
    } else {
      return "";
    }
  });
}

function parseSpecialLineTime(node) {
  return stringToArrayOfTime(node.innerHTML);
}

function isNumeric(str) {
  return /^\d+$/.test(str);
}

function logHTML(html) {
  console.log(html.map((x) => x.tagName));
}
