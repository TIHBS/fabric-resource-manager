/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const rmsc = require('./lib/resourceManager');
const fbm = require('./lib/flight-booking-manager');

module.exports.ResourceManager = rmsc;
module.exports = fbm;
module.exports.contracts = [rmsc,fbm];
