#include <M5StickC.h>
#include <WiFi.h>
#include <ArduinoJson.h>

#include "common_types.h"
#include "module_gpio.h"
#include "module_wire.h"
#include "module_ledc.h"
#include "module_pixels.h"
#include "module_ble.h"

#include "mqttApi.h"
#include "logioApi.h"

const char *wifi_ssid = "【WiFiアクセスポイントのSSID】"; // WiFiアクセスポイントのSSID
const char *wifi_password = "【WiFiアクセスポイントのパスワード】"; // WiFiアクセスポイントのパスワード

const char *MQTT_PUBLISH_PUSH_TOPIC = "esp32_webapi_push"; // MQTTトピック名
const char *MQTT_PUBLISH_PUSH_URL = "https://【中継サーバのホスト名】/alexahome-push"; //中継サーバのURL(Push用)

uint32_t push_msgId = 0;

void wifi_connect(const char *ssid, const char *password);

long endp_millis(JsonObject request, JsonObject response, int magic)
{
  response["result"] = millis();
  return 0;
}

long endp_getIpAddress(JsonObject request, JsonObject response, int magic)
{
  IPAddress address = WiFi.localIP();
  response["result"] = (uint32_t)(((uint32_t)address[0]) << 24 | address[1] << 16 | address[2] << 8 | address[3]);

  return 0;
}

long endp_getMacAddress(JsonObject request, JsonObject response, int magic)
{
  uint8_t address[6];
  WiFi.macAddress(address);
  for( int i = 0 ; i < 6 ; i++ )
    response["result"][i] = address[i];

  return 0;
}

EndpointEntry default_table[] = {
  EndpointEntry{ endp_millis, "/millis", 0 },
  EndpointEntry{ endp_getIpAddress, "/getIpAddress", 0 },
  EndpointEntry{ endp_getMacAddress, "/getMacAddress", 0 },
};
const int num_of_default_entry = sizeof(default_table) / sizeof(EndpointEntry);

void setup() {
  // put your setup code here, to run once:
  M5.begin(true, true, true);
  Serial.begin(115200);
  Serial.println("setup stat");

  wifi_connect(wifi_ssid, wifi_password);
  endp_ble_initialize();

  mqttapi_initialize();
  mqttapi_appendEntry(default_table, num_of_default_entry);
  mqttapi_appendEntry(gpio_table, num_of_gpio_entry);
  mqttapi_appendEntry(wire_table, num_of_wire_entry);
  mqttapi_appendEntry(ble_table, num_of_ble_entry);
  mqttapi_appendEntry(ledc_table, num_of_ledc_entry);
  mqttapi_appendEntry(pixels_table, num_of_pixels_entry);

  Serial.println("setup finisned");
}

void loop() {
  // put your main code here, to run repeatedly:
  mqttapi_update();

  M5.update();

  if( M5.BtnA.wasPressed()){
    JsonObject obj = mqttapi_makeResponse("input.wasPressed", ++push_msgId);
    obj["url"] = MQTT_PUBLISH_PUSH_URL;
    obj["result"]["type"] = 1;
    mqttapi_responsePublish(MQTT_PUBLISH_PUSH_TOPIC);

    delay(10);
  }

  endp_ble_loop();

  delay(1);
}

void wifi_connect(const char *ssid, const char *password){
  Serial.println("");
  Serial.print("WiFi Connenting");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    delay(1000);
  }

  Serial.println("");
  Serial.print("Connected : ");
  Serial.println(WiFi.localIP());

  uint8_t address[6];
  WiFi.macAddress(address);
  Serial.printf("%02x:%02x:%02x:%02x:%02x:%02x\n", address[0], address[1], address[2], address[3], address[4], address[5]);

  logio_log(WiFi.localIP().toString().c_str());
}
