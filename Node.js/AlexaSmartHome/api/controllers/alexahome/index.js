'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');
const jsonfile = require(HELPER_BASE + 'jsonfile-utils');

const AlexaSmartHomeUtils = require(HELPER_BASE + 'alexa-smarthome-utils');
const app = new AlexaSmartHomeUtils();

const MANUFACTURE_NAME = process.env.MANUFACTURE_NAME || 'スマートデバイス株式会社';
const ALEXA_CLIENT_ID = "【AlexaクライアントID】";
const ALEXA_CLIENT_SECRET = "【Alexaクライアントシークレット】1";
const TOKEN_FNAME = process.env.THIS_BASE_PATH + "/data/alexa_smart_home/token.json";

const MQTTAPI_URL = "https://【中継サーバのホスト名】/mqttapi";
const ESP32_MQTT_TOPIC = "mqttapi/XXX.XXX.XXX.XXX";

const BRIGHTNESS_MAX_VALUE = 2000;
const SERVO_MAX_VALUE = 8500;
const SERVO_MIN_VALUE = 1500;

const { v4: uuidv4 } = require('uuid');
const color = require('color-convert');

const fetch = require("node-fetch");
const Headers = fetch.Headers;

const Arduino = require('./Arduino');
const arduino = new Arduino(MQTTAPI_URL, ESP32_MQTT_TOPIC);
const SHT30 = require('./device/SHT30');
const BMP280 = require('./device/BMP280');
const MPU6886 = require('./device/MPU6886');
const DHT12 = require('./device/DHT12');
const SGP30 = require('./device/SGP30');
const TSL2561 = require('./device/TSL2561');

var dht12;
var mpu6886;
var sgp30;
var tsl2561;
var initialized = false;

async function initialize()
{
	// await arduino.Ledc.setup(1, 50, 16);
	// await arduino.Ledc.attachPin(26, 1);
	await arduino.Wire.begin(32, 33);
	await arduino.Wire1.begin(21, 22);
	await arduino.Gpio.pinMode(10, arduino.Gpio.OUTPUT);
	await arduino.Gpio.digitalWrite(10, arduino.Gpio.HIGH);
	await arduino.Pixels.begin(26);
	dht12 = new DHT12(arduino.Wire);
	mpu6886 = new MPU6886(arduino.Wire1);
	await mpu6886.Init();
	sgp30 = new SGP30(arduino.Wire);
	await sgp30.begin();
	await sgp30.IAQmeasure();
	tsl2561 = new TSL2561(arduino.Wire);
	await tsl2561.init();

	initialized = true;
};

initialize();

