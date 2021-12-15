'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;

const MQTT_SUBSCRIBE_NOTIFY_TOPIC = "esp32_webapi_notify";
const MQTT_SUBSCRIBE_PUSH_TOPIC = "esp32_webapi_push";
const DEFAULT_TIMEOUT = 60 * 1000;

const mqtt = require('mqtt')
const fetch = require('node-fetch');
const Headers = fetch.Headers;

let mqtt_client = mqtt.connect(MQTT_BROKER_URL);
let mqtt_msgId = 0;
let requestMap = new Map();

exports.handler = async (event, context, callback) => {
	var body = JSON.parse(event.body);
	var endpoint = event.path.substr("/mqttapi".length);
	var topic = event.queryStringParameters.topic;
	var oneway = event.queryStringParameters.oneway;
	if( body.topic )
		topic = body.topic;
	if( body.oneway )
		oneway = body.oneway;

	var msgId = ++mqtt_msgId;

	cleanUpRequestMap();

	var message = {
		endpoint: endpoint,
		topic: MQTT_SUBSCRIBE_NOTIFY_TOPIC,
		msgId: msgId,
		params: body,
		oneway: oneway
	};

	if( !message.oneway ){
		return new Promise((resolve, reject) =>{
			requestMap.set(msgId, { resolve, reject, created_at: new Date().getTime() });
			mqtt_client.publish(topic, JSON.stringify(message));
		});
	}else{
		mqtt_client.publish(topic, JSON.stringify(message));
		return new Response({status: "OK" });
	}
};

exports.trigger = async (event, context) => {
	if( context.topic == MQTT_SUBSCRIBE_NOTIFY_TOPIC){
		var body = JSON.parse(event);
		if( requestMap.get(body.msgId) ){
			var obj = requestMap.get(body.msgId);
			obj.resolve(new Response({ status: body.status, result: body.result }));
			requestMap.delete(body.msgId);
		}else{
			console.error('requestMap not found');
		}
		cleanUpRequestMap();
	}else
	if( context.topic == MQTT_SUBSCRIBE_PUSH_TOPIC ){
		var body = JSON.parse(event);
		console.log("MQTT_SUBSCRIBE_PUSH_TOPIC", body);

		await do_post(body.url, body);
	}
};

function cleanUpRequestMap(){
	var now = new Date().getTime();
	requestMap.forEach((value, key) => {
		if( value.create_at < now - DEFAULT_TIMEOUT ){
			value.reject("timeout");
			requestMap.delete(key);
			console.log("timeout deleted(" + key + ")");
		}
	});
}

function do_post(url, body) {
  const headers = new Headers({ "Content-Type": "application/json" });

  return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
      return response.json();
    });
}