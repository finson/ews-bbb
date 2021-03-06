/*
 * LSM303Accelerometer.h
 *
 *  Created on: Mar 16, 2014
 *      Author: finson
 */

#ifndef LSM303ACCELEROMETER_H_
#define LSM303ACCELEROMETER_H_

#define LSM303_I2C_BUFFER_SIZE 0x80
#define MAX_BUS_NAME_SIZE 64


enum LSM303_RANGE {
	PLUSMINUS_1_G 		= 0,
	PLUSMINUS_1POINT5_G = 1,
	PLUSMINUS_2G 		= 2,
	PLUSMINUS_3G 		= 3,
	PLUSMINUS_4G 		= 4,
	PLUSMINUS_8G 		= 5,
	PLUSMINUS_16G 		= 6
};

enum LSM303_BANDWIDTH {
	BW_10HZ 	= 0,
	BW_20HZ 	= 1,
	BW_40HZ 	= 2,
	BW_75HZ 	= 3,
	BW_150HZ 	= 4,
	BW_300HZ 	= 5,
	BW_600HZ 	= 6,
	BW_12OOHZ 	= 7,
	BW_HIGHPASS = 8,
	BW_BANDPASS = 9
};

enum LSM303_MODECONFIG {
	MODE_LOW_NOISE = 0,
	MODE_LOW_POWER = 3
};

class LSM303Accelerometer {

private:
	int bus;
	char busName[MAX_BUS_NAME_SIZE];
	int handle;

	int deviceAddress;
	char *deviceName;

	int I2CAddress;
	char dataBuffer[LSM303_I2C_BUFFER_SIZE];

	int accelerationX;
	int accelerationY;
	int accelerationZ;

	double pitch;  //in degrees
	double roll;   //in degrees

	float temperature; //accurate to 0.5C
	LSM303_RANGE range;
	LSM303_BANDWIDTH bandwidth;
	LSM303_MODECONFIG modeConfig;

	int  convertAcceleration(int msb_addr, int lsb_addr);
	int  writeI2CDeviceByte(char address, char value);
	//char readI2CDeviceByte(char address);
	void calculatePitchAndRoll();
	int openDevice(void);
	int closeDevice(void);

public:
	LSM303Accelerometer(int bus, int address, char *name);
	void displayMode(int iterations);

	int  readFullSensorState();
	// The following do physical reads and writes of the sensors
	int setRange(LSM303_RANGE range);
	LSM303_RANGE getRange();
	int setBandwidth(LSM303_BANDWIDTH bandwidth);
	LSM303_BANDWIDTH getBandwidth();
	int setModeConfig(LSM303_MODECONFIG mode);
	LSM303_MODECONFIG getModeConfig();
	float getTemperature();

	int getAccelerationX() { return accelerationX; }
	int getAccelerationY() { return accelerationY; }
	int getAccelerationZ() { return accelerationZ; }

	float getPitch() { return pitch; }  // in degrees
	float getRoll() { return roll; }  // in degrees

	virtual ~LSM303Accelerometer();

	int getBus() const
	{
		return bus;
	}

	const char* getBusName() const
	{
		return busName;
	}

	int getDeviceAddress() const
	{
		return deviceAddress;
	}

	char* getDeviceName() const
	{
		return deviceName;
	}

	int getHandle() const
	{
		return handle;
	}
};


#endif /* LSM303ACCELEROMETER_H_ */