app.intent('Alexa.Discovery.Discover', async (handlerInput, context) => {
    console.log('Alexa.Discovery.Discover called.');

		var header = handlerInput.directive.header;
		var payload = {
			endpoints: []
		};

		payload.endpoints.push({
			endpointId: "sensor_01",
			manufacturerName: MANUFACTURE_NAME,
			friendlyName: '照度センサ',
			description: 'スマートデバイスの照度センサ',
			displayCategories: ["LIGHT"],
			capabilities: [
					{
							type: "AlexaInterface",
							interface: "Alexa",
							version: "3"
					},
					{
						type: "AlexaInterface",
						interface: "Alexa.BrightnessController",
						version: "3",
						properties: {
							supported: [
								{
									name: "brightness"
								}
							],
							proactivelyReported: false,
							retrievable: true,
							nonControllable: true
						}
					},
					{
						type: "AlexaInterface",
						interface: "Alexa.PowerController",
						version: "3",
						properties: {
							supported: [
								{
									name: "powerState"
								}
							],
							proactivelyReported: false,
							retrievable: true,
							nonControllable: true
						}
					},
				]
		});

		payload.endpoints.push({
			endpointId: "pixels_01",
			manufacturerName: MANUFACTURE_NAME,
			friendlyName: 'カラー照明',
			description: 'スマートデバイスのカラー照明',
			displayCategories: ["LIGHT"],
			capabilities: [
					{
							type: "AlexaInterface",
							interface: "Alexa",
							version: "3"
					},
					{
						type: "AlexaInterface",
						interface: "Alexa.PowerController",
						version: "3",
						properties: {
							supported: [
								{
									name: "powerState"
								}
							],
							proactivelyReported: false,
							retrievable: true
						}
					},
					{
							type: "AlexaInterface",
							interface: "Alexa.ColorController",
							version: "3",
							properties: {
									supported: [
											{
													name: "color"
											}
									],
									proactivelyReported: false,
									retrievable: true
							}
					}
			]
		});

		// payload.endpoints.push({
		// 	endpointId: "servo_01",
		// 	manufacturerName: MANUFACTURE_NAME,
		// 	friendlyName: "サーボ",
		// 	description: "スマートデバイスのサーボ",
		// 	displayCategories: ["OTHER"],
		// 	capabilities:
		// 	[
		// 		{
		// 			type: "AlexaInterface",
		// 			interface: "Alexa",
		// 			version: "3"
		// 		},
		// 		{
		// 			type: "AlexaInterface",
		// 			interface: "Alexa.RangeController",
		// 			instance: "Servo.26",
		// 			version: "3",
		// 			properties: {
		// 				supported: [{
		// 						name: "rangeValue"
		// 				}],
		// 				proactivelyReported: false,
		// 				retrievable: true,
		// 			},
		// 			capabilityResources: {
		// 				friendlyNames: [
		// 					{
		// 						"@type": "text",
		// 						value: {
		// 							text: "サーボ",
		// 							locale: "ja-JP"
		// 						}
		// 					}
		// 				]
		// 			},
		// 			configuration: {
		// 				supportedRange: {
		// 					minimumValue: 1500,
		// 					maximumValue: 8500,
		// 					precision: 100
		// 				},
		// 				presets: [
		// 					{
		// 						rangeValue: 8500,
		// 						presetResources: {
		// 							friendlyNames: [
		// 								{
		// 									"@type": "asset",
		// 									value: {
		// 										assetId: "Alexa.Value.Maximum"
		// 									}
		// 								},
		// 								{
		// 									"@type": "asset",
		// 									value: {
		// 										assetId: "Alexa.Value.High"
		// 									}
		// 								},
		// 								{
		// 									"@type": "text",
		// 									value: {
		// 										text: "最大",
		// 										locale: "ja-JP"
		// 									}
		// 								}
		// 							]
		// 						}
		// 					},
		// 					{
		// 						rangeValue: 1500,
		// 						presetResources: {
		// 							friendlyNames: [
		// 								{
		// 									"@type": "asset",
		// 									value: {
		// 										assetId: "Alexa.Value.Minimum"
		// 									}
		// 								},
		// 								{
		// 									"@type": "asset",
		// 									value: {
		// 										assetId: "Alexa.Value.Low"
		// 									}
		// 								},
		// 								{
		// 									"@type": "text",
		// 									value: {
		// 										text: "最小",
		// 										locale: "ja-JP"
		// 									}
		// 								}
		// 							]
		// 						}
		// 					}
		// 				]
		// 			}
		// 		},
		// 	]
		// });

		payload.endpoints.push({
			endpointId: "meter_01",
			manufacturerName: MANUFACTURE_NAME,
			friendlyName: "メーター",
			description: "スマートデバイスのMETER",
			displayCategories: ["OTHER"],
			capabilities:
			[
				{
					type: "AlexaInterface",
					interface: "Alexa",
					version: "3"
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.RangeController",
					instance: "Acc.x",
					version: "3",
					properties: {
						supported: [{
								name: "rangeValue"
						}],
						proactivelyReported: false,
						retrievable: true,
						nonControllable: true
					},
					capabilityResources: {
						friendlyNames: [
							{
								"@type": "text",
								value: {
									text: "X軸の加速度",
									locale: "ja-JP"
								}
							}
						]
					},
					configuration: {
						supportedRange: {
							minimumValue: -2,
							maximumValue: 2,
							precision: 1
						},
						unitOfMeasure: "G",
						presets: []
					}
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.RangeController",
					instance: "Acc.y",
					version: "3",
					properties: {
						supported: [{
								name: "rangeValue"
						}],
						proactivelyReported: false,
						retrievable: true,
						nonControllable: true
					},
					capabilityResources: {
						friendlyNames: [
							{
								"@type": "text",
								value: {
									text: "Y軸の加速度",
									locale: "ja-JP"
								}
							}
						]
					},
					configuration: {
						supportedRange: {
							minimumValue: -2,
							maximumValue: 2,
							precision: 1
						},
						unitOfMeasure: "G",
						presets: []
					}
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.RangeController",
					instance: "Acc.z",
					version: "3",
					properties: {
						supported: [{
								name: "rangeValue"
						}],
						proactivelyReported: false,
						retrievable: true,
						nonControllable: true
					},
					capabilityResources: {
						friendlyNames: [
							{
								"@type": "text",
								value: {
									text: "Z軸の加速度",
									locale: "ja-JP"
								}
							}
						]
					},
					configuration: {
						supportedRange: {
							minimumValue: -2,
							maximumValue: 2,
							precision: 1
						},
						unitOfMeasure: "G",
						presets: []
					}
				},
				{
					type: "AlexaInterface",
					interface: "Alexa.RangeController",
					instance: "SGP30.eCO2",
					version: "3",
					properties: {
						supported: [{
								name: "rangeValue"
						}],
						proactivelyReported: false,
						retrievable: true,
						nonControllable: true
					},
					capabilityResources: {
						friendlyNames: [
							{
								"@type": "text",
								value: {
									text: "eCO2",
									locale: "ja-JP"
								}
							}
						]
					},
					configuration: {
						supportedRange: {
							minimumValue: 400,
							maximumValue: 60000,
							precision: 1
						},
						unitOfMeasure: "ppm",
						presets: []
					}
				},
			]
		});

		payload.endpoints.push({
			endpointId: "toggle_01",
			manufacturerName: MANUFACTURE_NAME,
			friendlyName: "GPIO",
			description: "スマートデバイスのGPIO",
			displayCategories: ["SWITCH"],
			capabilities:
			[
				{
					type: "AlexaInterface",
					interface: "Alexa",
					version: "3"
				},
				{
  					type: "AlexaInterface",
						interface: "Alexa.ToggleController",
						instance: "Pin.39",
						version: "3",
						properties: {
							supported: [{
									name: "toggleState"
							}],
							proactivelyReported: false,
							retrievable: true,
							nonControllable: true
						},
						capabilityResources: {
							friendlyNames: [
								{
									"@type": "text",
									value: {
										text: "GPIO_39",
										locale: "ja-JP"
									}
								}
							]
						}							
					}
				]
		});

		payload.endpoints.push(
			{
					endpointId: "switch_01",
					manufacturerName: MANUFACTURE_NAME,
					friendlyName: "LED",
					description: "スマートデバイスのLED",
					displayCategories: ["SWITCH"],
					capabilities:
					[
							{
								type: "AlexaInterface",
								interface: "Alexa",
								version: "3"
							},
							{
									interface: "Alexa.PowerController",
									version: "3",
									type: "AlexaInterface",
									properties: {
											supported: [{
													name: "powerState"
											}],
											proactivelyReported: true,
											retrievable: true
										}
							}
					]
			}
		);

		payload.endpoints.push({
			endpointId: "templ_01",
			manufacturerName: MANUFACTURE_NAME,
			friendlyName: '温度計',
			description: 'スマートデバイスの温度計',
			displayCategories: ["TEMPERATURE_SENSOR"],
			capabilities: [
					{
							type: "AlexaInterface",
							interface: "Alexa",
							version: "3"
					},
					{
							type: "AlexaInterface",
							interface: "Alexa.TemperatureSensor",
							version: "3",
							properties: {
									supported: [
											{
													name: "temperature"
											}
									],
									proactivelyReported: false,
									retrievable: true,
									nonControllable: true
								}
					}
			]
		});

		payload.endpoints.push({
			endpointId: "bell_01",
			manufacturerName: MANUFACTURE_NAME,
			friendlyName: 'ドアベル',
			description: 'スマートデバイスのドアベル',
			displayCategories: ["DOORBELL"],
			capabilities: [
					{
							type: "AlexaInterface",
							interface: "Alexa",
							version: "3"
					},
					{
							type: "AlexaInterface",
							interface: "Alexa.DoorbellEventSource",
							version: "3",
							proactivelyReported: true,
					}
			]
		});

		header.name = "Discover.Response";
		context.succeed({ event: { header: header, payload: payload } });
});

