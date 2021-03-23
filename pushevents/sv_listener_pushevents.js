/*
  SonoranCAD FiveM - A SonoranCAD integration for FiveM servers
   Copyright (C) 2020  Sonoran Software

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program in the file "LICENSE".  If not, see <http://www.gnu.org/licenses/>.
*/

let config = null;
const listenPort = GetConvarInt('SonoranListenPort', 3232);
var http = require('http');

on('onServerResourceStart', (resource) => {
    if (GetCurrentResourceName() != resource) {
        return
    }
    emit("SonoranCAD::core::getConfig");
})



on("SonoranCAD::core:configData", function(data) {
    if (data != null) {
        config = JSON.parse(data);
    }
    emit("SonoranCAD::core:writeLog", "info", "Push events now listening on port: " + listenPort.toString());
});



http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    let response = '';
    if (config == null) {
        emit("SonoranCAD::core:writeLog", "debug", "[pushevents] Got an event, but we're not ready yet. Dropping request.");
        response = "Starting up...";
    }
    else if (req.method == 'POST') {
        req.on('data', function(chunk) {
        try {
            const body = JSON.parse(chunk.toString());
            // Ensure KEY exists and is valid
            if (body.key && body.key.toUpperCase() === config.apiKey.toUpperCase()) {
            // Ensure TYPE exists
            if (body.type) {
                emit("SonoranCAD::core:writeLog", "debug", "Pushevent " + body.type + " incoming: " + JSON.stringify(body.data));
                // Check data fields per request type
                switch (body.type.toUpperCase()) {
                case 'EVENT_UNIT_STATUS':
                    // Check for missing request fields
                    if (!body.data.units) {
                        response = 'Missing field: data.units';
                    } 
                    else {
                        // All required fields are present
                        for (unit of body.data.units) {
                            unit["type"] = "EVENT_UNIT_STATUS";
                            emit('SonoranCAD::pushevents:UnitUpdate', unit);
                        }                
                        response = 'Success!';
                    }
                    break;
                case 'EVENT_UNIT_LOGIN':
                    if (!body.data.units) {
                        response = 'Missing field: data.units';
                    } 
                    else {
                        // All required fields are present
                        for (unit of body.data.units) {
                            unit["type"] = "EVENT_UNIT_LOGIN";
                            emit('SonoranCAD::pushevents:UnitListUpdate', unit);
                        }
                        response = 'Success!';
                    }
                    break;
                case 'EVENT_UNIT_LOGOUT':
                    if (!body.data.units) {
                        response = 'Missing field: data.units';
                    } 
                    else {
                        // All required fields are present
                        for (unit of body.data.units) {
                            unit["type"] = "EVENT_UNIT_LOGOUT";
                            emit('SonoranCAD::pushevents:UnitListUpdate', unit);
                        }
                        response = 'Success!';
                    }
                    break;
                case 'EVENT_DISPATCH':
                    if (!body.data.dispatch) {
                        response = 'Missing field: data.dispatch';
                    }
                    else {
                        emit("SonoranCAD::pushevents:DispatchEvent", body.data);
                        response = 'Success!';
                    }
                    break;
                case 'EVENT_UNIT_CALL_CLEAR':
                    if (!body.data.units) {
                        response = 'Missing field: data.units';
                    } 
                    else {
                        for (unit of body.data.units) {
                            unit["type"] = "EVENT_UNIT_CALL_CLEAR";
                            emit('SonoranCAD::pushevents:DispatchClear', unit);
                        }
                        response = 'Success!';
                    }
                    break;
                case 'GET_LOGS':
                    if (body.logKey != undefined) {
                        emit('SonoranCAD::pushevents:SendSupportLogs', body.logKey);
                    }
                    response = 'Success!';
                    break;
                case 'EVENT_911':
                    if (body.data.call.callId != undefined) {
                        emit('SonoranCAD::pushevents:IncomingCadCall', body.data.call, body.data.apiIds);
                    }
                    response = 'Success!';
                    break;
                case 'EVENT_REMOVE_911':
                    if (body.data.callId != undefined) {
                        emit('SonoranCAD::pushevents:CadCallRemoved', body.data.callId);
                    }
                    break;
                default:
                    response = `Invalid API request type: ${body.type}`;
                    emit("SonoranCAD::core:writeLog", "debug", `Got an unknown type ${body.type}`);
                }
            } else
            {
                // TYPE field does not exist
                response = 'TYPE field not provided!';
                emit("SonoranCAD::core:writeLog", "error", response);
            }
            } else {
            response = 'Invalid API Key!';
            emit("SonoranCAD::core:writeLog", "error", response);
            }
        } catch (e) {
            response = `[pushevents] Invalid JSON syntax: ${e}. Enable debug mode to investigate.`;
            emit("SonoranCAD::core:writeLog", "debug", chunk);
            emit("SonoranCAD::core:writeLog", "error", response);
        }
        });
    } else {
        response = 'Push events is configured correctly.';
    }

    setTimeout(function(){
        res.write(response);
        res.end();
    }, 0);
}).listen(listenPort);