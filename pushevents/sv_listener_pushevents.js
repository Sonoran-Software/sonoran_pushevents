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
        emit("SonoranCAD::core:writeLog", "debug", "PushEvents is ready.");
    }
});



http.createServer(function (req, res) {
res.writeHead(200, {'Content-Type': 'text/plain'});
let response = '';

if (req.method == 'POST') {
    req.on('data', function(chunk) {
    try {
        const body = JSON.parse(chunk.toString());
        // Ensure KEY exists and is valid
        if (body.key && body.key.toUpperCase() === config.apiKey.toUpperCase()) {
        // Ensure TYPE exists
        if (body.type) {
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
            default:
                response = `Invalid API request type: ${body.type}`;
                emit("SonoranCAD::core:writeLog", "debug", `Got an unknown type ${body.type}`);
            }
        } else
        {
            // TYPE field does not exist
            response = 'TYPE field not provided!';
        }
        } else {
        response = 'Invalid API Key!';
        }
    } catch (e) {
        response = `Invalid JSON syntax: ${e}`;
    }
    });
} else {
    response = 'Invalid request type, not a POST!';
}

setTimeout(function(){
    res.write(response);
    res.end();
}, 0);
}).listen(listenPort);