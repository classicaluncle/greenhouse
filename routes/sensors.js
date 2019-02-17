var express = require('express');
var router = express.Router();
var glob = require("glob");
var path = require('path');
var fs = require('fs');
var csvParser = require('csv-parse');

var sensorFilesBasePath    = "/home/pi/Greenhouse/data/";
var histSensorFilesPaths   = glob.sync(sensorFilesBasePath + "@(temperature|humidity)_*_log_*.csv");
var latestSensorFilesPaths = glob.sync(sensorFilesBasePath + "@(temperature|humidity)_*_latest_value.csv");
var valuesFilenameRegex    = /\b(temperature|humidity)_([^_]*)_(log|latest_value)_?(\d{4})?/;

Array.prototype.addValues = function (otherArray) { otherArray.forEach(function(v) { this.push(v); }, this); };
/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/history', function(req, res) {
  res.type('application/json');
  var fromTs = parseInt(req.param('fromtimestamp'));
  var toTs   = parseInt(req.param('totimestamp'));
  console.log("fromtimestamp: " + fromTs + ", totimestamp: " + toTs);
  buildResultRec([], histSensorFilesPaths.slice(), fromTs, toTs, res); 
});
 
router.get('/latest', function(req, res) {
  res.type('application/json');
  buildResultRec([], latestSensorFilesPaths.slice(), NaN, NaN, res);
});
 

module.exports = router;


function buildResultRec(resultAcc, filesPaths, fromTs, toTs, expressRes) {
  if (filesPaths.length === 0) {
    expressRes.json(resultAcc);
    return; 
  }
  var filePath = filesPaths.pop();
  var matches  = filePath.match(valuesFilenameRegex);
  if (matches.length !== 5) { throw "filepath '" + filePath + "' is not in the expected format"; }
  var sensorKind = matches[1];
  var sensorName = matches[2];
  var dataType   = matches[3];
  var yearOfData = matches[4];
  console.log("sensorKind: " + sensorKind + ", sensorName: " + sensorName + ", dataType: " + dataType + ", yearOfData: " + yearOfData);
  fs.readFile(filePath, 'utf8', function (err, data) {
    if (err) {
      return console.log(err);
    }
    csvParser(data, function(err, output){
        if (err) {
        return console.log(err);
      }
      var rows   = output.slice(1);     
      var values = [];
      rows.forEach(function(line) {
        var ts = Date.parse(line[0]);
        if ((isNaN(fromTs) || ts >= fromTs) && 
            (isNaN(toTs) || ts <= toTs)) {
          values.push({x: ts, y: parseFloat(line[1])});
        }
      });
      //because the year is in the filename, it is possible that several files contain data for the same sensor
      var existing = resultAcc.filter(function(item) { return item.sensorName == sensorName && item.sensorKind == sensorKind; });
      if (existing.length > 0) {
        existing[0].values.addValues(values); 
      }
      else {
        resultAcc.push({sensorName: sensorName, sensorKind: sensorKind, values: values}); 
      }
      buildResultRec(resultAcc, filesPaths, fromTs, toTs, expressRes); 
    });
  });
}