app.intent('Alexa.PowerController.TurnOn', async (handlerInput, context) => {
    console.log('Alexa.PowerController.TurnOn called.');
    await handlePowerControl(handlerInput, context);
});
app.intent('Alexa.PowerController.TurnOff', async (handlerInput, context) => {
    console.log('Alexa.PowerController.TurnOff called.');
    await handlePowerControl(handlerInput, context);
});

app.intent('Alexa.ToggleController.TurnOn', async (handlerInput, context) => {
	console.log('Alexa.ToggleController.TurnOn called.');
	await handleToggleControl(handlerInput, context);
});
app.intent('Alexa.ToggleController.TurnOff', async (handlerInput, context) => {
	console.log('Alexa.ToggleController.TurnOff called.');
	await handleToggleControl(handlerInput, context);
});

app.intent('Alexa.RangeController.SetRangeValue', async (handlerInput, context) => {
	console.log('Alexa.RangeController.SetRangeValue called.');
	await handleRangeControl(handlerInput, context);
});
app.intent('Alexa.RangeController.AdjustRangeValue', async (handlerInput, context) => {
	console.log('Alexa.RangeController.AdjustRangeValue called.');
	await handleRangeControl(handlerInput, context);
});

app.intent('Alexa.ColorController.SetColor', async (handlerInput, context) => {
	console.log('Alexa.ColorController.SetColor called.');
	await handleColorControl(handlerInput, context);
});

