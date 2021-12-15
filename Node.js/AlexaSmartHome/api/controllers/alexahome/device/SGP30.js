'use strict';

class SGP30{
  constructor(wire, addr = 0x58){
    this.address = addr;
    this.wire = wire;
    this.SGP30_CRC8_INIT = 0xFF;
    this.SGP30_CRC8_POLYNOMIAL = 0x31;
    this.SGP30_WORD_LEN = 2;
  }

  async begin(initSensor){
    this.serialNumber = await this.readWordFromCommand([0x36, 0x82], 10, 3);

    var reply = await this.readWordFromCommand([0x20, 0x2f], 10, 1);
    this.featureset = reply[0];

    if( initSensor )
      this.IAQinit();

    return { serialNumber: this.serialNumber, featureset: this.featureset };
  }

  async softReset(){
    await this.readWordFromCommand([0x00, 0x06], 10);
  }

  async IAQinit(){
    await this.readWordFromCommand([0x20, 0x03], 12);
  }

  async IAQmeasure(){
    var reply = await this.readWordFromCommand([0x20, 0x08], 12, 2);
    this.TVOC = reply[1];
    this.eCO2 = reply[0];
  }

  async IAQmeasureRaw(){
    var reply = await this.readWordFromCommand([0x20, 0x50], 25, 2);
    this.rawEthanol = reply[1];
    this.rawH2 = reply[0];
  }

  async getIAQBaseline(){
    var reply = await this.readWordFromCommand([0x20, 0x15], 10, 2);
    return {
      eco2_base: reply[0],
      tvoc_base: reply[1]
    };
  }

  async setIAQBaseline(eco2_base, tvoc_base){
    var command = [0x20, 0x1e];
    command.push((tvoc_base >> 8) & 0xFF);
    command.push(tvoc_base & 0xFF);
    command.push(generateCRC(command, 2, 2));
    command.push((eco2_base >> 8) & 0xFf);
    command.push(eco2_base & 0xFF);
    command.push(generateCRC(command, 5, 2));
    await this.readWordFromCommand(command, 10);
  }

  async setHumidity(absolute_humidity){
    if (absolute_humidity > 256000)
      throw 'invalid param';
  
    var ah_scaled = ((absolute_humidity * 256 * 16777) >> 24) & 0xFFFF;
    var command = [0x20, 0x61];
    command.push((ah_scaled >> 8) & 0xFF);
    command.push(ah_scaled & 0xFF);
    command.push(generateCRC(command, 2, 2));
  
    await this.readWordFromCommand(command, 10);
  }
  
  async readWordFromCommand(command, delayms, readlen){
    await this.wire.beginTransmission(this.address);
    var ret;
    ret = await this.wire.write(command);
    if( ret != command.length )
      throw 'failed';
    ret = await this.wire.endTransmission();
    if( ret != 0 )
      throw 'failed';
    
    await this.sleep(delayms);

    if( readlen == 0)
      return;

    var replylen = readlen * (this.SGP30_WORD_LEN + 1);
    ret = await this.wire.requestFrom(this.address, replylen);
    if( ret != replylen )
      throw 'failed';

    var replybuffer = await this.wire.read(replylen);
    var response = [];
    for (var i = 0; i < readlen; i++) {
      var crc = this.generateCRC(replybuffer, i * 3, 2);
      if (crc != replybuffer[i * 3 + 2])
        throw 'crc error';
      
      response.push( replybuffer[i * 3] << 8 | replybuffer[i * 3 + 1] );
    }

    return response;
  }

  generateCRC(data, offset, len) {
    // calculates 8-Bit checksum with given polynomial
    var crc = this.SGP30_CRC8_INIT;

    for (var i = 0; i < len; i++) {
      crc ^= data[offset + i];
      for (var b = 0; b < 8; b++) {
        if (crc & 0x80)
          crc = (crc << 1) ^ this.SGP30_CRC8_POLYNOMIAL;
        else
          crc <<= 1;
        crc &= 0xff;
      }
    }

    return crc;
  }

  async sleep(msec){
    return new Promise(resolve => setTimeout(resolve, msec));
  }
}

module.exports = SGP30;