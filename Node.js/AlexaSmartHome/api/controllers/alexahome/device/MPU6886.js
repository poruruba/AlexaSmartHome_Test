'use strict';

const AFS_2G = 0;
const AFS_4G = 1;
const AFS_8G = 2;
const AFS_16G = 3;

const GFS_250DPS = 0;
const GFS_500DPS = 1;
const GFS_1000DPS = 2;
const GFS_2000DPS = 3;

const IMU_6886_WHOAMI = 0x75;
const IMU_6886_ACCEL_INTEL_CTRL = 0x69;
const IMU_6886_SMPLRT_DIV = 0x19;
const IMU_6886_INT_PIN_CFG = 0x37;
const IMU_6886_INT_ENABLE = 0x38;
const IMU_6886_ACCEL_XOUT_H = 0x3B;
const IMU_6886_ACCEL_XOUT_L = 0x3C;
const IMU_6886_ACCEL_YOUT_H = 0x3D;
const IMU_6886_ACCEL_YOUT_L = 0x3E;
const IMU_6886_ACCEL_ZOUT_H = 0x3F;
const IMU_6886_ACCEL_ZOUT_L = 0x40;

const IMU_6886_TEMP_OUT_H = 0x41;
const IMU_6886_TEMP_OUT_L = 0x42;

const IMU_6886_GYRO_XOUT_H = 0x43;
const IMU_6886_GYRO_XOUT_L = 0x44;
const IMU_6886_GYRO_YOUT_H = 0x45;
const IMU_6886_GYRO_YOUT_L = 0x46;
const IMU_6886_GYRO_ZOUT_H = 0x47;
const IMU_6886_GYRO_ZOUT_L = 0x48;

const IMU_6886_USER_CTRL = 0x6A;
const IMU_6886_PWR_MGMT_1 = 0x6B;
const IMU_6886_PWR_MGMT_2 = 0x6C;
const IMU_6886_CONFIG = 0x1A;
const IMU_6886_GYRO_CONFIG = 0x1B;
const IMU_6886_ACCEL_CONFIG = 0x1C;
const IMU_6886_ACCEL_CONFIG2 = 0x1D;
const IMU_6886_FIFO_EN = 0x23;

const IMU_6886_FIFO_ENABLE = 0x23;
const IMU_6886_FIFO_COUNT = 0x72;
const IMU_6886_FIFO_R_W = 0x74;
const IMU_6886_GYRO_OFFSET = 0x13;
//const G (9.8)
const RtA = 57.324841;
const AtR = 0.0174533;
const Gyro_Gr = 0.0010653;

class MPU6886 {
  constructor(wire, address = 0x68) {
    this.wire = wire;
    this._address = address;
    this.Gyscale = GFS_250DPS;
    this.Acscale = AFS_2G;
    this.aRes = 0.0;
    this.gRes = 0.0;
  }

  async readByte(address) {
    await this.wire.beginTransmission(this._address);
    await this.wire.write(address);
    await this.wire.endTransmission();
    await this.wire.requestFrom(this._address, 1);
    return this.wire.read();
  }

  async readNByte(address, n) {
    await this.wire.beginTransmission(this._address);
    await this.wire.write(address);
    await this.wire.endTransmission();
    await this.wire.requestFrom(this._address, n);
    return this.wire.read(n);
  }

  async writeByte(address, data) {
    await this.wire.beginTransmission(this._address);
    await this.wire.write(address);
    await this.wire.write(data);
    await this.wire.endTransmission();
  }

  async Init() {
    var regdata;

    this.Gyscale = GFS_2000DPS;
    this.Acscale = AFS_8G;

    this.imuId = await this.readByte(IMU_6886_WHOAMI);
    console.log("imuId:" + this.imuId);
    await this.sleep(1);

    regdata = 0x00;
    await this.writeByte(IMU_6886_PWR_MGMT_1, regdata);
    await this.sleep(10);

    regdata = (0x01 << 7);
    await this.writeByte(IMU_6886_PWR_MGMT_1, regdata);
    await this.sleep(10);

    regdata = (0x01 << 0);
    await this.writeByte(IMU_6886_PWR_MGMT_1, regdata);
    await this.sleep(10);

    // +- 8g
    regdata = 0x10;
    await this.writeByte(IMU_6886_ACCEL_CONFIG, regdata);
    await this.sleep(1);

    // +- 2000 dps
    regdata = 0x18;
    await this.writeByte(IMU_6886_GYRO_CONFIG, regdata);
    await this.sleep(1);

    // 1khz output
    regdata = 0x01;
    await this.writeByte(IMU_6886_CONFIG, regdata);
    await this.sleep(1);

    // 2 div, FIFO 500hz out
    regdata = 0x01;
    await this.writeByte(IMU_6886_SMPLRT_DIV, regdata);
    await this.sleep(1);

    regdata = 0x00;
    await this.writeByte(IMU_6886_INT_ENABLE, regdata);
    await this.sleep(1);

    regdata = 0x00;
    await this.writeByte(IMU_6886_ACCEL_CONFIG2, regdata);
    await this.sleep(1);

    regdata = 0x00;
    await this.writeByte(IMU_6886_USER_CTRL, regdata);
    await this.sleep(1);

    regdata = 0x00;
    await this.writeByte(IMU_6886_FIFO_EN, regdata);
    await this.sleep(1);

    regdata = 0x22;
    await this.writeByte(IMU_6886_INT_PIN_CFG, regdata);
    await this.sleep(1);

    regdata = 0x01;
    await this.writeByte(IMU_6886_INT_ENABLE, regdata);

    await this.sleep(10);

    await this.setGyroFsr(this.Gyscale);
    await this.setAccelFsr(this.Acscale);

    return 0;
  }

