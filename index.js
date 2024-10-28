/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const rmsc = require('./lib/resourceManager');
const fbm = require('./lib/flight-booking-manager');
const bfbm = require('./lib/basic-flight-booking-manager/basic-flight-booking-manager');

module.exports.ResourceManager = rmsc;
module.exports.FlightBookingManager = fbm;
module.exports.BasicFlightBookingManager = bfbm;

module.exports.contracts = [rmsc,fbm,bfbm];
