let host = window.location.hostname;
let port = 9001;
let topic = '#';
let useTLS = false;
let cleansession = true;
let reconnectTimeout = 3000;
let tempData = new Array();
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
	
	if (span && topic != "/touran/info/values")
		$(span).html(parseFloat(payload).toFixed(2));
	
	span = document.getElementById(topic + "/set");

	if (span)
	    span.value = parseFloat(payload);
	
	if (topic == "/meter/power")
	{
		tempData.push({
				        "timestamp": new Date().toLocaleTimeString(),
				        "temperature": parseInt(payload)
				    });
				    if (tempData.length >= 100) {
				        tempData.shift()
				    }
	    drawChartPower(tempData);
	}
	
	if (topic == "/touran/info/values")
	{
		var expr = /(\-{0,1}[0-9]+\.[0-9]*)/mg;
		var values = []
		for (var res = expr.exec(payload); res; res = expr.exec(payload))
			values.push(parseFloat(res[1]));
		var soc = values[0];
		var curlimit = values[2];
		var soclimit = values[3];
		$(span).html(soc);
		$("#chargelimit").html(curlimit);
		document.getElementById("/touran/setpoint/chargelimit").value = curlimit;
		$("#soclimit").html(soclimit);
		document.getElementById("/touran/setpoint/soclimit").value = soclimit;
	}
	
	if (topic == "/spotmarket/pricelist")
	{
		var pricelist = JSON.parse(payload);
		pricelist = pricelist.data;
		priceData = [];
		
		for (var i = 0; i < pricelist.length; i++)
		{
			priceData.push({ "timestamp": new Date(pricelist[i].start_timestamp).toLocaleTimeString(), "price": pricelist[i].marketprice });
		}
		drawChartPrice(priceData);
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

function drawChartPower(data) {
    let ctx = document.getElementById("tempChart").getContext("2d");

    let temperatures = []
    let timestamps = []

    data.map((entry) => {
        temperatures.push(entry.temperature);
        timestamps.push(entry.timestamp);
    });

    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: temperatures
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

function drawChartPrice(data) {
    let ctx = document.getElementById("priceChart").getContext("2d");

    let prices = []
    let timestamps = []

    data.map((entry) => {
        prices.push(entry.price);
        timestamps.push(entry.timestamp);
    });

    let chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [{
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgb(255, 99, 132)',
                data: prices
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
    drawChartPower(tempData);
    drawChartPrice(priceData);
    MQTTconnect();
});
