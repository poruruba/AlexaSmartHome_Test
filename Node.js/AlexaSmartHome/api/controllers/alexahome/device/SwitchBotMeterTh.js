'use strict';

class SwitchBotMenterTh{
  constructor(ble){
   this.ble = ble;
  }

  async getValue(duration){
		var list = await this.ble.scanDevice(duration, "cba20d00-224d-11e6-9fb8-0002a5d5c51b");
		console.log(list);
		var switchbot = list.filter( item => {
			var datauuid = item.serviceDataUuid.filter( item3 => item3 == "00000d00-0000-1000-8000-00805f9b34fb");
			if( datauuid.length > 0 ){
				var data = item.serviceData.filter( item4 => item4.length == 6 && (item4[0] & 0x7f) == 0x54 );
				if( data.length > 0 )
					return true;
				else
					return false;
			}
			return false;
		});
		console.log(switchbot);
    if( switchbot.length == 0 )
      return null;

    var serviceData = switchbot[0].serviceData[0];

    return {
      humidity: serviceData[5] & 0x7f,
      temperature: serviceData[4] & 0x7f + (serviceData[3] & 0x0f) / 10,
      battery: serviceData[2] & 0x7f
    };
  }
}

module.exports = SwitchBotMenterTh;