  async getAccelAdc() {
    var buf = await this.readNByte(IMU_6886_ACCEL_XOUT_H, 6);

    var a = {};
    a.x = (buf[0] << 8) | buf[1];
    a.y = (buf[2] << 8) | buf[3];
    a.z = (buf[4] << 8) | buf[5];

  	a.x = this.comp2(a.x, 2);
	  a.y = this.comp2(a.y, 2);
	  a.z = this.comp2(a.z, 2);

    return a;
  }

  async getGyroAdc() {
    var buf = await this.readNByte(IMU_6886_GYRO_XOUT_H, 6);

    var g = {};
    g.x = (buf[0] << 8) | buf[1];
    g.y = (buf[2] << 8) | buf[3];
    g.z = (buf[4] << 8) | buf[5];

  	g.x = this.comp2(g.x, 2);
	  g.y = this.comp2(g.y, 2);
	  g.z = this.comp2(g.z, 2);

    return g;
  }

  async getTempAdc() {
    var buf = await this.readNByte(IMU_6886_TEMP_OUT_H, 2);

    return (buf[0] << 8) | buf[1];
  }

  // Possible gyro scales (and their register bit settings)
  updateGres() {
    switch (this.Gyscale) {
      case GFS_250DPS:
        this.gRes = 250.0 / 32768.0;
        break;
      case GFS_500DPS:
        this.gRes = 500.0 / 32768.0;
        break;
      case GFS_1000DPS:
        this.gRes = 1000.0 / 32768.0;
        break;
      case GFS_2000DPS:
        this.gRes = 2000.0 / 32768.0;
        break;
    }

  }

  // Possible accelerometer scales (and their register bit settings) are:
  // 2 Gs (00), 4 Gs (01), 8 Gs (10), and 16 Gs  (11). 
  // Here's a bit of an algorith to calculate DPS/(ADC tick) based on that 2-bit value:
  updateAres() {
    switch (this.Acscale) {
      case AFS_2G:
        this.aRes = 2.0 / 32768.0;
        break;
      case AFS_4G:
        this.aRes = 4.0 / 32768.0;
        break;
      case AFS_8G:
        this.aRes = 8.0 / 32768.0;
        break;
      case AFS_16G:
        this.aRes = 16.0 / 32768.0;
        break;
    }
  }

  async setGyroFsr(scale) {
    var regdata = (scale << 3);
    await this.writeByte(IMU_6886_GYRO_CONFIG, regdata);
    await this.sleep(10);
    this.Gyscale = scale;
    await this.updateGres();
  }

  async setAccelFsr(scale) {
    var regdata = (scale << 3);
    await this.writeByte(IMU_6886_ACCEL_CONFIG, regdata);
    await this.sleep(10);
    this.Acscale = scale;
    this.updateAres();
  }

  async getAccelData() {
    var acc = await this.getAccelAdc();

    var a = {};
    a.x = acc.x * this.aRes;
    a.y = acc.y * this.aRes;
    a.z = acc.z * this.aRes;

    return a;
  }

  async getGyroData() {
    var gyro = await this.getGyroAdc();

    var g = {};
    g.x = gyro.x * this.gRes;
    g.y = gyro.y * this.gRes;
    g.z = gyro.z * this.gRes;

    return g;
  }

  async getTempData() {
    var temp = await this.getTempAdc();

    return temp / 326.8 + 25.0;
  }

  async sleep(msec){
    return new Promise(resolve => setTimeout(resolve, msec));
  }
  
  comp2(val, num_of_bytes){
    var mask = 0x01;
    for( var i = 0 ; i < num_of_bytes * 8 - 2; i++ ){
      mask <<= 1;
      mask |= 0x01;
    }
    if( !(val & ~mask) ){
      return val & mask;
    }else{
      val = (val ^ mask) & mask;
      return -(val + 1);
    }
  }
}

module.exports = MPU6886;