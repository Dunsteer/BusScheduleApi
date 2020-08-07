const fetch = require("node-fetch");
const HTMLParser = require("node-html-parser");
const express = require("express");
const NodeCache = require("node-cache");

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

app.listen(3000);

function parseNodes(nodes) {
  const res = [];

  for (let i = 0; i < nodes.length; i += 4) {
    let current = nodes[i];
    if (current.childNodes[1].innerHTML) {
      const obj = {};
      res.push(obj);

      obj.id = current.childNodes[1].innerHTML.trim();
      obj.name = current.childNodes[2].rawText.trim();

      const regex = /,|\./;
      current = nodes[i + 1];
      if (current.childNodes[3].childNodes[0]) {
        obj.workDays = current.childNodes[3].childNodes[0].innerHTML.split(regex).map((x) => x.trim());
        parseLast(obj.workDays);
      }

      current = nodes[i + 2];
      if (current.childNodes[3].childNodes[0]) {
        obj.saturday = current.childNodes[3].childNodes[0].innerHTML.split(regex).map((x) => x.trim());
        parseLast(obj.saturday);
      }

      current = nodes[i + 3];
      if (current.childNodes[3].childNodes[0]) {
        obj.sunday = current.childNodes[3].childNodes[0].innerHTML.split(regex).map((x) => x.trim());
        parseLast(obj.sunday);
      }
    }
  }
  //console.log(res);
  return res;
}

function parseLast(arr) {
  let last = arr.pop();
  if (last.length > 15) {
    let time = last.substr(0, 6).trim();

    //let ind = 11;

    if (time[time.length - 1] != "*") {
      time = time.substr(0, time.length - 1);
      //ind--;
    }

    if (time != "" && isNumeric(time[0])) {
      arr.push(time);
    }

    let description = last.split("\n")[1].trim();

    description = (description[0].toUpperCase() + description.slice(1)).trim();
    if (description != "") {
      arr.push(description);
    }
    //arr.push(last);
  } else {
    if (last != "") {
      arr.push(last);
    }

    for (let i = 0; i < arr.length; i++) {
      let x = arr[i].split(" ");
      if (x.length > 1 && x[0].length==5) {
        arr[i] = x[0];
        arr.splice(i+1,0,x[1]);
      }
    }
  }
}

function isNumeric(str) {
  return /^\d+$/.test(str);
}
