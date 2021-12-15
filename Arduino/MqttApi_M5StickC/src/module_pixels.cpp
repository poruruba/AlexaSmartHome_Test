#include <Arduino.h>
#include <Adafruit_NeoPixel.h>

#include "common_types.h"
#include "module_pixels.h"
#include "logioApi.h"

#define PIN        26
#define NUMPIXELS  3

static Adafruit_NeoPixel *pixels = NULL;
static uint32_t last_colors[NUMPIXELS] = { 0xffffff };
static bool onoff = true;

long endp_pixels_begin(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_pixels_begin");

  uint16_t pin = request["pin"];

  if( pixels == NULL )
    pixels = new Adafruit_NeoPixel(NUMPIXELS, pin, NEO_GRB + NEO_KHZ800);
  else
    pixels->setPin(pin);

  pixels->begin();

  return 0;
}

long endp_pixels_clear(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_pixels_clear");

  if( pixels == NULL ){
    logio_log("pixels not setup");
    return -1;
  }
  
  pixels->clear();
  pixels->show();

  return 0;
}

long endp_pixels_setOnoff(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_pixels_setOnoff");

  if( pixels == NULL ){
    logio_log("pixels not setup");
    return -1;
  }

  onoff = request["onoff"];
  
  if( onoff ){
    for( int i = 0 ; i < NUMPIXELS ; i++ )
      pixels->setPixelColor(i, last_colors[i]);
  }else{
    for( int i = 0 ; i < NUMPIXELS ; i++ )
      last_colors[i] = pixels->getPixelColor(i);
    pixels->clear();
  }
  pixels->show();

  return 0;
}

long endp_pixels_getOnoff(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_pixels_getOnoff");

  response["result"] = onoff;

  return 0;
}

long endp_pixels_setPixelColor(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_pixels_setPixelColor");

  if( pixels == NULL ){
    logio_log("pixels not setup");
    return -1;
  }

  uint16_t index = request["index"];
  uint32_t color = request["color"];

  onoff = true;
  pixels->setPixelColor(index, color);
  pixels->show();

  return 0;
}

long endp_pixels_getPixelColor(JsonObject request, JsonObject response, int magic)
{
  logio_log("endp_pixels_getPixelColor");

  if( pixels == NULL ){
    logio_log("pixels not setup");
    return -1;
  }

  uint16_t index = request["index"];

  uint32_t ret = pixels->getPixelColor(index);
  response["result"] = ret;

  return 0;
}

EndpointEntry pixels_table[] = {
  EndpointEntry{ endp_pixels_begin, "/pixels-begin", -1 },
  EndpointEntry{ endp_pixels_clear, "/pixels-clear", -1 },
  EndpointEntry{ endp_pixels_setOnoff, "/pixels-setOnoff", -1 },
  EndpointEntry{ endp_pixels_getOnoff, "/pixels-getOnoff", -1 },
  EndpointEntry{ endp_pixels_setPixelColor, "/pixels-setPixelColor", -1 },
  EndpointEntry{ endp_pixels_getPixelColor, "/pixels-getPixelColor", -1 },
};

const int num_of_pixels_entry = sizeof(pixels_table) / sizeof(EndpointEntry);
