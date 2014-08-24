jQuery(document).ready(function() {
    $("#map").yandexDelivery({
        tarif: [
            [0, 0],
            [500, 55]
        ],
        center: [56.2, 40.6],
        address: 'Россия, Костромская область, Чухломский район, деревня Чертово',
        companyName: 'Компания «Строй город 44»',
        regionsAllowed: [
            51490, // Московская область
            102269, // Москва
            115106, // Вологодская область
            85963, // Костромская область
            2095259, // Тверская область
            85617, // Ивановская область
            81995, // Калужская область
            81994, // Ярославская область
            72197, // Владимирская область
            81993, // Тульская область
            81996, // Смоленская область
            72195, // Нижегородская область
            115100, // Кировская область
            89331, //Новгородская область
            81997, // Брянская область
            72224, // Орловская область
            72169, // Липецкая область
            72180, // Тамбовская область
            72182, // Пензенская область
            72196, // Республика Мордовия
            80513, // Чувашия
            115114, // Марий Эл
            71950 // Рязанская область
        ]
    }).css({'font-size': '80%'});
});
(function($, window, document, undefined) {
    'use strict';
    var pluginName = 'yandexDelivery',
        defaults = {
            center: [56.2, 40.6],
            address: null,
            companyName: null,
            regionsAllowed: [],
            routeStyle: {
                strokeWidth: 4,
                strokeColor: '00BA22',
                opacity: 0.7
            },
            regionStyle: {
                fillColor: '00BA22',
                strokeWidth: 1,
                strokeColor: '00592c',
                opacity: 0.1
            }
        };

    function YandexDelivery(element, options) {
        this.element = element;
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this._deliveryMap = null;
        this._start = null;
        this._route = null;
        this._companyName = this.options.companyName || 'Точка отправки';
        this._myCollection = null;
        this._regions = null;
        this._routing = false;
        this.init();
    }
    YandexDelivery.prototype.init = function() {
        var self = this,
            mapId = $(this.element).attr('id'),
            searchFinishPoint, searchStartPoint;
        $.getScript("http://api-maps.yandex.ru/2.1/?lang=ru_RU", function() {
            ymaps.ready(function() {
                self._deliveryMap = new ymaps.Map(mapId, {
                    center: self.options.center,
                    zoom: 5,
                    type: 'yandex#map',
                    behaviors: ['drag'],
                    controls: ['zoomControl']
                }),
                searchStartPoint = new ymaps.control.SearchControl({
                    options: {
                        useMapBounds: true,
                        noCentering: true,
                        noPopup: false,
                        noPlacemark: true,
                        placeholderContent: 'Адрес отправки',
                        size: 'large',
                        float: 'none',
                        position: {
                            left: 10,
                            top: 10
                        }
                    }
                }),
                searchFinishPoint = new ymaps.control.SearchControl({
                    options: {
                        useMapBounds: true,
                        noCentering: true,
                        noPopup: false,
                        noPlacemark: true,
                        placeholderContent: 'Адрес доставки',
                        size: 'large',
                        float: 'none',
                        position: {
                            left: 10,
                            top: (!self.options.address) ? 50 : 10
                        }
                    }
                });
                if (!self.options.address) {
                    self._deliveryMap.controls.add(searchStartPoint);
                    searchStartPoint.events.add('resultselect', function(e) {
                        var results = searchStartPoint.getResultsArray(),
                            selected = e.get('index'),
                            point = results[selected].geometry.getCoordinates();
                        self.setStartPoint(point);
                    }).add('load', function(event) {
                        if (!event.get('skip') && searchStartPoint.getResultsCount()) {
                            self.searchStartPoint.showResult(0);
                        }
                    });
                }
                self._deliveryMap.controls.add(searchFinishPoint);
                searchFinishPoint.events.add('resultselect', function(e) {
                    var results = searchFinishPoint.getResultsArray(),
                        selected = e.get('index'),
                        point = results[selected].geometry.getCoordinates();
                    self.setFinishPoint(point);
                }).add('load', function(event) {
                    if (!event.get('skip') && searchFinishPoint.getResultsCount()) {
                        self.searchFinishPoint.showResult(0);
                    }
                });
                if (self.options.regionsAllowed.length !== 0) {
                    self.initRegionsFilter(self);
                }
                self._deliveryMap.events.add('click', self._onClick, self);
                if (self.options.address) {
                    self.initStartPoint(self);
                }
                self._myCollection = new ymaps.GeoObjectCollection();
                self._regions = new ymaps.GeoObjectCollection();
                self._deliveryMap.cursors.push('pointer')
                $(self.element).css('position', 'relative').append('<div id="yandex-delivery-result"><div id="result-data"></div><div id="result-close">×</div></div><div id="loader"></div>');
                $('#yandex-delivery-result').css({
                    'position': 'absolute',
                    'bottom': '0',
                    'background-color': 'rgba(256, 256, 256, .85)',
                    'width': ($(self.element).width() - 22) + 'px',
                    'padding': '10px',
                    'border': 'solid 1px lightgrey'
                }).toggle();
                $('#result-data').css({
                    'float': 'left'
                });
                $('#result-close').css({
                    'float': 'right',
                    'width': '20px',
                    'font-size': '24px',
                    'color': 'lightgrey',
                    'cursor': 'pointer'
                });
                $('#result-close').hover(function() {
                    $('#result-close').css('color', 'grey');
                }, function() {
                    $('#result-close').css('color', 'lightgrey');
                });
                $('#result-close').click(function() {
                    $('#yandex-delivery-result').toggle();
                });
                $('.ymaps-copyright__content-cell').toggle();
                $('#loader').css({
                    'position': 'absolute',
                    'top': '0',
                    'height': '100%',
                    'width': '100%',
                    'z-index': '100'
                });
                $('#loader').toggle();
            });
        });
    };
    YandexDelivery.prototype._onClick = function(e) {
        if (this._start) {
            this.setFinishPoint(e.get('coords'));
        } else {
            this.setStartPoint(e.get('coords'));
        }
    };
    YandexDelivery.prototype._onDragEnd = function(e) {
        this.getDirection();
    };
    YandexDelivery.prototype.getDirection = function() {
        if (!this._routing) {
            $('#loader').toggle();
            this._routing = true;
            if (this._route) {
                this._myCollection.remove(this._route);
                this._route = null;
            }
            if (this._start && this._finish) {
                var start = this._start.geometry.getCoordinates(),
                    finish = this._finish.geometry.getCoordinates();
                this.setDeliveryInformation(start, finish, this);
            }
        }
    };
    YandexDelivery.prototype.setStartPoint = function(position) {
        if (this._start) {
            this._start.geometry.setCoordinates(position);
        } else {
            if (this.options.address) {
                this.initStartPoint(self);
            }
            this._start = new ymaps.Placemark(position, {
                iconContent: this._companyName,
                balloonContent: (this.options.address) ? this._companyName : 'Точка отправки '
            }, {
                preset: 'islands#greenStretchyIcon',
                draggable: !Boolean(this.options.address)
            });
            this._start.events.add('dragend', this._onDragEnd, this);
            this._deliveryMap.geoObjects.add(this._start);
            //this._start.balloon.open();
        }
        if (this._finish) {
            this.getDirection();
        }
    };
    YandexDelivery.prototype.setFinishPoint = function(position) {
        if (this._finish) {
            this._finish.geometry.setCoordinates(position);
        } else {
            this._finish = new ymaps.Placemark(position, {
                iconContent: 'Точка доставки'
            }, {
                preset: 'islands#brownStretchyIcon',
                draggable: true
            });
            this._finish.events.add('dragend', this._onDragEnd, this);
            this._deliveryMap.geoObjects.add(this._finish);
            //this._start.balloon.open();
        }
        if (this._start) {
            this.getDirection();
        }
    };
    YandexDelivery.prototype.calculate = function(len, self) {
        var totalPrice = 0;
        for (var steps = self.options.tarif.length; steps > 0; steps--) {
            if (len > self.options.tarif[steps - 1][0]) {
                totalPrice += (len - self.options.tarif[steps - 1][0]) * self.options.tarif[steps - 1][1];
                len = self.options.tarif[steps - 1][0];
            }
        }
        return totalPrice.toString().replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, "$1&thinsp;");
    };
    YandexDelivery.prototype.initStartPoint = function(self) {
        function getAll(place, setStart) {
            ymaps.geocode(place).then(function(res) {
                setStart(res.geoObjects.get(0).geometry.getCoordinates());
            }, function(err) {
                alert('Ошибка, не удалось геокодировать адрес');
            });
        }
        getAll(this.options.address, function(res) {
            self.setStartPoint(res);
        });
    };
    YandexDelivery.prototype.getBounds = function(self) {
        var bounds, panelHeight, newbounds, deltaY, deltaPanel;
        if (self._route) {
            self._myCollection.add(self._route);
            self._deliveryMap.geoObjects.add(self._myCollection);
        }
        bounds = self._myCollection.getBounds();
        deltaY = Math.abs(bounds[0][1] - bounds[1][1]);
        panelHeight = $('#yandex-delivery-result').height();
        deltaPanel = deltaY / ($(self.element).height() - panelHeight) * panelHeight;
        newbounds = [
            [
                bounds[0][0] - deltaPanel,
                bounds[0][1]
            ],
            [
                bounds[1][0],
                bounds[1][1]
            ]
        ];
        self._deliveryMap.setBounds(newbounds);
    };
    YandexDelivery.prototype.initRegionsFilter = function(self) {
        ymaps.regions.load('RU', {
            lang: 'ru',
            quality: 0
        }).then(function(result) {
            var regions = result.geoObjects;
            regions.each(function(reg) {
                if (self.options.regionsAllowed.indexOf(+reg.properties.get('osmId')) !== -1) {
                    self._regions.add(new ymaps.GeoObject(reg, self.options.regionStyle));
                }
            });
            self._regions.events.add('click', self._onClick, self);
            self._deliveryMap.geoObjects.add(self._regions);
        }, function() {
            //
        });
    };
    YandexDelivery.prototype.setDeliveryInformation = function(start, finish, self) {
        var objects = ymaps.geoQuery(ymaps.geocode(start)).add(ymaps.geocode(finish));
        objects.then(function() {
            var addressStart = objects.get(0) && objects.get(0).properties.get('balloonContentBody') || '';
            var addressFinish = objects.get(5) && objects.get(5).properties.get('balloonContentBody') || '';
            var regular = /<.*>(.+)<\/.*>(.+)<\/.*>/;
            self._start.properties.set('balloonContent', addressStart);
            self._finish.properties.set('balloonContent', addressFinish);
            ymaps.route([start, finish]).then(function(router) {
                var distance = Math.round(router.getLength() / 1000),
                    message = '<b>Расстояние:</b> ' + distance + ' км<br/>' + '<span style="font-size: 150%;">Стоимость доставки: <b>%s руб</b></span>';
                self._route = router.getPaths();
                self._route.options.set(self.options.routeStyle);
                self.getBounds(self);
                self.isPointInRerions(self, finish);
                addressStart = '<b>Адрес отправки:</b> ' + addressStart.replace(regular, "$1, $2") + '<br>';
                addressFinish = '<b>Адрес   доставки:</b> ' + addressFinish.replace(regular, "$1, $2") + '<br>';
                addressStart = (self.isPointInRerions(self, start)) ? addressStart : '<span style="color: red;">' + addressStart + '</span>';
                addressFinish = (self.isPointInRerions(self, finish)) ? addressFinish : '<span  style="color: red;">' + addressFinish + '</span>';
                $('#result-data').html(addressStart + addressFinish + message.replace('%s', self.calculate(distance, self)));
                if (!$('#yandex-delivery-result').is(":visible")) {
                    $('#yandex-delivery-result').toggle();
                }
                self._routing = false;
                $('#loader').toggle();
            }, function() {
                $('#result-data').html('<span style="font-size: 150%; color: red;">Невозможно построить маршрут!</span>');
                if (!$('#yandex-delivery-result').is(":visible")) {
                    $('#yandex-delivery-result').toggle();
                }
                self._routing = false;
                $('#loader').toggle();
            });
        });
    };
    YandexDelivery.prototype.isPointInRerions = function(self, point) {
        var state = true;
        if (self.options.regionsAllowed.length !== 0) {
            state = false;
            self._regions.each(function(region) {
                if (ymaps.geoQuery(region).searchContaining(point).getLength() !== 0) {
                    state = true;
                }
            });
        }
        return state;
    };
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new YandexDelivery(this, options));
            }
        });
    };
})(jQuery, window, document);