// Copyright © 2019 Sergei Albov. All rights reserved.

/**
 * @description Класс UniversalSlider - создаёт объект-оболочку слайдера. Дефолт("SL1", "h", "universal-slider"). Для расширения сладера используется библиотека модулей "USL", но также возможно использовать свои библиотеки, организованные в соответствии со стандартом библиотеки.
 * @param {object} obj - объект параметров
 * {string} idInstance - (обязательный)id конкретного слайдера(должен совпадать с ид хтмл кода этого слайдера).
 * {string} type - тип слайдера (горизонтальный или вертикальный)("h" или "v").
 * {string} systemClass - название класса слайдера.
 * {boolean} logging - включение или выключение логирования
 * @constructor
 */
function UniversalSlider(obj) {

    this._idInstance = obj.idInstance;
    this._systemClass = (obj.systemClass) ? + obj.systemClass : "universal-slider";
    this._initialized = false;
    this.engineType = "sliderEngine";
    this.engineVersion = "ver1_0_0";
    this.refreshingFuncStack = {};
    this.modules = {};//функции подлюченных модулей
    this.sliderDirection = (obj.type) ? obj.type : "h";

    this.sliderContainer = {};//елемент контейнера слайдера
    this.sliderFrame = {};//елемент фрейма слайдера
    this.sliderTape = {};//елемент ленты слайдера
    this.arrSlides = {};//массив слайдов
    this.slideWidth = 0;//ширина слайда
    this.slideHeight = 0;//высота слайда
    this.quantitySlides = 0;//количество слайдов
    this.sliderStep = 0;//шаг слайдера
    this.sliderTapeLength = 0;//длинна ленты слайдера

    this.logging = obj.logging;
    this.defaultOrder = {};
}

/**
 * @description Инициализирует слайдер после создания объекта
 */
UniversalSlider.prototype.initSlider = function () {

    this
        ._setHtmlElementsVar()  //setSliderVars
        ._setMainSliderSizesVar()
        ._setTapeSizes()  //set slider styles
        ._setSliderSlideSizes()
        .setDefaultOrder()
        ._includeEngine(this.engineType, this.engineVersion)  //include engine
        ._enableRefreshing()
        ._initialized = true;  //set status initialized
};

/**
 * @description Метод установки типа и версии ядра слайдера(по умолчанию задано последнее стабильное ядро)
 * @param typeEngine - тип ядра
 * @param version - версия ядра
 */
UniversalSlider.prototype.setEngine = function(typeEngine, version){

    this.engineType = typeEngine;
    this.engineVersion = version;
};

/**
 * @description Внутренний метод подключения ядра слайдера
 * @param engineType - тип ядра
 * @param version - версия ядра
 * @private
 */
UniversalSlider.prototype._includeEngine = function(engineType, version) {

    return this.addFeature(USL.engines[engineType][version]);
};

/**
 * @description Метод добавляет новый функционал к слайдеру. Добавление происходит подключением модуля.
 * @param {function} module - название модуля в библиотеке модулей, пример USL.mod1.
 * @param {array} args - параметры для подключения модуля.
 * @returns {UniversalSlider} - возвращает обект слайдера, для возможности чейнинга.
 */
UniversalSlider.prototype.addFeature = function (module, args) {

    var moduleName = module.apply(this, args);

    this.modules[moduleName] = module;
    this.refreshingFuncStack[moduleName] = this[moduleName].refresh;

    return this;
};

/**
 * @description Метод для удаления функционала. По факту удаляет модуль.
 * @param {string} nameFeature - название модуля например модуль "USL.mod1" будет называться "mod1".
 * @returns {UniversalSlider} - возвращает обект слайдера, для возможности чейнинга.
 */
UniversalSlider.prototype.deleteFeature = function (nameFeature) {

    this[nameFeature].destructModule();
    delete this.refreshingFuncStack[nameFeature];
    delete this[nameFeature];

    return this;
};

/**
 * @description Метод для установки значений переменных ссылающихся на основныt элементы слайдера
 * @returns {UniversalSlider}
 * @private
 */
UniversalSlider.prototype._setHtmlElementsVar = function () {

    var sliderContainerID = document.getElementById(this._idInstance);

    if(sliderContainerID.classList.contains(this._systemClass)){
        this.sliderContainer = sliderContainerID.getElementsByClassName("slider-container")[0];//контейнер слайдера
        this.sliderFrame = sliderContainerID.getElementsByClassName("slider-frame")[0];//фрейм слайдера
        this.sliderTape = sliderContainerID.getElementsByClassName("slider-tape")[0];//лента слайдера
        this.arrSlides = sliderContainerID.getElementsByClassName("slider-slide");//массив слайдов
    }

    return this;
};

