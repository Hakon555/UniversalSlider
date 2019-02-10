// Copyright © 2019 Sergei Albov. All rights reserved.

function customAnimate(subject, direction, time, callback) {

    var framePerSecond = 120;
    var framesQuantity = framePerSecond * time / 1000;
    var arr = [];
    var count = 0;
    var counted = 0;
    var arrIntervalId = [];

    for(var key in direction){
        if(!direction.hasOwnProperty(key)) continue;
        arr.push(key);
        count++;
    }

    for(var i = 0; i < arr.length; i++){
        arrIntervalId.push(animate(arr[i]));
    }

    return arrIntervalId;

    function animate(key) {
        var currentCondition = parseInt(getComputedStyle(subject)[key]);
        var changesSizePerFrame = (direction[key] - currentCondition) / framesQuantity;

        var iteration = 0;

        var intervalId = setInterval(function () {

            currentCondition = currentCondition + changesSizePerFrame;
            subject.style[key] = currentCondition + "px";
            iteration++;

            if(iteration >= framesQuantity){
                clearInterval(intervalId);
                if(parseFloat(getComputedStyle(subject)[key]) !== direction[key]){
                    subject.style[key] = direction[key] + "px";
                }
                counted++;
                if(count === counted)
                    callback();
            }
        }, 1000/framePerSecond);

        return intervalId;
    }
}