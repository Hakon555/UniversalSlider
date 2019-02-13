// Copyright © 2019 Sergei Albov. All rights reserved.

var USL = {
    engines : {}
};

USL.engines.sliderEngine = {};
USL.engines.sliderEngine.ver1_0_0 =
function engine() {

    var name = "engine";
    var createOrderObjectFuncLib = {};//функции создания объекта заказа
    var functionKF = {};//функции КФ
    var slidingAnimationLib = {};//функции анимации;
    var slidingOrderStack = [];//стек заказов слайдинга
    var timeSliding = 500;
    var eventHandlers = {};
    var underAction = false;
    var targetPosition = 0;//пиксели
    var previousPosition = null;
    var logging = false;
    var self = this;
    var arrExecutingAnimationId = [];
    var animatedOrder = {};

    /**
     * @description Основной метод ядра - перелистывание слайдов определённым методом. Примеры:
     * ("r",{funcAnimation: "default", orderType: "direction"});
     * (3,{funcAnimation: "default", orderType: "slideNumber"});
     * (-5000,{funcAnimation: "jumpToPosition", orderType: "pixelPosition"});
     * @param {*} order - заказ на слайдинг, может быть 3-х типов:
     *  1)сторона куда листать, для горизонтального (r или l), для вертикального (t или b);
     *  2)позиция в пикселях (-1000);
     *  3)номер слайда (3);
     * @param {object} objParam - объект включающий в себя 2 свойства
     * {string}orderType - определяет тип данных заказа, может принимать 3 типа:
     *  1)direction - если принято направление;
     *  2)pixelPosition - если принято позиция в пикселях;
     *  3)slideNumber - если принято номер слайда;
     * {string}funcAnimation - задаёт стиль листания. Принимает название функции из внутренней библиотеки функций
     * листания. По умолчанию функция - линейная анимация.
     * {boolean}force - очищает стек слайдинга и выполняет функцию слайд без ожидания завершения предыдущей анимации
     * @returns {boolean}
     */
    function slide(order, objParam) {

        if(objParam && objParam.force && objParam.force === true){
            trigger("forceCallSlide", {order: order, objParam: objParam});
            clearExecutionStack();
        }

        if(underAction){
            trigger("engineBusy", {stack: slidingOrderStack});
            return false;
        }

        var funcAnimation = (objParam && objParam.funcAnimation) ? objParam.funcAnimation : "default";
        var orderType = (objParam && objParam.orderType) ? objParam.orderType : "direction";

        if(!(objParam && objParam.orderType) && !(typeof order === "string")) {
            orderType = "slideNumber";
        }

        createOrder({orderFromSlide: order, funcAnimation: funcAnimation, orderType: orderType});//создание заказа

        trigger("startExecutingOrder", {stack: slidingOrderStack});
        executeNextOrder();
        return true;
    }

    /**
     * @description - очищает стек слайдинга, останавливает все анимации и переводит ядро в неактивное состояние
     */
    function clearExecutionStack() {
        trigger("clearExecutionStack", {animation: arrExecutingAnimationId, execution: slidingOrderStack});

        slidingOrderStack.length = 0;

        for(var i = 0;i < arrExecutingAnimationId.length; i++){
            clearInterval(arrExecutingAnimationId[i]);
        }
        underAction = false;

        trigger("endSliding");
    }

    /**
     * @description создаёт заказ на листание
     * @param {object} obj - объект с параметрами для создания ордера. Если указан параметр order, то новый ордер строится по нему
     * {*} orderFromSlide - параметр указывает сторону, позицию в пикселях или слайд
     * {string} funcAnimation - параметр прокидывается из функции слайд
     * {string} orderType - параметр прокидывается из функции слайд
     * {object} order - готовый order
     * @returns {boolean}
     */
    function createOrder(obj){

        if(!obj.preparedOrder) {
            var order = createOrderObjectFuncLib[obj.orderType](obj.orderFromSlide, obj.funcAnimation);

            slidingOrderStack.push(order);
            trigger("creatingOrderStack", order);
            trigger("changingOrderStack", order);
        }else{
            slidingOrderStack.push(obj.preparedOrder);
            trigger("changingOrderStack", obj.preparedOrder);
        }
        return true;
    }

    /**
     * @description - удаляет последний заказ на листание
     */
    function deleteOrder(){

        var order = slidingOrderStack[slidingOrderStack.length - 1];
        slidingOrderStack.length--;

        trigger("orderDeleted", {order: order});
    }

    /**
     * @description - выполняет последний заказ в стеке заказов, вызывается из функции слайд и колбеком из функций анимации
     */
    function executeNextOrder() {

        if(!slidingOrderStack[0]){
            trigger("emptyOrderStack");
            return;
        }

        if(targetPosition === parseInt(targetPosition)) {
            var slide = self.arrSlides[targetPosition];//текущий слайд или тот на который происходит слайдинг
            var slideData = slide.dataset;
        }else{
            slideData = {};
        }

        if(slideData) {
            trigger("beforeCallKFRouter", {data: slideData});
            kfRouter(slideData);
        }
        if(!slidingOrderStack[0]){
            trigger("emptyOrderStack");
            return;
        }

        functionKF.master.func(slidingOrderStack[slidingOrderStack.length -1].toPosition);

        slideAndTransition(slidingOrderStack.pop());
    }

    //функции слайдинга(создания заказа на слайдинг)
    /**
     * @description - фукция слайдинга. Создаёт объект заказа на листание. Делает переход в стороны в ленте слайдера.
     * @param {string} orderFromSlide - позия для перехода в пикселях
     * @param {string} funcAnimation - функция для анимации
     * @returns {{toPosition: number, funcAnimation: *, client: number, direction: string}}
     */
    createOrderObjectFuncLib.direction = function (orderFromSlide, funcAnimation) {

        var toPosition;

        if(orderFromSlide === "r" || orderFromSlide === "b"){
            toPosition = parseInt(targetPosition + 1);
        }else{
            toPosition = parseInt(targetPosition - 1);
        }

        return {toPosition: toPosition, funcAnimation: funcAnimation, client: targetPosition, direction: orderFromSlide};
    };

    /**
     * @description - фукция слайдинга. Создаёт объект заказа на листание. Делает переход к определённой позиции в пикселях.
     * @param {number} orderFromSlide - позия для перехода в пикселях
     * @param {string} funcAnimation - функция для анимации
     * @returns {{toPosition: number, funcAnimation: *, client: number, direction: string}}
     */
    createOrderObjectFuncLib.pixelPosition = function (orderFromSlide, funcAnimation) {
        var toPosition = -orderFromSlide / self.sliderStep;
        return {toPosition: toPosition, funcAnimation: funcAnimation, client: targetPosition, direction: "tp"};
    };

    /**
     * @description - фукция слайдинга. Создаёт объект заказа на листание. Делает переход к определённому слайду.
     * @param {number} orderFromSlide - номер слайда к которому перейти(отсчёт слайдов начинается с нуля)
     * @param {string} funcAnimation - функция для анимации
     * @returns {{toPosition: number, funcAnimation: *, client: number, direction: string}}
     */
    createOrderObjectFuncLib.slideNumber = function (orderFromSlide, funcAnimation) {
        return {toPosition: parseInt(orderFromSlide), funcAnimation: funcAnimation, client: targetPosition, direction: "tp"};
    };

    //\функции слайдинга

    /**
     * @description - роутер для функций КФ. Создаёт очередь выполнения функций КФ исходя из их приоритетов.
     * @param {object} data - массив дата атрибутов из dataset
     */
    function kfRouter(data) {

        var arrayNames = [];
        var arrForExecute = [];

        for(var key in data){
            if (!data.hasOwnProperty(key)) continue;
            arrayNames.push(key);
        }

        for(var i = arrayNames.length - 1; arrayNames.length > 0; (i > 0) ? i-- : i = arrayNames.length - 1){

            if(!functionKF[arrayNames[i]]){
                trigger("noFunctionKF", {message: arrayNames[i]});
                arrayNames.length--;
                continue;
            }

            if(functionKF[arrayNames[i]].priority.length === 0){
                arrForExecute.push(arrayNames[i]);
                arrayNames.splice(i, 1);
            }else{
                var arrPriorityNames = functionKF[arrayNames[i]].priority;
                var selector = true;

                for(var h = 0; h < arrPriorityNames.length; h++){
                    if(arrayNames.indexOf(arrPriorityNames[h]) !== -1){//проверяет наличие имени приоритета в списке недобавленных имён
                        selector = false;
                    }
                    if(arrPriorityNames[h] === "afterAll" && selector){//проверяет все ли имена в списке недобавленных имён имеют приоритет afterAll
                        for(var g = 0; g < arrayNames.length; g++){
                            if(functionKF[arrayNames[g]].priority.indexOf("afterAll") === -1){
                                selector = false;
                            }
                        }
                    }
                    if(!selector && arrPriorityNames[h] !== "afterAll"){//проверяет нет ли притиворечащих приоритетов

                        var anotherPriorityNames = functionKF[arrPriorityNames[h]].priority;

                        if(anotherPriorityNames.indexOf(arrayNames[i]) !== -1){
                            trigger("wrongFKPriority", {func1: arrayNames[i], func2: arrayNames[arrayNames.indexOf(arrPriorityNames[h])]});
                            arrayNames.splice(i, 1);
                            arrayNames.splice(arrayNames.indexOf(arrPriorityNames[h]), 1);
                            i--;
                        }
                    }
                }

                if(selector) {
                    arrForExecute.push(arrayNames[i]);
                    arrayNames.splice(i, 1);
                }
            }
        }

        for(var i = 0; i < arrForExecute.length; i++){
            (function (i) {
                var name = arrForExecute[i];
                functionKF[arrForExecute[i]].func(data, function () {
                    trigger("successCompleteKF", {name: name});
                });
            })(i);
        }
    }

    /**
     * @description высшая функция КФ, её задача ограничить выход слайдера за рамки ленты
     * @param {number} checkPosition - позиция в пикселях на которую намечен переход
     */
    functionKF.master = {
        func: function (checkPosition) {

            if((checkPosition * -self.sliderStep) < -(self.sliderTapeLength - self.sliderStep) || (checkPosition * -self.sliderStep) > 0) {

                var position = 0;

                if ((checkPosition * -self.sliderStep) > 0) {
                    position = parseInt((self.sliderTapeLength - self.sliderStep) / self.sliderStep);
                } else {
                    position = 0;
                }

                deleteOrder();
                createOrder({orderFromSlide: position, funcAnimation: "fromPastToPresent", orderType: "slideNumber"});
                trigger("masterKF", {from: checkPosition, to: position});
            }
        },
        priority: []
    };

    //другие функции КФ-------------------------------------------------------------------------------------------------
    /**
     * Останавливает слайдинг в сторону указанную в дата атрибуте
     */
    functionKF.stop = {
        /**
         * @description - останавливает слайдинг в сторону указанную в дата атрибуте
         * @param {object} data - дата атрибуты
         * @param {function} callback - колбек функция
         */
        func: function (data, callback) {

            for(var i = slidingOrderStack.length - 1; i >= 0; i--) {
                if (slidingOrderStack[i].client === targetPosition) {
                    if((data.stop === "r" || data.stop === "b") && (slidingOrderStack[i].direction === "r" || slidingOrderStack[i].direction === "b")) {
                        deleteOrder();
                    }
                    if((data.stop === "l" || data.stop === "t") && (slidingOrderStack[i].direction === "l" || slidingOrderStack[i].direction === "t")) {
                        deleteOrder();
                    }
                    if(data.stop === "tp" && slidingOrderStack[i].direction === "tp"){
                        deleteOrder();
                    }
                }
            }

            callback();
        },
        priority: ['afterAll']
    };

    /**
     * Останавливает слайдинг в любую сторону
     */
    functionKF.superstop = {
        /**
         * @description - останавливает слайдинг в любую сторону
         * @param {object} data - дата атрибуты
         * @param {function} callback - колбек функция
         */
        func: function (data, callback) {

            for(var i = slidingOrderStack.length - 1; i >= 0; i--) {
                if (slidingOrderStack[i].client === targetPosition) {
                    deleteOrder();
                }
            }

            callback();
        },
        priority: ['afterAll', 'stop']
    };
    //\другие функции КФ------------------------------------------------------------------------------------------------

    /**
     * @description Функция для листания и переходов (ЛП)
     * @param {object} orderObj - объект с переменными
     * {int} toPosition - позиция для перехода
     * {int} funcAnimation - название функции анимации перехода
     */
    function slideAndTransition(orderObj) {

        var animationFunc = slidingAnimationLib[orderObj.funcAnimation];

        if(!animationFunc){
            trigger("noSliding", {message: "Не найдена функция анимации: " + orderObj.funcAnimation});
            return false;
        }

        var properties = {};

        if(self.sliderDirection === "h"){
            properties.left = orderObj.toPosition * -self.sliderStep;
        }else{
            properties.top = orderObj.toPosition * -self.sliderStep;
        }

        previousPosition = targetPosition;
        targetPosition = orderObj.toPosition;

        trigger("startSliding");

        animationFunc(properties, function () {
            trigger("endSliding");
        });

        return true;
    }

    //функции анимации--------------------------------------------------------------------------------------------------
    //защищённые функции анимации

    //функция  для перехода в начало ленты
    slidingAnimationLib.fromPastToPresent = function (objStyleDirection, callbackEndSliding) {
        slidingAnimationLib.default(objStyleDirection, callbackEndSliding);
    };
    //\защищённые функции анимации

    //другие функции анимации

    /**
     * @description Стандартная функция для перехода к позиции с анимацией. Такие функции можно создавать самостоятельно.
     * @param {object} objStyleDirection - объект для перехода, {стиль css(left/top): позиция для перехода в пикселях}
     * @param {string} callback - функция колбек(для нормальной работы программы её необходимо вызвать или передать колбеком)
     * @param {number} time - необязательный параметр указывает время анимации
     * функции анимации
     */
    slidingAnimationLib.default = function (objStyleDirection, callback, time) {
        var arrIntervalId = customAnimate(self.sliderTape, objStyleDirection, (time) ? time : timeSliding, callback);

        for(var i = 0; i < arrIntervalId.length; i++){
            arrExecutingAnimationId.push(arrIntervalId[i]);
        }

        var allTime;

        if(!time){
            allTime = timeSliding;
        }else{
            allTime = time;
        }

        animatedOrder = {scopeId: arrExecutingAnimationId, objStyleDirection: objStyleDirection, callback: callback, startTime: Date.now(), time: allTime};
    };

    /**
     * @description Cтандартная функция моменталього перехода к позиции без анимации. Такие функции можно создавать самостоятельно.
     * @param {object} objStyleDirection - объект для перехода, {стиль css(left/top): позиция для перехода в пикселях}
     * @param {function} callback - функция колбек(для нормальной работы программы её необходимо вызвать или передать колбеком дальше)
     */
    slidingAnimationLib.jumpToPosition = function (objStyleDirection, callback) {

        arrExecutingAnimationId.push(setTimeout(function () {
            self.log(objStyleDirection);

            var side = "";
            var position = 0;

            for(var key in objStyleDirection){
                if(objStyleDirection.hasOwnProperty(key)){
                    side = key;
                    position = objStyleDirection[key];
                }
            }

            self.sliderTape.style[side] = position + "px";

            trigger("jumpedToPosition", position);
            callback();
        }, 0)
        );

    };
    //\функции анимации-------------------------------------------------------------------------------------------------

    /**
     * @description добавить функцию КФ
     * @param {string} name - имя функции(сходится с названием отслеживаемого дата атрибута)
     * @param {function} func - функция
     * @param {array} priority - приоритет выполнения(указывать в формате ['имя функции','имя функции'], где имя
     * функции, это функция которая должна быть выполнена до этой функции)
     */
    function addKFFunc(name, func, priority) {

        if(!priority) priority = [];

        if(name === "master") return false;
        functionKF[name] = {
            func: func,
            priority: priority,
            self: self,
            slidingOrderStack: slidingOrderStack,
            functionKF: functionKF,
            slidingAnimationLib: slidingAnimationLib,
            timeSliding: timeSliding,
            targetPosition: targetPosition,
            previousPosition: previousPosition,
            deleteOrder: deleteOrder,
            createOrder: createOrder,
            clearExecutionStack: clearExecutionStack,
            executeNextOrder: executeNextOrder,
            trigger: trigger,
            refresh: refresh
        };

        trigger("addedKFFunc", {name: name});
    }

    /**
     * @description удалить функцию КФ
     * @param {string} name
     */
    function removeKFFunc(name) {

        if(name === "master") return false;
        if(functionKF[name]){
            delete functionKF[name];
            trigger("deletedKfFunc", {name: name});
        }
    }

    /**
     * @description добавить функцию анимации слайдинга
     * @param {string} name
     * @param {function} func
     */
    function addSlidingAnimationFunc(name, func) {

        if(name === "fromPastToPresent") return false;
        slidingAnimationLib[name] = func;
        trigger("addedAnimationFunc", {name: name});
    }

    /**
     * @description удалить функцию анимации слайдинга
     * @param {string} name
     */
    function removeSlidingAnimationFunc(name) {

        if(name === "fromPastToPresent") return false;
        if(slidingAnimationLib[name]){
            delete slidingAnimationLib[name];
            trigger("deletedAnimationFunc", {name: name});
        }
    }

    /**
     * @description Устанавливает функцию анимации при переходе с конца ленты
     * @param name - если имя функции не будет найдено в библиотеке функций анимации, то будет записано undefined
     */
    function setEndTapeFunction(name) {

        if(!slidingAnimationLib[name]){
            slidingAnimationLib.fromPastToPresent = undefined;
        }else {
            slidingAnimationLib.fromPastToPresent = function (objCssDirection, callbackEndSliding) {
                slidingAnimationLib[name](objCssDirection, callbackEndSliding);
            };

            trigger("changedEndFunc", {name: name});
        }
    }

    /**
     * @description устанавливает время слайдинга.
     * @param time - новое время в миллисекундах.
     */
    function setTimeSliding(time) {
        timeSliding = time;
        trigger("newSlidingTime", {time: time});
    }

    /**
     * @description выполняет все функции подписанные на заданное событие
     * @param {string} eventType - тип события
     * @param value - параметры
     */
    function trigger(eventType, value) {
        if(eventHandlers[eventType]){
            for(var i = 0; i < eventHandlers[eventType].length; i++){
                eventHandlers[eventType][i](value);
            }
        }
    }

    /**
     * @description добавляет события и подписывает новые функции на события.
     * @param {string} eventType - тип события.
     * @param {function} func - функция обработчик.
     */
    function addEventHandler(eventType, func) {

        if(!eventHandlers[eventType]){
            eventHandlers[eventType] = [];
        }
        eventHandlers[eventType].push(func);
    }

    /**
     * @description удаляет функции из подписчиков на события.
     * @param {string} eventType - тип события.
     * @param {function} func - функция обработчик.
     */
    function removeEventHandler(eventType, func) {

        if(eventHandlers[eventType]){
            for(var i = 0; i < eventHandlers[eventType].length; i++){
                if(eventHandlers[eventType][i] === func){
                    eventHandlers[eventType].splice(i--, 1);
                }
            }
        }
    }

    //добавление стандартных событий
    addEventHandler("startSliding", function (event) {
        underAction = true;
        self.log("engineStartWork");
    });
    addEventHandler("endSliding", function (event) {
        underAction = false;
        animatedOrder = {};
        executeNextOrder();
        self.log("engineCompleteWork");
    });
    addEventHandler("noSliding", function (event) {
        underAction = false;
        self.log("noSliding - engineCompleteWork");
        self.log(event.message);
        executeNextOrder();
    });
    addEventHandler("jumpedToPosition", function (position) {
        self.log("Jumped to: " + position);
    });
    addEventHandler("creatingOrderStack", function (order) {
        self.log("OrderStack changed, last order:");
        self.log(order);
    });
    addEventHandler("noFunctionKF", function (order) {
        self.log("Функция КФ не найдена: " + order.message);
    });
    addEventHandler("wrongFKPriority", function (order) {
        self.log("Не верный приоритет функций КФ: " + order.func1 + ", " + order.func2);
    });
    addEventHandler("masterKF", function (order) {
        self.log("Позиция выходит за границы ленты слайдера, сделано изменение заказа с позиции: " + order.from + ", на: " + order.to);
    });
    addEventHandler("forceCallSlide", function (param) {
        self.log("Принудитльный вызов слайд с параметрами: order = " + param.order + ", orderType = " + param.objParam.orderType + ", funcAnimation = " + param.objParam.funcAnimation);
    });
    addEventHandler("engineBusy", function (param) {
        self.log("Ядро занято, задач в стеке: " + param.stack.length);
    });
    addEventHandler("startExecutingOrder", function (param) {
        self.log("Начало исполнения стека заказов");
    });
    addEventHandler("clearExecutionStack", function (param) {
        self.log("Стеки выполнения и анимации удалены");
    });
    addEventHandler("orderDeleted", function (param) {
        self.log("Ордер удалён");
        self.log(param.order);
    });
    addEventHandler("emptyOrderStack", function (param) {
        self.log("Ордер стек пуст");
    });
    addEventHandler("beforeCallKFRouter", function (param) {
        self.log("Запуск КФ роутера");
    });
    addEventHandler("successCompleteKF", function (param) {
        self.log("функция кф выполнена успешно, имя функции: " + param.name);
    });
    addEventHandler("addedKFFunc", function (param) {
        self.log("Функция КФ успешно добавлена, имя функции: " + param.name);
    });
    addEventHandler("deletedKFFunc", function (param) {
        self.log("Функция КФ успешно удалена, имя функции: " + param.name);
    });
    addEventHandler("addedAnimationFunc", function (param) {
        self.log("Функция анимации успешно добавлена, имя функции: " + param.name);
    });
    addEventHandler("deletedAnimationFunc", function (param) {
        self.log("Функция анимации успешно удалена, имя функции: " + param.name);
    });
    addEventHandler("changedEndFunc", function (param) {
        self.log("Изменена функция конца ленты на функцию: " + param.name);
    });
    addEventHandler("newSlidingTime", function (param) {
        self.log("Установлено новое время слайдинга, время: " + param.time);
    });
    addEventHandler("resizing", function (param) {
        self.log("Ресайзинг слайдера, коэффициент: " + param.ratio);
    });
    //\добавление стандартных событий

    /**
     * @description - возвращает порядковый номер слайда в массиве слайдов, если позиция не соотвествтвует ни одному
     * слайду, то возвращает объект, со свойством "notSlide: true" и свойством "nearFromSlide" указывающим на не целый
     * номер слайда, т.е. тип float.
     * @param {number} position - текущая позиция ленты, целое число.
     * @returns {*}
     */
    function getSlideNumber(position) {

        var output = 0;

        if(self.sliderDirection === "h"){
            output = (-position + self.sliderStep) / self.slideWidth - 1;
        }else{
            output = (-position + self.sliderStep) / self.slideHeight - 1;
        }
        if(+output !== parseInt(+output)){
            return {notSlide: true, nearFromSlide: output};
        }
        return output;
    }

    /**
     * @description внутренний метод установки модуля
     */
    function installModule() {

    }

    /**
     * @description - удаление модуля и всех его переменных, кроме основной  переменной доступа к модулю, эту переменную
     * нужно удалять из объекта.
     */
    function destructModule() {

    }

    function refresh(objResize) {

        trigger("resizing", {ratio: objResize.ratio});

        if(!underAction){
            createOrder({orderFromSlide: targetPosition, funcAnimation: "jumpToPosition", orderType: "slideNumber"});
            executeNextOrder();
        }else{
            var currentTime = Date.now();

            for(var i = 0; i < animatedOrder.scopeId.length; i++){
                if(arrExecutingAnimationId.indexOf(animatedOrder.scopeId[i]) !== -1){
                    clearInterval(arrExecutingAnimationId[i]);
                    arrExecutingAnimationId.splice(i, 1);
                }
            }

            for(var key in animatedOrder.objStyleDirection){
                if(!animatedOrder.objStyleDirection.hasOwnProperty(key)) continue;
                self.sliderTape.style[key] = parseInt(getComputedStyle(self.sliderTape)[key]) * objResize.ratio + "px";
            }

            var objStyleDirection = {};
            objStyleDirection[key] = animatedOrder.objStyleDirection[key] * objResize.ratio;

            var time = animatedOrder.time - (currentTime - animatedOrder.startTime);
            var callback = animatedOrder.callback;
            animatedOrder = {};

            slidingAnimationLib.default(objStyleDirection, callback, time);
        }
    }

    //запись переменных в объект
    this.engine = {};
    this.engine.slide = slide;
    this.engine.destructModule = destructModule;
    this.engine.addEventHandler = addEventHandler;
    this.engine.removeEventHandler = removeEventHandler;
    this.engine.setTimeSliding = setTimeSliding;
    this.engine.addKFFunc = addKFFunc;
    this.engine.removeKFFunc = removeKFFunc;
    this.engine.addSlidingAnimationFunc = addSlidingAnimationFunc;
    this.engine.removeSlidingAnimationFunc = removeSlidingAnimationFunc;
    this.engine.setEndTapeFunction = setEndTapeFunction;
    this.engine.clearExecutionStack = clearExecutionStack;
    this.engine.refresh = refresh;

    installModule();

    return name;
};

