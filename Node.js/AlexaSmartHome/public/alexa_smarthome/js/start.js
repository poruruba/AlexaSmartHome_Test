'use strict';

//const vConsole = new VConsole();
//window.datgui = new dat.GUI();

var vue_options = {
    el: "#top",
    mixins: [mixins_bootstrap],
    data: {
        host: "",
        prefix: "",
        arduino: new Arduino(null),
        wires: [],

        wire_sda: 32,
        wire_scl: 33,
        wire_address: 0,
        wire_index: 0,
        wire_write_value: "",
        wire_mode: "read",
        wire_read_len: 0,
        wire_read_value: "",
        wire_devices: [],

        gpio_pin: 10,
        gpio_pinMode: 1,
        gpio_value: 0,
        gpio_analog_value: 0,

        ledc_channel: 1,
        ledc_setup_freq: 50,
        ledc_setup_resolution: 16,
        ledc_pin: 26,
        ledc_duty: 1500,
        ledc_freq: 0,
        ledc_note: 0,
        ledc_octave: 0,

        pixels_pin: 26,
        pixels_index: 0,
        pixels_color: "#000000",

        ble_serviceuuid: "cba20d00-224d-11e6-9fb8-0002a5d5c51b",
        ble_duration: 7,
        ble_devices: [],

    },
    computed: {
    },
    methods: {
        esp32_host: function(){
            this.wires[0] = this.arduino.Wire;
            this.wires[1] = this.arduino.Wire1;
            this.arduino.setUrl(this.host);
            if( this.prefix )
            this.arduino.setPrefix(this.prefix);
            this.toast_show("Arduino", "設定しました。");
        },
        wire_begin: async function(){
            try{
                await this.wires[this.wire_index].begin(this.wire_sda, this.wire_scl);
                this.toast_show("Wire", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        wire_scanDevice: async function(){
            try{
                this.progress_open();
                this.wire_devices = [];
                for(var address = 1; address < 127; address++ ){
                    await this.wires[this.wire_index].beginTransmission(address);
                    var error = await this.wires[this.wire_index].endTransmission();
                    if( error == 0 )
                        this.wire_devices.push(address);
                }
                this.toast_show("Wire", "成功しました。");
            }catch(error){
                console.error(error);
            }finally{
                this.progress_close();
            }
        },
        wire_execute: async function(){
            switch(this.wire_mode){
                case 'read':{
                    await this.wire.beginTransmission(this.wire_address);
                    await this.wire.requestFrom(this.wire_address, this.wire_read_len);
                    var read_value = await this.wire.read(this.wire_read_len);
                    this.wire_read_data = read_value.map(item => String(item)).join(", ");
                    break;
                }
                case 'write':{
                    var write_value = this.wire_write_value.split(',').map(item => parseInt(item));
                    await this.wire.beginTransmission(this.wire_address);
                    await this.wire.write(write_value);
                    if( await this.wire.endTransmission() != 0 ){
                        this.toast_show("Wire", "失敗しました。", "warn");
                        return;
                    }
                        
                    break;
                }
                case 'write_read':{
                    var write_value = this.wire_write_value.split(',').map(item => parseInt(item));
                    await this.wire.beginTransmission(this.wire_address);
                    await this.wire.write(write_value);
                    if( await this.wire.endTransmission() != 0 ){
                        this.toast_show("Wire", "失敗しました。", "warn");
                        return;
                    }
                    await this.wire.requestFrom(this.wire_address, this.wire_read_len);
                    var read_value = await this.wire.read(this.wire_read_len);
                    this.wire_read_data = read_value.map(item => String(item)).join(", ");

                    break;
                }
            }
        },
        btn_pinMode: async function(){
            try{
                await this.arduino.Gpio.pinMode(this.gpio_pin, this.gpio_pinMode);
                this.toast_show("Gpio", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        btn_digitalWrite: async function(){
            try{
                await this.arduino.Gpio.digitalWrite(this.gpio_pin, this.gpio_value);
                this.toast_show("Gpio", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        btn_digitalRead: async function(){
            try{
                this.gpio_value = await this.arduino.Gpio.digitalRead(this.gpio_pin);
                this.toast_show("Gpio", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        btn_analogRead: async function(){
            try{
                this.gpio_analog_value = await this.arduino.Gpio.analogRead(this.gpio_pin);
                this.toast_show("Gpio", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        ledc_setup: async function(){
            try{
                await this.arduino.Ledc.setup(this.ledc_channel, this.ledc_setup_freq, this.ledc_setup_resolution);
                this.toast_show("Ledc", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        ledc_attachPin: async function(){
            try{
                await this.arduino.Ledc.attachPin(this.ledc_pin, this.ledc_channel);
                this.toast_show("Ledc", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        ledc_detachPin: async function(){
            try{
                await this.arduino.Ledc.detachPin(this.ledc_pin, this.ledc_channel);
                this.toast_show("Ledc", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        ledc_write: async function(){
            try{
                await this.arduino.Ledc.write(this.ledc_channel, this.ledc_duty);
                this.toast_show("Ledc", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        ledc_writeTone: async function(){
            try{
                await this.arduino.Ledc.writeTone(this.ledc_channel, this.ledc_freq);
                this.toast_show("Ledc", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        ledc_writeNote: async function(){
            try{
                await this.arduino.Ledc.writeNote(this.ledc_channel, this.ledc_note, this.ledc_octave);
                this.toast_show("Ledc", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        pixels_begin: async function(){
            try{
                await this.arduino.Pixels.begin(this.pixels_pin);
                this.toast_show("Pixels", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        pixels_setOnoff: async function(onoff){
            try{
                await this.arduino.Pixels.setOnoff(onoff);
                this.toast_show("Pixels", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        pixels_clear: async function(){
            try{
                await this.arduino.Pixels.clear();
                this.toast_show("Pixels", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        pixels_setPixelColor: async function(){
            try{
                await this.arduino.Pixels.setPixelColor(this.pixels_index, this.rgb2num(this.pixels_color));
                this.toast_show("Pixels", "成功しました。");
            }catch(error){
                console.error(error);
            }
        },
        rgb2num: function (rgb, sel) {
            if (sel == 'r')
              return parseInt(rgb.slice(1, 3), 16);
            else if (sel == 'g')
              return parseInt(rgb.slice(3, 5), 16);
            else if (sel == 'b')
              return parseInt(rgb.slice(5, 7), 16);
            else
              return parseInt(rgb.slice(1, 7), 16);
        },
        ble_scanDevice: async function(){
            try{
                this.progress_open();
                this.ble_devices = await this.arduino.Ble.scanDevice(this.ble_duration, this.ble_serviceuuid);
                this.toast_show("Ble", "成功しました。");
            }catch(error){
                console.error(error);
            }finally{
                this.progress_close();
            }
        },
        ble_tohex: function(addr_array){
            var addr = "";
            for( var i = 0 ; i < 6 ; i++ ){
                if( i != 0 )
                    addr += ":";
                addr += ("00" + addr_array[i]).slice(-2);
            }
            return addr;
        }
    },
    created: function(){
    },
    mounted: function(){
        proc_load();
    }
};
vue_add_data(vue_options, { progress_title: '' }); // for progress-dialog
vue_add_global_components(components_bootstrap);
vue_add_global_components(components_utils);

/* add additional components */
  
window.vue = new Vue( vue_options );
