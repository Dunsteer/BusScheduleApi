const fetch = require("node-fetch");
const HTMLParser = require("node-html-parser");
const express = require("express");
const NodeCache = require("node-cache");
const convert = require("cyrillic-to-latin");

const cache = new NodeCache();
const app = express();

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
      obj.name = convert(current.childNodes[2].rawText.trim());

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
  return [...stringToArrayOfTime(inputStr), ...extractFoosnote(inputStr)].flat();
}
