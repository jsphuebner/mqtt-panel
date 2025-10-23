let host = window.location.hostname;
let port = 9001;
let topic = '#';
let useTLS = false;
let cleansession = true;
let reconnectTimeout = 3000;
let powerData = new Array();
let priceData = new Array();
let mqtt;

function MQTTconnect() {
    if (typeof path == "undefined") {
        path = '/';
    }
    mqtt = new Paho.MQTT.Client(host, port, path, "mqtt_panel" + parseInt(Math.random() * 100, 10));
    let options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function (message) {
            $('#status').html("Connection failed: " + message.errorMessage + "Retrying...")
                .attr('class', 'alert alert-danger');
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    console.log("Host: " + host + ", Port: " + port + ", Path: " + path + " TLS: " + useTLS);
    mqtt.connect(options);
};

function onConnect() {
    $('#status').html('Connected to ' + host + ':' + port + path)
        .attr('class', 'alert alert-success');
    mqtt.subscribe(topic, { qos: 0 });
    $('#topic').html(topic);
};

function onConnectionLost(response) {
    setTimeout(MQTTconnect, reconnectTimeout);
    $('#status').html("Connection lost. Reconnecting...")
        .attr('class', 'alert alert-warning');
};

function onMessageArrived(message) {
    let topic = message.destinationName;
    let payload = message.payloadString;
    console.log("Topic: " + topic + ", Message payload: " + payload);

	var span = document.getElementById(topic);
	
	if (span)
		$(span).html(payload);
	
	span = document.getElementById(topic + "/set");

	if (span)
	    span.value = parseFloat(payload);
	
	if (topic == "/meter/power")
	{
		powerData.push({
				        "timestamp": new Date().toLocaleTimeString(),
				        "value": parseInt(payload)
				    });
	    if (powerData.length >= 100) {
	        powerData.shift()
	    }
		updateChart(chartPower, powerData);
	}
	
	if (topic == "/spotmarket/pricelist")
	{
		var pricelist = JSON.parse(payload);
		pricelist = pricelist.data;
		priceData = [];
		
		for (var i = 0; i < pricelist.length; i++)
		{
			priceData.push({ "timestamp": new Date(pricelist[i].start_timestamp).toLocaleTimeString(), "value": pricelist[i].marketprice });
		}
		updateChart(chartPrice, priceData);
	}
};

function updateFromSlider(slider)
{
	// Publish a Message
	var message = new Paho.MQTT.Message(slider.value);
	message.destinationName = slider.id.replace("/set", "");
	message.qos = 0;
	message.retained = true;

	mqtt.send(message);
}

function updateChart(chart, data) {
    let values = []
    let timestamps = []

    data.map((entry) => {
        values.push(entry.value);
        timestamps.push(entry.timestamp);
    });
    
    chart.config.data.labels = timestamps;
    chart.config.data.datasets[0].data = values;

    chart.update();
}

function createCharts() {
    var ctx = document.getElementById("priceChart").getContext("2d");

    chartPrice = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: []
            }]
        },
        options: {
			animation: {
				duration: 0
			},
            legend: {
                display: false
            }
        }
    });
    
    ctx = document.getElementById("tempChart").getContext("2d");

    chartPower = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: []
            }]
        },
        options: {
			animation: {
				duration: 0
			},
            legend: {
                display: false
            }
        }
    });
}

$(document).ready(function () {
    createCharts();
    MQTTconnect();
});
