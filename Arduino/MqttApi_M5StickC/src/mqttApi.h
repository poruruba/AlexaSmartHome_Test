#ifndef _MQTTAPI_H_
#define _MQTTAPI_H_

#include "common_types.h"

#define MQTT_BUFFER_SIZE  10240
#define MQTT_JSON_DOCUMENT_SIZE  10240

void mqttapi_initialize(void);
void mqttapi_update(void);
void mqttapi_appendEntry(EndpointEntry *tables, int num_of_entry);
JsonObject mqttapi_makeResponse(const char *endpoint, uint32_t msgId);
long mqttapi_responsePublish(const char *topic);

#endif