//----------------другие модули-------------------//
//модуль для примера
USL.mod1 = function mod1(param, param1, param2) {

    var name = "mod1";
    var self = this;

    function a() {
        alert(name);
    }
    function getA() {
        alert(self.bbb);
    }
    /**
     * @description пример функции КФ. Действие: при попытке перейти со слайда с дата-атрибутом "skipnextslide", слайдер
     * перемотается сначала на позицию слайда с номером 1, а затем на позицию с номером 5;
     * @type {{func: skipnextslide.func, priority: Array}}
     */
    function skipnextslide (data, callback) {
        var lastOrder = this.slidingOrderStack[this.slidingOrderStack.length - 1];

        this.deleteOrder();

        var copy = Object.assign({}, lastOrder);
        copy.toPosition = 1;
        copy.direction = "tp";

        this.createOrder({preparedOrder: copy});

        var copy2 = Object.assign({}, lastOrder);
        copy2.toPosition = 5;
        copy2.direction = "tp";

        this.createOrder({preparedOrder: copy2});

        callback();
    }

    function installModule() {
        self.bbb = 10;
        self.ccc = param;
        self.ddd = param1;
        self.fff = param2;

        self.engine.addKFFunc("skipnextslide", skipnextslide, []);
    }
    function destructModule() {
        delete self.bbb;
        delete self.ccc;
        delete self.ddd;
        delete self.fff;

        self.engine.removeKFFunc("skipnextslide");
    }
    function refresh() {

    }

    this.mod1 = {};
    this.mod1.a = a;
    this.mod1.destructModule = destructModule;
    this.mod1.getA = getA;
    this.mod1.refresh = refresh;

    installModule();

    return name;
};

