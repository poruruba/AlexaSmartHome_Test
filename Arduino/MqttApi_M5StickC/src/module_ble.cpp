#include <Arduino.h>
#include <BLEDevice.h>

#include "common_types.h"
#include "module_ble.h"
#include "logioApi.h"

static BLEScan* pBLEScan;
static bool scanDevice_start = false;
static long scanDevice_duration;
static char target_serviceuuid[36 + 1] = { 0 };
static BLEScanResults scanDevice_results;

long endp_ble_scanDevice_start(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_ble_scanDevice_start");

  if( scanDevice_start )
    return -1;

  scanDevice_duration = request["duration"];
  const char *target = request["serviceUuid"];
  if( target != NULL ){
    strcpy(target_serviceuuid, target);
  }else{
    target_serviceuuid[0] = '\0';
  }
  scanDevice_start = true;

  return 0;
}

long endp_ble_scanDevice_result(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_ble_scanDevice_result");
  if( scanDevice_start )
    return -1;

  int count = 0;
  JsonArray arry = response.createNestedArray("result");
  for( int index = 0 ; index < scanDevice_results.getCount() ; index++ ){
    BLEAdvertisedDevice advertisedDevice = scanDevice_results.getDevice(index);
    if( target_serviceuuid[0] != '\0' ){
      if (!advertisedDevice.haveServiceUUID())
        continue;
      BLEUUID target(target_serviceuuid);
      bool found = false;
      for( int i = 0 ; i < advertisedDevice.getServiceUUIDCount() ; i++ ){
        if( advertisedDevice.getServiceUUID(i).equals(target) ){
          found = true;
          break;
        }
      }
      if( !found )
        continue;
    }
    JsonObject obj = arry.createNestedObject();
    if (advertisedDevice.haveServiceUUID()){
      JsonArray a = obj.createNestedArray("serviceUuid");
      for( int i = 0 ; i < advertisedDevice.getServiceUUIDCount() ; i++ ){
        a[i] = (char*)advertisedDevice.getServiceUUID(i).toString().c_str();
      }
    }
    if( advertisedDevice.haveName() ){
      obj["name"] = (char*)advertisedDevice.getName().c_str();
    }
    esp_bd_addr_t *addr = advertisedDevice.getAddress().getNative();
    JsonArray a = obj.createNestedArray("address");
    for (int i = 0; i < 6; i++)
      a[i] = (uint8_t)(*addr)[i];
    if( advertisedDevice.haveManufacturerData() ){
      std::string manufacturerData = advertisedDevice.getManufacturerData();
      uint16_t len = manufacturerData.length();
      JsonArray a = obj.createNestedArray("manufacturerData");
      const uint8_t *ptr = (const uint8_t*)manufacturerData.c_str();
      for( int i = 0 ; i < len ; i++ )
        a[i] = ptr[i];
    }
    if( advertisedDevice.haveRSSI() ){
      obj["rssi"] = advertisedDevice.getRSSI();
    }
    if( advertisedDevice.haveServiceData()){
      JsonArray a1 = obj.createNestedArray("serviceDataUuid");
      for( int i = 0 ; i < advertisedDevice.getServiceDataUUIDCount() ; i++ ){
        a1[i] = (char*)advertisedDevice.getServiceDataUUID(i).toString().c_str();
      }
      JsonArray a2 = obj.createNestedArray("serviceData");
      for( int i = 0 ; i < advertisedDevice.getServiceDataCount() ; i++ ){
        std::string serviceData = advertisedDevice.getServiceData(i);
        uint16_t len = serviceData.length();
        JsonArray a3 = a2.createNestedArray();
        const uint8_t *ptr = (const uint8_t*)serviceData.c_str();
        for( int j = 0 ; j < len ; j++ )
          a3[j] = ptr[j];
      }
    }
    count++;
  }
  Serial.printf("results=%d\n", count);

  return 0;
}

void endp_ble_loop(void){
  if( scanDevice_start ){
    Serial.printf("pBLEScan->start(%ld)\n", scanDevice_duration);
    scanDevice_results = pBLEScan->start(scanDevice_duration, false);
    scanDevice_start = false;
    Serial.printf("count=%d\n", scanDevice_results.getCount());
  }
}

long endp_ble_initialize(void)
{
  BLEDevice::init("");

  pBLEScan = BLEDevice::getScan();
  pBLEScan->setInterval(1349);
  pBLEScan->setWindow(449);
  pBLEScan->setActiveScan(true);

  return 0;
}

EndpointEntry ble_table[] = {
  EndpointEntry{ endp_ble_scanDevice_start, "/ble-scanDevice_start", -1 },
  EndpointEntry{ endp_ble_scanDevice_result, "/ble-scanDevice_result", -1 },
};

const int num_of_ble_entry = sizeof(ble_table) / sizeof(EndpointEntry);
