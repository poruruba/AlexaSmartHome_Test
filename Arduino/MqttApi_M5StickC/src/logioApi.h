#ifndef _LOGIO_API_H_
#define _LOGIO_API_H_

//#define _LOGIO_ENABLE_

void logio_log(const char* message);
void logio_log2(const char* source, const char* message);
void logio_log3(const char* stream, const char* source, const char* message); 

#endif