/**
 * @description подключает автослайдинг
 * @param {number} param - время между слайдами в миллисекундах
 * @returns {string}
 */
USL.autoSliding = function (param) {

    var name = "autoSliding";
    var self = this;
    var timeBetweenSlides = 5000;
    var timerId = 0;

    /**
     * @description включает и выключает автослайдинг
     * @param {boolean} selector - если true, то включает автослайдиг, если нет, то выключает
     */
    function autoSliding(selector) {
        if(selector) {
            timerId = setInterval(function () {
                self.engine.slide(self.defaultOrder.order, self.defaultOrder.params);
            }, timeBetweenSlides);
        }else{
            clearInterval(timerId);
        }
    }

    /**
     * @description устанавливает новое время между слайдами
     * @param {number} time - новое время в миллисекундах
     * @returns {boolean}
     */
    function setTimeBetweenSlides(time) {
        if(time < 0) return false;
        timeBetweenSlides = time;
        autoSliding(false);
        autoSliding(true);
        return true;
    }

    function installModule() {
        if(param && param > 0) timeBetweenSlides = param;
        autoSliding(true);
    }
    function destructModule() {
        autoSliding(false);
    }
    function refresh() {

    }

    this.autoSliding = {};
    this.autoSliding.destructModule = destructModule;
    this.autoSliding.refresh = refresh;
    this.autoSliding.setTimeBetweenSlides = setTimeBetweenSlides;
    this.autoSliding.autoSliding = autoSliding;

    installModule();

    return name;
};

