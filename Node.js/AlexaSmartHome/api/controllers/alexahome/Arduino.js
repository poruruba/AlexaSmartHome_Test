'use strict';

const Wire = require('./module/Wire');
const Gpio = require('./module/Gpio');
const Ledc = require('./module/Ledc');
const Pixels = require('./module/Pixels');
const Ble = require('./module/Ble');

const fetch = require('node-fetch');
const Headers = fetch.Headers;

class Arduino{
  constructor(url, prefix){
    this.prefix = prefix;
    this.base_url = url;
    this.module_type = '/';

    this.Wire = new Wire(this);
    this.Wire1 = new Wire(this, "Wire1");
    this.Gpio = new Gpio(this);
    this.Ledc = new Ledc(this);
    this.Pixels = new Pixels(this);
    this.Ble = new Ble(this);
  }

  setUrl(url){
    this.base_url = url;
  }

  setPrefix(prefix){
    this.perfix = prefix;
  }

  async getIpAddress(){
    return this.webapi_request(this.module_type + "getIpAddress", {});
  }

  async getMacAddress(){
    return this.webapi_request(this.module_type + "getMacAddress", {});
  }

  async millis(){
    return this.webapi_request(this.module_type + "millis", {});
  }

  async webapi_request(endpoint, body) {
    const headers = new Headers({ "Content-Type": "application/json" });
    var url = this.base_url + endpoint;
    if( this.prefix )
      url += '?topic=' + encodeURI(this.prefix);

    var json = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: headers
      })
      .then((response) => {
        if (!response.ok)
          throw 'status is not 200';
        return response.json();
      });
    
    if( json.status != "OK")
      throw "status is not OK";
    
    return json.result;
  }
}

module.exports = Arduino;