async function handlePowerControl(handlerInput, context) {
	var responseHeader = handlerInput.directive.header;
	var requestToken = handlerInput.directive.endpoint.scope.token;
	var requestMethod = handlerInput.directive.header.name;
	var endpointId = handlerInput.directive.endpoint.endpointId

	if( endpointId == "pixels_01"){
		if( requestMethod == "TurnOn")
			await arduino.Pixels.setOnoff(true);
		else
			await arduino.Pixels.setOnoff(false);
	}else
	if( endpointId == "switch_01"){
		if( requestMethod == "TurnOn")
			await arduino.Gpio.digitalWrite(10, arduino.Gpio.LOW);
		else
			await arduino.Gpio.digitalWrite(10, arduino.Gpio.HIGH);
	}

	responseHeader.namespace = "Alexa";
	responseHeader.name = "Response";
	
	var contextResult = {
		properties: [{
				namespace: "Alexa.PowerController",
				name: "powerState",
				value: (requestMethod === "TurnOn") ? 'ON' : 'OFF',
				timeOfSample: new Date().toISOString(),
				uncertaintyInMilliseconds: 1000 
		}]
	};

	var response = {
		context: contextResult,
		event: {
				header: responseHeader,
				endpoint: {
						scope: {
								type: "BearerToken",
								token: requestToken
						},
						endpointId: endpointId
				},
				payload: {}
		}
	};

	context.succeed(response);

	var report_header = {
		messageId: uuidv4(),
		namespace: "Alexa",
		name: "ChangeReport",
		payloadVersion: "3"
	};

	var report_payload = {
		change: {
			cause: {
				type: "APP_INTERACTION"
			},
			properties: contextResult.properties
		}
	};
	await sendReport(report_header, endpointId, report_payload);
}

