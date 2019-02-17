'use strict'

const chartDatetimeFormatter   = d3.time.format("%d.%m.%y - %H:%M"); //see https://github.com/mbostock/d3/wiki/Time-Formatting
const tableDatetimeFormatter   = d3.time.format("%d.%m.%y - %H:%M:%S"); //see https://github.com/mbostock/d3/wiki/Time-Formatting
const soapServiceHistDataUrl   = "http://raspberrypi:3000/sensors/history";
const soapServiceLatestDataUrl = "http://raspberrypi:3000/sensors/latest";

    $(function() {
      $("#fromdate").datepicker({
        changeMonth: true,
        onClose: function(selectedDate) {
          $("#todate").datepicker("option", "minDate", selectedDate);
        }
      });
      $("#todate").datepicker({
        changeMonth: true,
        onClose: function( selectedDate ) {
          $("#fromdate").datepicker("option", "maxDate", selectedDate);
        }
      });
    });
    
        $(function() {
      $("#refresh_historical_btn")
        .button()
        .click(function(event) {
          getHistoricalSensordata();
        });
    });
    $(function() {
      $("#refresh_latest_btn")
        .button()
        .click(function(event) {
          getLatestSensordata();
        });
    });
  
    function getHistoricalSensordata() {
      var fromDate   = $("#fromdate").val();
      var fromTs     = fromDate == "" ? "" : Date.parse(fromDate);
      var toDate     = $("#todate").val();
      var oneDayInMs = new Date(1970, 0, 2) - new Date(1970, 0, 1);
      var toTs       = toDate == "" ? "" : Date.parse(toDate) + oneDayInMs - 1; //increase to end of day
      $.ajax({
        url: soapServiceHistDataUrl + "?fromtimestamp=" + fromTs + "&totimestamp=" + toTs
      }).then(function(data) {
        var chartData = [];
        data.forEach(function(elem) {
          var color = elem.sensorKind == 'temperature' ? '#A4C4E8' : elem.sensorKind == 'humidity' ? '#FCDAB0' : '#336600';
          chartData.push({key: (elem.sensorKind +" " +elem.sensorName), area: true, color: color, values: elem.values});
        });
        drawChart(chartData);
      });
    }

    function getLatestSensordata() {
      $.ajax({
        url: soapServiceLatestDataUrl
      }).then(function(data) {
        $('#dynamictable').empty();
        $('#dynamictable').append('<table></table>');
        var table = $('#dynamictable').children();
        table.append("<tr><th>Type</th><th>Sensor</th><th>Timestamp</th><th>Value</th></tr>");
        data.forEach(function(elem) {
          table.append("<tr><td>" + elem.sensorKind + "</td><td>" + elem.sensorName + "</td><td>" + tableDatetimeFormatter(new Date(elem.values[0].x)) + "</td><td>" + elem.values[0].y.toFixed(1) + "</td></tr>");
        });
      });
    }

    function drawChart(tempHumidData) {
      nv.addGraph(function() {
        // For other chart types see: https://nvd3.org/examples/index.html
        // API documentation: https://github.com/novus/nvd3/wiki/API-Documentation
        var chart = nv.models.lineChart()
          .margin({left: 100})
          .margin({bottom: 130})
          .useInteractiveGuideline(true)
          .transitionDuration(500)
          .showLegend(true);
        
        chart.xAxis    
          .rotateLabels(-45)
          .tickFormat(function(d) { 
            return chartDatetimeFormatter(new Date(d))
          });
        
        chart.yAxis     
          .axisLabel('Temperature °C / Humidity %')
          .tickFormat(d3.format('.01f'));
        
        d3.select('#chart svg') 
          .datum(tempHumidData) 
          .call(chart);
        
        nv.utils.windowResize(function() { chart.update() });
        return chart;
      });
    }