/**
 * @description Метод для установки значений переменных указывающих размеры слайдера.
 * @returns {UniversalSlider}
 * @private
 */
UniversalSlider.prototype._setMainSliderSizesVar = function () {

    this.slideWidth = parseFloat(getComputedStyle(this.sliderFrame).width);//ширина слайда
    this.slideHeight = parseFloat(getComputedStyle(this.sliderFrame).height);//высота слайда
    this.quantitySlides = this.arrSlides.length;

    if(this.sliderDirection === "h"){
        this.sliderTapeLength = this.quantitySlides * this.slideWidth;
        this.sliderStep = this.slideWidth;
    }else{
        this.sliderTapeLength = this.quantitySlides * this.slideHeight;
        this.sliderStep = this.slideHeight;
    }

    return this;
};

/**
 * @description Задаёт стили размеров ленты слайдера.
 * @returns {UniversalSlider}
 * @private
 */
UniversalSlider.prototype._setTapeSizes = function () {

    if(this.sliderDirection === "h"){
        this.sliderTape.style.width = this.sliderTapeLength + "px";
        this.sliderTape.style.height = this.slideHeight + "px";
    }else{
        this.sliderTape.style.width = this.slideHeight + "px";
        this.sliderTape.style.height = this.sliderTapeLength + "px";
    }

    return this;
};

/**
 * @description Задаёт стили разметов слайда слайдера.
 * @returns {UniversalSlider}
 * @private
 */
UniversalSlider.prototype._setSliderSlideSizes = function () {

    for(var i = 0; i < this.arrSlides.length; i++){
        this.arrSlides[i].style.width = this.slideWidth + "px";
        this.arrSlides[i].style.height = this.slideHeight + "px";
    }

    return this;
};

/**
 * @description установка параметров по умолчанию для вызова функции слайд
 * @param {object} order - объекс с параметрами
 * @returns {UniversalSlider}
 */
UniversalSlider.prototype.setDefaultOrder = function(order){
    if(!order){
        if(this.sliderDirection === "h"){
            this.defaultOrder = {order: "r", params: {funcAnimation: "default", orderType: "direction"}};
        }else{
            this.defaultOrder = {order: "b", params: {funcAnimation: "default", orderType: "direction"}};
        }
    }else{
        this.defaultOrder = order;
    }

    return this;
};

/**
 * @description функция для вывода сообщений в консоль
 * @param message - сообщение для вывоа в консоль
 * @returns {boolean}
 */
UniversalSlider.prototype.log = function(message) {
    if(!this.logging) return false;
    console.log(message);
};

/**
 * @description функция для вкючения выключения вывода сообщений в консоль
 * @returns {string} возвращает в консоль сообщение о результате
 */
UniversalSlider.prototype.toggleLogging = function() {
    if(this.logging){
        this.logging = false;
        return "Logging disabled."
    }else{
        this.logging = true;
        return "Logging enabled."
    }
};

/**
 * @description включает ресайзинг слайдера при изменении размера экрана
 * @returns {UniversalSlider}
 * @private
 */
UniversalSlider.prototype._enableRefreshing = function () {

    var self = this;
    var innerRefreshingSlider = this._innerRefreshingSlider;
    var modulesRefreshingSlider = this._modulesRefreshingSlider;

    window.onresize = function (event) {

        var oldStepSize = self.sliderStep;
        var ratio;

        ratio = innerRefreshingSlider.call(self, oldStepSize);
        modulesRefreshingSlider.call(self, {ratio: ratio});
    };

    return this;
};

/**
 * @description обновляет размеры элементов слайдера при ресайзе
 * @param {number} oldStepSize - ширина шага слайдера до ресайза
 * @returns {number} возвращает коэффициент ресайза
 * @private
 */
UniversalSlider.prototype._innerRefreshingSlider = function (oldStepSize) {
    this
        ._setMainSliderSizesVar()
        ._setTapeSizes()
        ._setSliderSlideSizes();

    return this.sliderStep / oldStepSize;
};

/**
 * @description обносляет состояние модулей при ресайзе
 * @param {object} objResize - объект свойств описыающий ресайзинг, включает:
 * {number} ratio - коэффициент ресайзинга
 * @private
 */
UniversalSlider.prototype._modulesRefreshingSlider = function (objResize) {

    for(var key in this.refreshingFuncStack){
        if (!this.refreshingFuncStack.hasOwnProperty(key)) continue;

        this.refreshingFuncStack[key].call(this, objResize);
    }
};