/**
 * @description подключает кнопки листания вправо влево
 * @param {string} buttonsId - id контейнера с кнопками, либо будут выбраны кнопки по умолчанию
 * @returns {string}
 */
USL.sideButtons = function (buttonsId) {

    var name = "side-buttons";
    var self = this;
    var leftButton;
    var rightButton;
    
    function enableSideButtons() {
        var buttonsContainer;

        if(buttonsId){
            buttonsContainer = document.getElementById(buttonsId);
        }else{
            buttonsContainer = document.getElementById(self._idInstance).getElementsByClassName("side-buttons")[0];
        }

        leftButton = buttonsContainer.getElementsByClassName("slider-side-buttons__left-side")[0];
        rightButton = buttonsContainer.getElementsByClassName("slider-side-buttons__right-side")[0];

        leftButton.onclick = function (event) {
            if(self.sliderDirection === "h"){
                self.engine.slide("l");
            }else{
                self.engine.slide("t");
            }
        };
        rightButton.onclick = function (event) {
            if(self.sliderDirection === "h"){
                self.engine.slide("r");
            }else{
                self.engine.slide("b");
            }
        };
    }

    function installModule() {
        enableSideButtons();
    }
    function destructModule() {
        leftButton.onclick = function (event) {};
        rightButton.onclick = function (event) {};
    }
    function refresh() {

    }

    this.sideButtons = {};
    this.sideButtons.destructModule = destructModule;
    this.sideButtons.refresh = refresh;

    installModule();

    return name;
};