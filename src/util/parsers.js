const consts = require('../config/consts');
const convert = require('cyrillic-to-latin');
const loggers = require('./loggers');

function parseArray(inputStr) {
  return [...stringToArrayOfTime(inputStr), ...extractFootnote(convert(inputStr))].flat();
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

function isNumeric(str) {
  return /^\d+$/.test(str);
}

/**
 *
 * @param {HTMLElement} content
 * @param {number} id
 * @param {string} parent
 */
function parseGenericLine(content, id, parent, parser) {
  content = content.querySelector(`#${parent}`);
  const header = content.querySelector('.modal-title');

  const names = header.querySelectorAll('font');

  const name = `${names[0].innerHTML} - ${names[1].innerHTML}`;
  //([\*|_]+[Љ-џ\s(),]+|([Љ-џ]+[\s]+))

  const obj = {
    id,
    name,
    forced: false,
  };

  const days = Array.from([...content.querySelectorAll('.tab-pane')]);

  days.forEach((day, i) => {
    let parsedFootnotes = parseGenericLineFootnote(day);
    let parsedTime = null;
    if (parser) {
      parsedTime = parser(day);
    } else {
      parsedTime = parseGenericLineTime(
        Array.from([...day.querySelectorAll('tr')].filter((x) => x.innerHTML))
      );
    }

    obj[consts.mapping[i]] = parsedTime
      .concat(parsedFootnotes)
      .flat()
      .filter((x) => x);
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
      const firstHalf = x.childNodes[1].innerHTML.trim().match(/[0-9*,]+/g);

      if (firstHalf) {
        if (x.childNodes[3]) {
          const extractedNumbers = x.childNodes[3].innerHTML.match(/[0-9*,]+/g);
          if (extractedNumbers) {
            const nodes = extractedNumbers.join('').match(/([0-9]+)(\*)*/g);

            const arr = Array.from(nodes);
            return arr.map((y) => `${firstHalf}:${y}`);
          } else {
            return [];
          }
        }
      }
    })
    .flat()
    .filter((x) => x);
}

function parseGenericLineFootnote(day) {
  const footnotes = Array.from([...day.querySelectorAll('p')]);

  return footnotes.map((x) => {
    let matches = x.innerHTML.match(/([\*_Љ-џ(),\s\.]+)/g);

    if (matches) {
      return matches
        .reduce((acc, idk) => {
          let trimed = idk.trim();

          if (trimed) {
            if (trimed.includes('*') || trimed.includes('_')) {
              return `${acc} && ${trimed}`;
            } else {
              return `${acc} ${trimed}`;
            }
          } else {
            return acc;
          }
        }, '')
        .split('&&')
        .map((x) => x.trim())
        .filter((x) => x.includes('*') || x.includes('_'));
    } else {
      return;
    }
  });
}

function parseSpecialLineTime(node) {
  return stringToArrayOfTime(node.innerHTML);
}

function parseNodes(nodes) {
  const res = [];

  for (let i = 0; i < nodes.length; i += 4) {
    let current = nodes[i];
    if (current.childNodes[1].innerHTML) {
      const obj = {
        forced: false,
      };
      res.push(obj);

      obj.id = convert(current.childNodes[1].innerHTML.trim());
      obj.name = convert(current.childNodes[2].rawText.trim().replace(',', ''));

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

module.exports = {
  parseArray,
  parseGenericLine,
  parseGenericLineTime,
  parseGenericLineFootnote,
  parseSpecialLineTime,
  parseNodes,
};
