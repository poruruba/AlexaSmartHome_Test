#ifndef _MODULE_BLE_H_
#define _MODULE_BLE_H_

#include "common_types.h"

long endp_ble_initialize(void);
void endp_ble_loop(void);

extern EndpointEntry ble_table[];
extern const int num_of_ble_entry;

#endif