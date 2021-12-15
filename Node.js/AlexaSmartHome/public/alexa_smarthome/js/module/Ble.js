'use strict';

class Ble{
  constructor(arduino){
   this.arduino = arduino;
   this.module_type = "/ble-";
  }

  async sleep(msec){
    return new Promise(resolve => setTimeout(resolve, msec));
  }

  async scanDevice(duration, serviceUuid){
    var params = {
      duration: duration
    };
    if( serviceUuid ){
      if( serviceUuid.length == 4 ){
        params.serviceUuid = "0000" + serviceUuid.toLowerCase() + "-0000-1000-8000-00805f9b34fb";
      }else{
        params.serviceUuid = serviceUuid.toLowerCase();
      }
    }
    await this.arduino.webapi_request(this.module_type + "scanDevice_start", params);
    await this.sleep((duration + 1) * 1000);
    return await this.arduino.webapi_request(this.module_type + "scanDevice_result", {});
  }
}

//module.exports = Ble;
