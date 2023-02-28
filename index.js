/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const test = require('./lib/smart-contracts/resource-manager-test.js');
const flightManager = require('./lib/smart-contracts/flight-booking-manager.js');
const rm = require('./lib/resource-manager/resource-manager.js');
module.exports.test = test;
module.exports.flightManager = flightManager;
module.exports.rm = rm;
module.exports.contracts = [ flightManager, rm, test ];
