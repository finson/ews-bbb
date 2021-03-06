/*
 * Accelerometer.cpp
 *
 * Define the methods implemented by any class that wants to
 * provide 3-axis acceleration data.
 * (This is a Java programmer imitating a Java interface.  May change!)
 *
 *  Created on: Mar 20, 2014
 *      Author: finson
 */

#include "Accelerometer.h"

Accelerometer::Accelerometer(double ax, double ay, double az) {
	accX = ax;
	accY = ay;
	accZ = az;
}

Accelerometer::Accelerometer() {
	accX =  0;
	accY = 0;
	accZ = 0;
}

Accelerometer::~Accelerometer() {
}


double Accelerometer::getAccelerationX() {
	return accX;
}

double Accelerometer::getAccelerationY() {
	return accY;
}

double Accelerometer::getAccelerationZ() {
	return accZ;
}
