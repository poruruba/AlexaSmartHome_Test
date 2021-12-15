#include <Arduino.h>
#include <WiFi.h>

#include "logioApi.h"

#ifdef _LOGIO_ENABLE_
const char *LOGIO_HOST = "【log.ioのホスト名】; // log.ioのホスト名
const uint16_t LOGIO_PORT = 6689; // log.ioのポート番号

static WiFiClient logio_wifiClient;
#endif

static char default_stream_name[2 * 6 + 1] = "";
static const char *default_source_name = "webapi";

void logio_log(const char* message) {
  logio_log3(default_stream_name, default_source_name, message);
}

void logio_log2(const char* source, const char* message) {
  logio_log3(default_stream_name, source, message);
}

void logio_log3(const char* stream, const char* source, const char* message) {
  Serial.println(message);

#ifdef _LOGIO_ENABLE_
  if( !logio_wifiClient.connected() ){
    if( default_stream_name[0] == '\0'){
      uint8_t address[6];
      WiFi.macAddress(address);
      sprintf(default_stream_name, "%02x%02x%02x%02x%02x%02x", address[0], address[1], address[2], address[3], address[4], address[5]);
    }
    if( !logio_wifiClient.connect(LOGIO_HOST, LOGIO_PORT) ){
      Serial.println("connection failed");
      return;
    }
  }
  if( logio_wifiClient.connected() ){
    String packet = "+msg|";
    packet += stream;
    packet += "|";
    packet += source;
    packet +="|";
    packet += message;
    logio_wifiClient.write(packet.c_str(), strlen(packet.c_str()) + 1);
    logio_wifiClient.flush();
  }
#endif
}