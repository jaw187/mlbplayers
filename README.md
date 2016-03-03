# mlbplayers
Retrieve MLB Gameday Player Data for a given day

## Install
```
npm install mlbplayers
```

## Usage
```
const Mlbplayers = require('mlbplayers');

var options = {
    path: 'year_2011/month_07/day_23/'
};

var mlbplayers = new Mlbplayers(options);

mlbplayers.get(function (err, players) {
  
  //... do something
});
```