async function handleToggleControl(handlerInput, context) {
	var responseHeader = handlerInput.directive.header;
	var requestToken = handlerInput.directive.endpoint.scope.token;
	var requestInstance = handlerInput.directive.header.instance;
	var requestMethod = handlerInput.directive.header.name;
	var endpointId = handlerInput.directive.endpoint.endpointId

	var pin = Number(requestInstance.split('.')[1]);
	if( requestMethod == "TurnOn")
		await arduino.Gpio.digitalWrite(pin, arduino.Gpio.LOW);
	else
		await arduino.Gpio.digitalWrite(pin, arduino.Gpio.HIGH);

	responseHeader.namespace = "Alexa";
	responseHeader.name = "Response";
			
	var contextResult = {
		properties: [{
				namespace: "Alexa.ToggleController",
				instance: requestInstance,
				name: "toggleState",
				value: (requestMethod === "TurnOn") ? 'ON' : 'OFF',
				timeOfSample: new Date().toISOString(),
				uncertaintyInMilliseconds: 1000 
		}]
	};

	var response = {
		context: contextResult,
		event: {
				header: responseHeader,
				endpoint: {
						scope: {
								type: "BearerToken",
								token: requestToken
						},
						endpointId: endpointId
				},
				payload: {}
		}
	};

	context.succeed(response);

	var report_header = {
		messageId: uuidv4(),
		namespace: "Alexa",
		name: "ChangeReport",
		payloadVersion: "3"
	};
	var report_payload = {
		change: {
			cause: {
				type: "APP_INTERACTION"
			},
			properties: contextResult.properties
		}
	};
	await sendReport(report_header, endpointId, report_payload);
}

async function handleRangeControl(handlerInput, context) {
	var responseHeader = handlerInput.directive.header;
	var requestToken = handlerInput.directive.endpoint.scope.token;
	var requestInstance = handlerInput.directive.header.instance;
	var requestMethod = handlerInput.directive.header.name;
	var endpointId = handlerInput.directive.endpoint.endpointId

	var curValue;
	if( requestMethod == "SetRangeValue"){
		curValue = handlerInput.directive.payload.rangeValue;
	}else
	if( requestMethod == "AdjustRangeValue"){
		var curValue = await await arduino.Ledc.read();
		curValue += handlerInput.directive.payload.rangeValueDelta;
		if( curValue < SERVO_MIN_VALUE ) curValue = SERVO_MIN_VALUE;
		else if( curValue > SERVO_MAX_VALUE ) curValue = SERVO_MAX_VALUE;
	}
	await arduino.Ledc.write(1, curValue);

	responseHeader.namespace = "Alexa";
	responseHeader.name = "Response";

	var contextResult = {
		properties: [{
				namespace: "Alexa.RangeController",
				instance: requestInstance,
				name: "rangeValue",
				value: curValue,
				timeOfSample: new Date().toISOString(),
				uncertaintyInMilliseconds: 1000 
		}]
	};

	var response = {
		context: contextResult,
		event: {
				header: responseHeader,
				endpoint: {
						scope: {
								type: "BearerToken",
								token: requestToken
						},
						endpointId: endpointId
				},
				payload: {}
		}
	};

	context.succeed(response);

	var report_header = {
		messageId: uuidv4(),
		namespace: "Alexa",
		name: "ChangeReport",
		payloadVersion: "3"
	};
	var report_payload = {
		change: {
			cause: {
				type: "APP_INTERACTION"
			},
			properties: contextResult.properties
		}
	};
	await sendReport(report_header, endpointId, report_payload);
}

async function handleColorControl(handlerInput, context) {
	var responseHeader = handlerInput.directive.header;
	var requestToken = handlerInput.directive.endpoint.scope.token;
	var requestColor = handlerInput.directive.payload.color;
	var endpointId = handlerInput.directive.endpoint.endpointId

	responseHeader.namespace = "Alexa";
	responseHeader.name = "Response";

	var rgb = color.hsv.rgb([requestColor.hue, requestColor.saturation * 100, requestColor.brightness * 100]);
	await arduino.Pixels.setPixelColor(0, (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]);
	
	var contextResult = {
		properties: [{
				namespace: "Alexa.ColorController",
				name: "color",
				value: requestColor,
				timeOfSample: new Date().toISOString(),
				uncertaintyInMilliseconds: 1000 
		}]
	};

	var response = {
		context: contextResult,
		event: {
				header: responseHeader,
				endpoint: {
						scope: {
								type: "BearerToken",
								token: requestToken
						},
						endpointId: endpointId
				},
				payload: {}
		}
	};

	context.succeed(response);

	var report_header = {
		messageId: uuidv4(),
		namespace: "Alexa",
		name: "ChangeReport",
		payloadVersion: "3"
	};

	var report_payload = {
		change: {
			cause: {
				type: "APP_INTERACTION"
			},
			properties: contextResult.properties
		}
	};
	await sendReport(report_header, endpointId, report_payload);
}

