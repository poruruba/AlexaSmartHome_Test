#include <Arduino.h>
#include <WiFi.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <unordered_map> 

#include "common_types.h"
#include "mqttApi.h"

const char *MQTT_CLIENT_NAME = "esp32_webapi"; // MQTTクライアント名
const char *MQTT_BROKER_URL = "【MQTTブローカのドメイン名】"; // MQTTブローカのドメイン名
const uint16_t MQTT_BROKER_PORT = 1883; // MQTTブローカのポート番号(TCP接続)

static WiFiClient wifiClient;
static PubSubClient mqttClient(wifiClient);
static StaticJsonDocument<MQTT_JSON_DOCUMENT_SIZE> mqttRequest;
static StaticJsonDocument<MQTT_JSON_DOCUMENT_SIZE> mqttResponse;
static char mqttBuffer[MQTT_BUFFER_SIZE];

static std::unordered_map<std::string, EndpointEntry*> endpoint_list;

void mqttapi_appendEntry(EndpointEntry *tables, int num_of_entry)
{
  for(int i = 0 ; i < num_of_entry ; i++ )
    endpoint_list[tables[i].name] = &tables[i];
}

static void mqttCallback(char* topic, byte* payload, unsigned int length)
{
  Serial.println("mqttCallback received");

  DeserializationError err = deserializeJson(mqttRequest, payload, length);
  if( err ){
    Serial.printf("deserializeJson error: %s\n", err.c_str());
    return;
  }

  const char *endpoint = mqttRequest["endpoint"];
  const char *responseTopic = mqttRequest["topic"];
  bool oneway = mqttRequest["oneway"];
  uint32_t msgId = mqttRequest["msgId"];
  std::unordered_map<std::string, EndpointEntry*>::iterator itr = endpoint_list.find(endpoint);
  if( itr != endpoint_list.end() ){
    EndpointEntry *entry = itr->second;
    JsonObject responseResult = mqttapi_makeResponse(endpoint, msgId);
    long ret = entry->impl(mqttRequest["params"], responseResult, entry->magic);
    if( ret != 0 ){
      responseResult = mqttapi_makeResponse(endpoint, msgId);
      responseResult["status"] = "NG";
      responseResult["message"] = "unknown";
    }
    if( !oneway )
      mqttapi_responsePublish(responseTopic);
    return;
  }

  Serial.println("endpoint not found");
}

void mqttapi_initialize(void)
{
  // バッファサイズの変更
  mqttClient.setBufferSize(MQTT_BUFFER_SIZE);
  // MQTTコールバック関数の設定
  mqttClient.setCallback(mqttCallback);
  // MQTTブローカに接続
  mqttClient.setServer(MQTT_BROKER_URL, MQTT_BROKER_PORT);
}

void mqttapi_update(void)
{
  // put your main code here, to run repeatedly:
  mqttClient.loop();
  // MQTT未接続の場合、再接続
  while (!mqttClient.connected()){
    Serial.println("Mqtt Reconnecting");
    if (mqttClient.connect(MQTT_CLIENT_NAME)){
      String topic = WiFi.localIP().toString().c_str();
      topic = "mqttapi/" + topic;
      mqttClient.subscribe(topic.c_str());
      Serial.printf("Mqtt Reconnected(%s)\n", topic.c_str());
      break;
    }

    delay(1000);
  }
}

JsonObject mqttapi_makeResponse(const char *endpoint, uint32_t msgId)
{
  JsonObject jsonObject = mqttResponse.to<JsonObject>();
  jsonObject["client"]["name"] = MQTT_CLIENT_NAME;
  jsonObject["client"]["ipaddress"] = (char*)WiFi.localIP().toString().c_str();
  jsonObject["status"] = "OK";
  jsonObject["msgId"] = msgId;
  jsonObject["endpoint"] = (char*)endpoint;

  return jsonObject;
}

long mqttapi_responsePublish(const char *topic)
{
  long length = serializeJson(mqttResponse, mqttBuffer, sizeof(mqttBuffer));
  if( length <= 0 ){
    Serial.println("MQTT buffer size over");
    return -1;
  }
  bool ret = mqttClient.publish(topic, mqttBuffer);
  if( !ret ){
    Serial.println("MQTT publish failed");
    return -2;
  }

  return 0;
}
