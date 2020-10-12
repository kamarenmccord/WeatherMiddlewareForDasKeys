
const { response } = require('express');
const q = require('daskeyboard-applet');
const fetch = require('node-fetch');
const request = require('request');
const apiKeys = require('dotenv').config();
const dasKeysUrl = 'http://localhost:27301';


// set up local varables

try {
    const city = this.config.city;
    const units = this.config.units;

} catch {
    const city = 'New York City';
    const units = 'standard';

}

//zoneid's
const KEY_0 = '10, 2';
const KEY_P = '11, 2';
const KEY_L = '11, 3';

const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKeys.parsed.apiKey}&units=${units}`;

// push to das keys api
const pushToDas = (alertList) => {
    for (i of alertList){
        request.post({
            url: dasKeysUrl + '/api/1.0/signals',
            // headers: headers,
            body: i,
            json: true,
        }, (e, response) => {
            if (response && response.statusCode == 200) {
                console.log('response', response.body);
            }

            if (response && response.statusCode != 200) {
                console.error(response.body);
            }

            if (e) {console.log(e);}
        })
    }
}

const tempConversion = (temp, units) => {
    // default units are kevlins
    if (units == 'standard') {
        //convert to farenhight
        newTemp = (temp-273.15)*1.8 + 32
        return newTemp.toFixed();
    } else if (units == 'metric') {
        // convert to celcius
        newTemp = temp-273.15
        return newTemp.toFixed();
    } else {
        console.warn('no unit setting was set temp will print out in Kelvin units')
        return temp
    }
}

const getAlertLevel = (rawTemp) => {
    // get the alert level where rawTemp should be the heightest value
    const fahrenheit = tempConversion(rawTemp, 'standard');
    switch(fahrenheit) {
        case fahrenheit >= 95:
            return 'hot';
        case fahrenheit >= 50:
            return 'normal';
        case fahrenheit < 50:
            return 'cold';
    }
}

// get the current weather
const getForcast = () => {
    const data = fetch( weatherUrl, { method: 'GET', })
    .then(response => response.json())
    .then( (data) => {
        // console.log(`Todays high is: ${tempConversion(data.main.temp_max, units)} and the low is: ${tempConversion(data.main.temp_min, units)}`)
        main(data.main);
    })
    .catch(e => console.warn(e))
}

const main = (data) => {
    // get the weather for today
    const temp = tempConversion(data.temp, units);
    const tempMax = tempConversion(data.temp_max, units);
    const tempMin = tempConversion(data.temp_min, units);

    // check the high and low levels
    const isHigh = getAlertLevel(data.temp_max);
    const isLow = getAlertLevel(data.temp_min);

    var alerts = [];

    if (isHigh == 'hot'){
        //build a hot alert
        var signal = {
            'name': 'HOT alert',
            'message' : `today there will be a high of ${tempMax} degrees, set those windows`,
            'zoneId' : KEY_P,
            'color' : '#ff0000',
            'pid' : 'DK5QPID', // default pid
            'effect' : 'BLINK',
        }
        alerts.push(signal);
    };
    
    if (isLow == 'cold') {
        //build a cold alert
        var signal = {
            'name': 'cold alert',
            'message' : `tonight will be ${tempMin} degrees close up your windows`,
            'zoneId' : KEY_L,
            'color' : '#0000FF',
            'pid' : 'DK5QPID', // default pid
            'effect' : 'BLINK',
        }
        alerts.push(signal);
    };

    // isCurrent
    if (getAlertLevel(data.temp) == 'hot') {
        // build hot alert on main key
        var signal = {
            'name': 'cold alert',
            'message' : `today will be ${tempMax} degrees close up your windows`,
            'zoneId' : KEY_O,
            'color' : '#FF0000',
            'pid' : 'DK5QPID', // default pid
            'effect' : 'BLINK',
        }
        alerts.push(signal);
    } else if (getAlertLevel(data.temp) == 'cold') {
        // build cold alert on main key
        var signal = {
            'name': 'cold alert',
            'message' : `tonight will be ${tempMin} degrees, get our those blankets`,
            'zoneId' : KEY_O,
            'color' : '#0000FF',
            'pid' : 'DK5QPID', // default pid
            'effect' : 'BLINK',
        }
        alerts.push(signal);
    } else {
        // build a normal alert on main key
        var signal = {
            'name': 'weather alert',
            'message' : `today will be a nice day around ${temp} degrees`,
            'zoneId' : KEY_O,
            'color' : '#00FF00',
            'pid' : 'DK5QPID', // default pid
            'effect' : 'SET_COLOR',
        }
        alerts.push(signal);
    }
    if (signal){pushToDas(alerts)};
}

getForcast();