app.intent('Alexa.ReportState', async (handlerInput, context) => {
	console.log('Alexa.ReportState called.');
	var responseHeader =  JSON.parse(JSON.stringify(handlerInput.directive.header));
	var endpointId = handlerInput.directive.endpoint.endpointId;
	var requestToken = handlerInput.directive.endpoint.scope.token;

	responseHeader.namespace = "Alexa";
	responseHeader.name = "StateReport";

	var contextResult = {
		properties:[]
	};

	if( initialized ){
	if( endpointId == 'sensor_01'){
		var val = await tsl2561.readVisibleLux();

		var brightness = Math.floor(val / BRIGHTNESS_MAX_VALUE * 100);
		if( brightness > 100 )
			brightness = 100;
	
			contextResult.properties.push(
				{
						namespace: "Alexa.BrightnessController",
						name: "brightness",
						value: brightness,
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000 
				},
				{
					namespace: "Alexa.PowerController",
					name: "powerState",
					value : (brightness == 0) ? 'OFF' : 'ON',
					timeOfSample: new Date().toISOString(),
					uncertaintyInMilliseconds: 1000
			 }
			);
	}else
	if( endpointId == 'pixels_01'){
		var onoff = await arduino.Pixels.getOnoff();
		var rgb = await arduino.Pixels.getPixelColor(0);
		var hsv = color.rgb.hsv([(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff]);
	
			contextResult.properties.push(
				{
						namespace: "Alexa.ColorController",
						name: "color",
						value: {
								hue : hsv[0],
								saturation: hsv[1] / 100,
								brightness: hsv[2] / 100,
						},
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000 
				},
				{
					namespace: "Alexa.PowerController",
					name: "powerState",
					value : onoff ? 'ON' : 'OFF',
					timeOfSample: new Date().toISOString(),
					uncertaintyInMilliseconds: 1000
			 }
			);
	}else
	if( endpointId == 'templ_01'){
		var templ = await dht12.readTemperature();
	
			contextResult.properties.push(
						{
								namespace: "Alexa.TemperatureSensor",
								name: "temperature",
								value: {
										value : templ,
										scale : 'CELSIUS',
										timeOfSample: new Date().toISOString(),
										uncertaintyInMilliseconds: 1000 
								}
						}
			);
	}else
	if( endpointId == 'toggle_01'){
		var val39 = await arduino.Gpio.digitalRead(39);

			contextResult.properties.push(
				  {
						namespace: "Alexa.ToggleController",
						instance: "Pin.39",
						name: "toggleState",
						value : (val39 == arduino.Gpio.LOW) ? 'OFF' : 'ON',
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000
				  
					}
			);
	}else
	if( endpointId == 'servo_01'){
		var duty = await arduino.Ledc.read(1);

			contextResult.properties.push(
					{
							namespace: "Alexa.RangeController",
							instance: "Servo.26",
							name: "rangeValue",
							value : duty,
							timeOfSample: new Date().toISOString(),
							uncertaintyInMilliseconds: 1000
				}
			);
	}else
	if( endpointId == 'meter_01'){
		var acc = await mpu6886.getAccelData();
		await sgp30.IAQmeasure();

			contextResult.properties.push(
					{
						namespace: "Alexa.RangeController",
						instance: "Acc.x",
						name: "rangeValue",
						value: acc.x.toFixed(3),
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000
					},
					{
						namespace: "Alexa.RangeController",
						instance: "Acc.y",
						name: "rangeValue",
						value: acc.y.toFixed(3),
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000
					},
					{
						namespace: "Alexa.RangeController",
						instance: "Acc.z",
						name: "rangeValue",
						value: acc.z.toFixed(3),
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000
					},
					{
						namespace: "Alexa.RangeController",
						instance: "SGP30.eCO2",
						name: "rangeValue",
						value: sgp30.eCO2,
						timeOfSample: new Date().toISOString(),
						uncertaintyInMilliseconds: 1000
				}
			);
	}else
	if( endpointId == "switch_01" ){
		var val = await arduino.Gpio.digitalRead(10);
		
			contextResult.properties.push(
					{
							namespace: "Alexa.PowerController",
							name: "powerState",
							value : (val == arduino.Gpio.LOW) ? 'ON' : 'OFF',
							timeOfSample: new Date().toISOString(),
							uncertaintyInMilliseconds: 1000
 					}
			);
		}
	}

	var response = {
			context: contextResult,
			event: {
					header: responseHeader,
					endpoint: {
							scope: {
									type: "BearerToken",
									token: requestToken
							},
							endpointId: endpointId
					},
					payload: {}
			}
	};
	console.log(response);
	context.succeed(response);
});

app.intent('Alexa.Authorization.AcceptGrant', async (handlerInput, context) => {
	console.log('Alexa.Authorization.AcceptGrant called.');

	var code = handlerInput.directive.payload.grant.code;
	var body = await do_post('https://api.amazon.com/auth/o2/token', {
		grant_type: 'authorization_code',
		code: code,
		client_id: ALEXA_CLIENT_ID,
		client_secret: ALEXA_CLIENT_SECRET
	});
	console.log(body);
	body.created_at = new Date().getTime();
	await jsonfile.write_json(TOKEN_FNAME, body);

	var header = handlerInput.directive.header;
	header.name = "AcceptGrant.Response";
	context.succeed({ event: { header: header, payload: {} }});
});

exports.fulfillment = app.handle();

exports.handler = async (event, context, callback) => {
	if( event.path == '/alexahome-push' ){
		var body = JSON.parse(event.body);
		console.log(body);

		if( body.endpoint == 'input.wasPressed'){
			switch(body.result.type){
				case 1:{
					var report_header = {
						messageId: uuidv4(),
						namespace: "Alexa.DoorbellEventSource",
						name: "DoorbellPress",
						payloadVersion: "3"
					};

					var report_payload = {
						cause: {
							type: "PHYSICAL_INTERACTION"
						},
						timestamp: new Date().toISOString()
					};
					
					await sendReport(report_header, "bell_01", report_payload);
					break;
				}
			}
		}

		return new Response({ status: "OK" });
	}else
	if( event.path == '/alexahome-restart' ){
		await initialize();

		return new Response({ status: "OK" });
	}
};

async function sendReport(header, endpointId, payload){
	console.log("sendReport", report);
	var token = await jsonfile.read_json(TOKEN_FNAME);
	if( token.created_at + token.expires_in * 1000 <= new Date().getTime() ){
		var params = {
			grant_type: "refresh_token",
			refresh_token: token.refresh_token,
		};
		var new_token = await do_post_urlencoded_with_basic("https://api.amazon.com/auth/o2/token", params, ALEXA_CLIENT_ID, ALEXA_CLIENT_SECRET)
		token.access_token = new_token.access_token;
		if( new_token.refresh_token )
			token.refresh_token = new_token.refresh_token;
		token.created_at = new Date().getTime();
		await jsonfile.write_json(TOKEN_FNAME, token);
	}

	var report = {
		context: {
			properties: []
		},
		event: {
			header: header,
			endpoint: {
				scope: {
					type: "BearerToken",
					token: token.access_token
				},
				endpointId : endpointId
			},
			payload: payload
		}
	};

	return do_post_with_token("https://api.fe.amazonalexa.com/v3/events", report, token.access_token);
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

function do_post_with_token(url, body, token) {
  const headers = new Headers({ "Content-Type": "application/json", "Authorization": "Bearer " + token });

  return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
//      return response.json();
			return response.text();
    });
}

function do_post_urlencoded_with_basic(url, params, client_id, client_secret) {
	var basic = Buffer.from(client_id + ':' + client_secret).toString('base64');
  const headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded', Authorization: "Basic " + basic });
  var body = new URLSearchParams(params);

  return fetch(url, {
      method: 'POST',
      body: body,
      headers: headers
    })
    .then((response) => {
      if (!response.ok)
        throw 'status is not 200';
      return response.json();
    })
}
