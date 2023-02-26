/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const test = require('./lib/smart-contracts/resource-manager-test.js');
const flightManager = require('./lib/smart-contracts/flight-booking-manager.js');

module.exports.test = test;
module.exports.flightManager = flightManager;
module.exports.contracts = [ flightManager, test ];
