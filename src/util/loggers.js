const fs = require('fs');

function logHTML(html) {
  console.log(html.map((x) => x.tagName));
}

function logToFile(json) {
  fs.writeFileSync(`log/${makeid(5)}.txt`, json);
}

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

module.exports = {
  logHTML,
  logToFile,
};
