jQuery(document).ready(function() {
    $("#map").yandexDelivery({
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
            //155262, // Псковская область
            //337422, // Санкт - Петербург
            //176095, // Ленинградская область
            81997, // Брянская область
            72224, // Орловская область
            72169, // Липецкая область
            72180, // Тамбовская область
            72182, // Пензенская область
            72196, // Республика Мордовия
            80513, // Чувашия
            //79374, // Татарстан
            115114, // Марий Эл
            71950 // Рязанская область
        ]
    });
});
(function($, window, document, undefined) {
    var pluginName = 'yandexDelivery',
        defaults = {
            center: [56.2, 40.6],
            address: null,
            companyName: null,
            regionsAllowed: []
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
        self._regions = null;
        this.init();
    }
    YandexDelivery.prototype.init = function() {
        var self = this,
            mapId = $(this.element).attr('id');
        $.getScript("http://api-maps.yandex.ru/2.1.14/?lang=ru_RU", function() {
            ymaps.ready(function() {
                self._deliveryMap = new ymaps.Map(mapId, {
                    center: self.options.center,
                    zoom: 5,
                    type: 'yandex#map',
                    behaviors: ['drag'],
                    controls: ['zoomControl']
                }),
                searchFinishPoint = new ymaps.control.SearchControl({
                    options: {
                        useMapBounds: true,
                        noCentering: true,
                        noPopup: false,
                        noPlacemark: true,
                        placeholderContent: 'Адрес конечной точки',
                        size: 'large',
                        float: 'none',
                        position: {
                            left: 10,
                            top: 10
                        }
                    }
                }),
                self._deliveryMap.controls.add(searchFinishPoint);
                searchFinishPoint.events.add('resultselect', function(e) {
                    var results = searchFinishPoint.getResultsArray(),
                        selected = e.get('index'),
                        point = results[selected].geometry.getCoordinates();
                    self.setFinishPoint(point);
                }).add('load', function(event) {
                    // По полю skip определяем, что это не дозагрузка данных.
                    // По getRusultsCount определяем, что есть хотя бы 1 результат.
                    if (!event.get('skip') && searchFinishPoint.getResultsCount()) {
                        self.searchFinishPoint.showResult(0);
                    }
                });
                if (self.options.regionsAllowed.length != 0) {
                    self.initRegionsFilter(self);
                }
                self._deliveryMap.events.add('click', self._onClick, self);
                if (self.options.address) {
                    self.initStartPoint(self);
                }
                self._myCollection = new ymaps.GeoObjectCollection();
                self._regions = new ymaps   .GeoObjectCollection();

                $(self.element).append('<div id="yandex-delivery-result" style="display: none;"></div>');
            });
        });
    };
    YandexDelivery.prototype._onClick = function(e) {
        if (this._start) {
            if (this._route) {
                this._deliveryMap.geoObjects.remove(this._route);
            }
            this.setFinishPoint(e.get('coords'));
        } else {
            if (this.options.address) {
                this.initStartPoint(self);
            } else {
                this.setStartPoint(e.get('coords'));
            }
        }
    };
    YandexDelivery.prototype._onDragEnd = function(e) {
        this.getDirection();
    }
    YandexDelivery.prototype.getDirection = function() {
        if (this._route) {
            this._myCollection.remove(this._route);
            this._route = null;
        }
        if (this._start && this._finish) {
            var self = this,
                start = this._start.geometry.getCoordinates(),
                finish = this._finish.geometry.getCoordinates();
            this.setDeliveryInformation(start, finish, this);
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
                balloonContent: this._companyName
            }, {
                preset: 'islands#greenStretchyIcon',
                balloonPanelMaxMapArea: 0,
            });
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
                iconContent: 'Точка доставки',
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
    YandexDelivery.prototype.calculate = function(len) {
        // Константы.
        var DELIVERY_TARIF = 20,
            MINIMUM_COST = 500;
        return Math.max(len * DELIVERY_TARIF, MINIMUM_COST);
    };
    YandexDelivery.prototype.initStartPoint = function(self) {
        function getAll(place, setStart) {
            ymaps.geocode(place).then(function(res) {
                setStart(res.geoObjects.get(0).geometry.getCoordinates());
            }, function(err) {
                alert('Ошибка');
            });
        }
        getAll(this.options.address, function(res) {
            self.setStartPoint(res);
        });
    }
    YandexDelivery.prototype.getBounds = function(self, start, finish) {
        var xDelta = Math.abs(start[0] - finish[0]) / 10,
            yDelta = Math.abs(start[1] - finish[1]) / 10,
            south = (start[1] < finish[1]) ? start[1] : finish[1],
            north = (start[1] < finish[1]) ? finish[1] : start[1],
            west = (start[0] < finish[0]) ? start[0] : finish[0],
            east = (start[0] < finish[0]) ? finish[0] : start[0],
            wsLine = new ymaps.Polyline([
                [west, south],
                [west - xDelta, south - yDelta]
            ]),
            enLine = new ymaps.Polyline([
                [east, north],
                [east + xDelta, north + yDelta]
            ]);
        self._myCollection.add(wsLine);
        self._myCollection.add(enLine);
        if (self._route) {
            self._myCollection.add(self._route);
        }
        self._deliveryMap.geoObjects.add(self._myCollection);
        self._deliveryMap.setBounds(self._myCollection.getBounds());
        self._myCollection.remove(wsLine);
        self._myCollection.remove(enLine);
    }
    YandexDelivery.prototype.initRegionsFilter = function(self) {
        ymaps.regions.load('RU', {
            lang: 'ru',
            quality: 0
        }).then(function(result) {
            var regions = result.geoObjects;
            regions.each(function(reg) {
                if (self.inArray(reg.properties.get('osmId'), self.options.regionsAllowed)) {
                    self._regions.add(new ymaps.GeoObject(reg, {
                        fillColor: '00B359',
                        strokeWidth: 1,
                        strokeColor: '00592c',
                        opacity: 0.15
                    }));
                }
            });
            self._regions.events.add('click', self._onClick, self);
            self._deliveryMap.geoObjects.add(self._regions);
        }, function() {
            //
        });
    }
    YandexDelivery.prototype.setDeliveryInformation = function(start, finish, self) {
        ymaps.geocode(start, {
            results: 1
        }).then(function(geocode) {
            var address = geocode.geoObjects.get(0) && geocode.geoObjects.get(0).properties.get('balloonContentBody') || '';
            ymaps.route([start, finish]).then(function(router) {
                var distance = Math.round(router.getLength() / 1000),
                    message = '<span>Расстояние: ' + distance + 'км.</span><br/>' + '<span style="font-weight: bold; font-style: italic">Стоимость доставки: %sр.</span>';
                self._route = router.getPaths();
                var localRoute = router.getPaths();
                self._route.options.set({
                    strokeWidth: 4,
                    strokeColor: '002311',
                    opacity: 0.7
                });
                //self._finish.properties.set('balloonContent', address + message.replace('%s', self.calculate(distance)));
                $('#yandex-delivery-result').html(address + message.replace('%s', self.calculate(distance)));
                $('#yandex-delivery-result').toggle();
                self.getBounds(self, start, finish);                
            }, function() {
                console.log('Unable to route');
            });
        });
    }
    YandexDelivery.prototype.inArray = function(value, array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] == value) return true;
        }
        return false;
    }
    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName, new YandexDelivery(this, options));
            }
        });
    }
})(jQuery, window, document)