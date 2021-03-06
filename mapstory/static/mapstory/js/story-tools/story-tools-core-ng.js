(function() {
    'use strict';

    var module = angular.module('storytools.core.ogc', [
    ]);

    // @todo - provisional default story pins style
    var defaultStyle = [new ol.style.Style({
        fill: new ol.style.Fill({color: 'rgba(255, 0, 0, 0.1)'}),
        stroke: new ol.style.Stroke({color: 'red', width: 1}),
        image: new ol.style.Circle({
            radius: 10,
            fill: new ol.style.Fill({color: 'rgba(255, 0, 0, 0.1)'}),
            stroke: new ol.style.Stroke({color: 'red', width: 1})
        })
    })];

    function StoryMap(data) {
        ol.Object.call(this, data);
        this.map_ = new ol.Map({target: data.target, pixelRatio: 1});
        this.overlay = new ol.FeatureOverlay({
            map: this.map_,
            style: defaultStyle
        });
        this.title = "Default Mapstory";
        this.abstract = "No Information Supplied.";
        this.owner = "";
        this.mode = "instant";

        this.storyLayers_ = new ol.Collection();
        this.animationDuration_ = data.animationDuration || 500;
        this.storyBoxesLayer = new StoryLayer({
            timeAttribute: 'start_time',
            endTimeAttribute: 'end_time',
            layer: new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: defaultStyle
            })
        });
        this.storyPinsLayer = new StoryLayer({
            timeAttribute: 'start_time',
            endTimeAttribute: 'end_time',
            layer: new ol.layer.Vector({
                source: new ol.source.Vector(),
                style: defaultStyle
            })
        });
        this.addStoryBoxesLayer();
        this.addStoryPinsLayer();
    }

    StoryMap.prototype = Object.create(ol.Object.prototype);
    StoryMap.prototype.constructor = StoryMap;

    StoryMap.prototype.addStoryBoxesLayer = function() {
        this.map_.addLayer(this.storyBoxesLayer.getLayer());
    };

    StoryMap.prototype.addStoryPinsLayer = function() {
        this.map_.addLayer(this.storyPinsLayer.getLayer());
    };

    StoryMap.prototype.setStoryOwner = function(storyOwner) {
       this.owner =  storyOwner;
    };

    StoryMap.prototype.getStoryOwner = function() {
       return this.owner;
    };

    StoryMap.prototype.setStoryTitle = function(storyTitle) {
       this.title =  storyTitle;
    };

    StoryMap.prototype.setMode = function(playbackMode) {
       this.mode =  playbackMode;
    };

    StoryMap.prototype.setStoryAbstract = function(storyAbstract) {
       this.abstract =  storyAbstract;
    };


    StoryMap.prototype.getStoryTitle = function() {
       return this.title;
    };

    StoryMap.prototype.getStoryAbstract = function() {
       return this.abstract;
    };


    StoryMap.prototype.setBaseLayer = function(baseLayer) {
        var self = this;
        this.set('baselayer', baseLayer);
        this.map_.getLayers().forEach(function(lyr) {
            if (lyr.get('group') === 'background') {
                this.map_.removeLayer(lyr);
            }
        }, this);
        this.map_.getLayers().insertAt(0, this.get('baselayer'));
        setTimeout(function(){self.map_.updateSize();}, 1);

    };

    StoryMap.prototype.addStoryLayer = function(storyLayer) {
        storyLayer.storyMap_ = this;
        this.storyLayers_.push(storyLayer);
        // keep pins layer on top
        var idx = this.map_.getLayers().getLength(), me = this;
        this.map_.getLayers().forEach(function(sl) {
            if (sl === me.storyPinsLayer) {
                idx -= 1;
            }
        });
        this.map_.getLayers().insertAt(
            idx,
            storyLayer.getLayer()
        );
    };

    StoryMap.prototype.reorderStoryLayer = function(position, storyLayer) {
        storyLayer.storyMap_ = this;
        var offset = 1;
        // keep pins layer on top
        var idx = this.map_.getLayers().getLength() - position - offset;
        var me = this;

        this.map_.getLayers().forEach(function(sl) {
            if (sl === me.storyPinsLayer) {
                idx -= 1;
            }

            console.log(" " + sl.get('title'));
        });

        this.map_.removeLayer(storyLayer.getLayer());

        this.map_.getLayers().insertAt(
            idx,
            storyLayer.getLayer()
        );
    };

    StoryMap.prototype.getStoryLayers = function() {
        return this.storyLayers_;
    };

    StoryMap.prototype.getMap = function() {
        return this.map_;
    };

    StoryMap.prototype.clear = function() {
        this.map_.getLayers().clear();
        this.storyLayers_.clear();
        this.addStoryPinsLayer();
    };

    StoryMap.prototype.animateCenterAndZoom = function(center, zoom) {
        var view = this.map_.getView();
        this.map_.beforeRender(ol.animation.pan({
            duration: this.animationDuration_,
            source: view.getCenter()
        }));
        view.setCenter(center);
        this.map_.beforeRender(ol.animation.zoom({
            resolution: view.getResolution(),
            duration: this.animationDuration_
        }));
        view.setZoom(zoom);
    };

    StoryMap.prototype.setAllowPan = function(allowPan) {
        this.map_.getInteractions().forEach(function(i) {
            if (i instanceof ol.interaction.KeyboardPan ||
                i instanceof ol.interaction.DragPan) {
                i.setActive(allowPan);
            }
        });
    };

    StoryMap.prototype.setAllowZoom = function(allowZoom) {
        var zoomCtrl;
        this.map_.getControls().forEach(function(c) {
            if (c instanceof ol.control.Zoom) {
                zoomCtrl = c;
            }
        });
        if (!allowZoom) {
            this.map_.removeControl(zoomCtrl);
        } else {
            this.map_.addControl(new ol.control.Zoom());
        }
        this.map_.getInteractions().forEach(function(i) {
            if (i instanceof ol.interaction.DoubleClickZoom ||
                i instanceof ol.interaction.PinchZoom ||
                i instanceof ol.interaction.DragZoom ||
                i instanceof ol.interaction.MouseWheelZoom) {
                i.setActive(allowZoom);
            }
        });
    };

    module.constant('StoryMap', StoryMap);

    function EditableStoryMap(data) {
        StoryMap.call(this, data);
    }

    EditableStoryMap.prototype = Object.create(StoryMap.prototype);
    EditableStoryMap.prototype.constructor = EditableStoryMap;

    module.constant('EditableStoryMap', EditableStoryMap);

    EditableStoryMap.prototype.getState = function() {
        var config = {};
        config.map = {
            center: this.map_.getView().getCenter(),
            projection: this.map_.getView().getProjection().getCode(),
            zoom: this.map_.getView().getZoom(),
            layers: []
        };

        config.boxes = [];

        config.about = {'title': this.title, 'abstract': this.abstract};

        var mapId = this.get('id');
        if (mapId >= 0) {
            config.id = mapId;
        }
        var baseLayer = this.get('baselayer');
        if (baseLayer) {
                       var baseLayerState = baseLayer;
            baseLayerState.group = 'background';
            baseLayerState.visibility = true;
            var props = baseLayerState.getProperties();
            delete props.source;

            //For Compatability with Geonode 2.4
            if(props.state.type === 'MapBox'){
                props.source = '3';
            }else if(props.state.type === 'OSM'){
                props.source = '1';
                props.type = 'OpenLayers.Layer.OSM';
            }else if(props.state.type === 'HOT'){
                props.source = '1';
                props.type = 'OpenLayers.Layer.OSM';
            }else if(props.state.type === 'MapQuest'){
                props.source = '2';
            }else if(props.state.type === 'WMS'){
                props.source = '1';
                props.type = 'OpenLayers.Layer.WMS';
            }

            if(props.state && props.state.name){
                props.name = props.state.name;
            }

            config.map.layers.push(props);

        }
        this.storyLayers_.forEach(function(storyLayer) {
            config.map.layers.push(storyLayer.getState());
        });
        return config;
    };

    EditableStoryMap.prototype.removeStoryLayer = function(storyLayer) {
        this.storyLayers_.remove(storyLayer);
        this.map_.removeLayer(storyLayer.getLayer());
    };

    EditableStoryMap.prototype.toggleStoryLayer = function(storyLayer) {
      var layer = storyLayer.getLayer();
      storyLayer.set('visibility', !layer.getVisible());
      layer.setVisible(!layer.getVisible());
    };

    function StoryLayer(data) {
        if (data.times && storytools.core.time.utils.isRangeLike(data.times)) {
            data.times = new storytools.core.time.utils.Interval(data.times);
        }
        ol.Object.call(this, data);
        var layer;
        if (this.get('type') === 'VECTOR') {
            layer = new ol.layer.Vector({source: new ol.source.Vector()});
        } else if (this.get('type') === 'HEATMAP') {
            layer = new ol.layer.Heatmap({
                radius: data.style.radius,
                opacity: data.style.opacity,
                source: new ol.source.Vector()
            });
        } else if (this.get('type') === 'WMS') {
            var config = {
                useOldAsInterimTiles: true
            };
            jQuery.extend(config, data);
            if (this.get('singleTile') === true) {
                layer = new ol.layer.Image(config);
            } else {
                layer = new ol.layer.Tile(config);
            }
        } else {
            layer = data.layer;
        }

        this.set('visibility', layer.getVisible());

        this.layer_ = layer;
    }

    StoryLayer.prototype = Object.create(ol.Object.prototype);
    StoryLayer.prototype.constructor = StoryLayer;

    StoryLayer.prototype.getStoryMap = function() {
        return this.storyMap_;
    };

    StoryLayer.prototype.setWMSSource = function() {
        var layer = this.getLayer();
        var name = this.get('name');
        var times = this.get('times');
        var singleTile = this.get('singleTile');
        var params = {
            'LAYERS': name,
            'VERSION': '1.1.0',
            'TILED': true
        };
        if (times) {
            params.TIME = new Date(times.start || times[0]).toISOString();
        }
        if (singleTile) {
            layer.setSource(new ol.source.ImageWMS({
                params: params,
                url: this.get('url'),
                serverType: 'geoserver'
            }));
        } else {
            var tileGrid, resolutions = this.get('resolutions'),
                bbox = this.get('bbox');
            if (resolutions && bbox) {
                tileGrid = new ol.tilegrid.TileGrid({
                    extent: bbox,
                    resolutions: resolutions
                });
            }
            // @todo use urls for subdomain loading
            layer.setSource(new ol.source.TileWMS({
                url: this.get('url'),
                params: params,
                tileGrid: tileGrid,
                serverType: 'geoserver'
            }));
        }
    };

    StoryLayer.prototype.getState = function() {
        var state = this.getProperties();
        delete state.features;
        return state;
    };

    StoryLayer.prototype.getLayer = function() {
        return this.layer_;
    };

    StoryLayer.prototype.setLayer = function(layer) {
        if (this.layer_ && this.storyMap_) {
            var map = this.storyMap_.map_;
            var idx = map.getLayers().getArray().indexOf(this.layer_);
            map.getLayers().setAt(idx, layer);
        }
        this.layer_ = layer;
    };

    module.constant('StoryLayer', StoryLayer);

    function EditableStoryLayer(data) {
        StoryLayer.call(this, data);
    }

    EditableStoryLayer.prototype = Object.create(StoryLayer.prototype);
    EditableStoryLayer.prototype.constructor = EditableStoryLayer;

    module.constant('EditableStoryLayer', EditableStoryLayer);

    module.service('stAnnotateLayer', ["$http", "$q", function($http, $q) {
        return {
            loadCapabilities: function(storyLayer) {
                var request = 'GetCapabilities', service = 'WMS';
                // always use the virtual service for GetCapabilities
                var url = storyLayer.get('url');
                if (url === '/geoserver/wms') {
                    var name = storyLayer.get('name');
                    var parts = name.split(':');
                    url = url.replace('/geoserver', '/geoserver/' + parts[0] + '/' + parts[1]);
                }
                return $http({
                    method: 'GET',
                    url: url,
                    params: {
                        'REQUEST': request,
                        'SERVICE': service,
                        'VERSION': '1.1.1',
                        'TILED': true
                    }
                }).success(function(data) {
                        var context = new owsjs.Jsonix.Context([
                            owsjs.mappings.WMSC_1_1_1
                        ]);
                        var unmarshaller = context.createUnmarshaller();
                        var caps = unmarshaller.unmarshalString(data);
                        var layer = caps.value.capability.layer;
                        storyLayer.set('latlonBBOX', [
                            parseFloat(layer.latLonBoundingBox.minx),
                            parseFloat(layer.latLonBoundingBox.miny),
                            parseFloat(layer.latLonBoundingBox.maxx),
                            parseFloat(layer.latLonBoundingBox.maxy)
                        ]);
                        var tileSets = caps.value.capability.vendorSpecificCapabilities.tileSet || [];
                        for (var i=0, ii=tileSets.length; i<ii; ++i) {
                            if (tileSets[i].srs === 'EPSG:900913') {
                                storyLayer.set('resolutions', tileSets[i].resolutions.split(' '));
                                var bbox = tileSets[i].boundingBox;
                                storyLayer.set('bbox', [
                                    parseFloat(bbox.minx),
                                    parseFloat(bbox.miny),
                                    parseFloat(bbox.maxx),
                                    parseFloat(bbox.maxy)
                                ]);
                                break;
                            }
                        }
                        var found = storytools.core.time.maps.readCapabilitiesTimeDimensions(caps);
                        var name = storyLayer.get('name');
                        if (name in found) {
                            storyLayer.set('times', found[name]);
                        }
                    });
            },
            describeFeatureType: function(storyLayer) {
                var me = this;
                var request = 'DescribeFeatureType', service = 'WFS';
                var id = storyLayer.get('id') || storyLayer.get('name') || 'unknown';
                return $http({
                    method: 'GET',
                    url: storyLayer.get('url'),
                    params: {
                        'SERVICE': service,
                        'VERSION': '1.0.0',
                        'REQUEST': request,
                        'TYPENAME': id
                    }
                }).success(function(data) {
                        var parser = new storytools.edit.WFSDescribeFeatureType.WFSDescribeFeatureType();
                        var layerInfo = parser.parseResult(data);
                        if (layerInfo.timeAttribute) {
                            storyLayer.set('timeAttribute', layerInfo.timeAttribute);
                        } else if (storyLayer.get('timeEndpoint')) {
                            me.getTimeAttribute(storyLayer);
                        }
                        var parts = id.split(':');
                        storyLayer.set('typeName', id);
                        storyLayer.set('featurePrefix', parts[0]);
                        storyLayer.set('featureNS', layerInfo.featureNS);
                        storyLayer.set('geomType', layerInfo.geomType);
                        storyLayer.set('attributes', layerInfo.attributes);
                    });
            },
            getTimeAttribute: function(storyLayer) {
                var me = this;
                return $http({
                    method: 'GET',
                    url: storyLayer.get('timeEndpoint')
                }).success(function(data) {
                        storyLayer.set('timeAttribute', data.attribute);
                        if (data.endAttribute) {
                            storyLayer.set('endTimeAttribute', data.endAttribute);
                        }
                    });
            },
            getStyleName: function(storyLayer) {
                //Disabling for now.
                //if (storyLayer.get('canStyleWMS')) {
                    var me = this;
                    return $http({
                        method: 'GET',
                        // Why do we need to use this endpoint? If not admin /geoserver/rest/layers fails 404
                        url: '/gs/rest/layers/' + storyLayer.get('id') + '.json'
                        //url: storyLayer.get('path') + 'rest/layers/' + storyLayer.get('id') + '.json'
                    }).success(function(response) {
                            storyLayer.set('styleName', response.layer.defaultStyle.name);
                        });
                //} else {
                //    return $q.when('');
                //}
            },
            getFeatures: function(storyLayer, map) {
                var name = storyLayer.get('id');
                var wfsUrl = storyLayer.get('url') + '?service=WFS&version=1.1.0&request=GetFeature&typename=' +
                    name + '&outputFormat=application/json' +
                    '&srsName=' + map.getView().getProjection().getCode();
                return $http({
                    method: 'GET',
                    url: wfsUrl
                }).success(function(response) {
                        var layer = storyLayer.getLayer();
                        var features = new ol.format.GeoJSON().readFeatures(response);
                        storyLayer.set('features', features);
                    });
            }
        };
    }]);

    module.service('stBaseLayerBuilder', function() {
        return {
            buildLayer: function(data) {
                if (data.type === 'MapQuest') {
                    return new ol.layer.Tile({
                        state: data,
                        name: data.title,
                        title: data.title,
                        group: 'background',
                        source: new ol.source.MapQuest({layer: data.layer})
                    });
                } else if (data.type === 'HOT') {
                    return new ol.layer.Tile({
                        state: data,
                        name: data.title,
                        title: data.title,
                        group: 'background',
                        source: new ol.source.OSM({
                            attributions: [
                                new ol.Attribution({
                                    html: 'Tiles courtesy of <a href="http://hot.openstreetmap.org/" target="_blank">Humanitarian OpenStreetMap Team</a>'
                                }),
                                ol.source.OSM.ATTRIBUTION
                            ],
                            crossOrigin: null,
                            url: 'http://{a-c}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
                        })
                    });
                } else if (data.type === 'OSM') {
                    return new ol.layer.Tile({
                        state: data,
                        name: data.title,
                        title: data.title,
                        group: 'background',
                        source: new ol.source.OSM()
                    });
                } else if (data.type === 'MapBox') {
                    var layer = new ol.layer.Tile({state: data, title: data.title, group: 'background'});
                    var name = data.name;
                    var urls = [
                        'http://a.tiles.mapbox.com/v1/mapbox.',
                        'http://b.tiles.mapbox.com/v1/mapbox.',
                        'http://c.tiles.mapbox.com/v1/mapbox.',
                        'http://d.tiles.mapbox.com/v1/mapbox.'
                    ];
                    var tileUrlFunction = function(tileCoord, pixelRatio, projection) {
                        var zxy = tileCoord;
                        if (zxy[1] < 0 || zxy[2] < 0) {
                            return "";
                        }
                        return urls[Math.round(Math.random()*3)] + name + '/' +
                            zxy[0].toString()+'/'+ zxy[1].toString() +'/'+
                            zxy[2].toString() +'.png';
                    };
                    layer.setSource(new ol.source.TileImage({
                        crossOrigin: null,
                        attributions: [
                            new ol.Attribution({
                                html: /^world/.test(name) ?
                                    "<a href='http://mapbox.com'>MapBox</a> | Some Data &copy; OSM CC-BY-SA | <a href='http://mapbox.com/tos'>Terms of Service</a>" :
                                    "<a href='http://mapbox.com'>MapBox</a> | <a href='http://mapbox.com/tos'>Terms of Service</a>"
                            })
                        ],
                        tileGrid: new ol.tilegrid.TileGrid({
                            origin: [-128 * 156543.03390625, -128 * 156543.03390625],
                            resolutions: [
                                156543.03390625, 78271.516953125, 39135.7584765625,
                                19567.87923828125, 9783.939619140625, 4891.9698095703125,
                                2445.9849047851562, 1222.9924523925781, 611.4962261962891,
                                305.74811309814453, 152.87405654907226, 76.43702827453613,
                                38.218514137268066, 19.109257068634033, 9.554628534317017,
                                4.777314267158508, 2.388657133579254, 1.194328566789627,
                                0.5971642833948135
                            ]
                        }),
                        tileUrlFunction: tileUrlFunction
                    }));
                    return layer;
                } else if (data.type === 'WMS') {
                    return new ol.layer.Tile({
                        group: "background",
                        source: new ol.source.TileWMS({
                            url: data.url,
                            params: data.params
                        })
                    });
                } else {
                    throw new Error('no type for : ' + JSON.stringify(data));
                }
            }
        };
    });

    module.service('stEditableLayerBuilder', ["$q", "stAnnotateLayer", "stBaseLayerBuilder", function($q, stAnnotateLayer, stBaseLayerBuilder) {
        return {
            buildEditableLayer: function(data, map) {
                var layer = new EditableStoryLayer(data);
                var deferred = $q.defer();
                var promises = [];
                // TODO add this back when we have WMS-C GetCaps
                var needsCaps = !(data.latlonBBOX && data.times/* && data.bbox && data.resolutions*/);
                if (needsCaps) {
                    promises.push(stAnnotateLayer.loadCapabilities(layer));
                }
                var needsDFT = !data.attributes;
                if (needsDFT) {
                    promises.push(stAnnotateLayer.describeFeatureType(layer));
                }
                if ((data.type === 'VECTOR' || data.type === 'HEATMAP') && !data.features) {
                    promises.push(stAnnotateLayer.getFeatures(layer, map));
                } else {
                    promises.push(stAnnotateLayer.getStyleName(layer));
                }
                $q.all(
                        promises
                    ).then(function() {
                        // this needs to be done here when everything is resolved
                        if (layer.get('features')) {
                            var times = layer.get('times');
                            if (times) {
                                var start = times.start || times[0];
                                storytools.core.time.maps.filterVectorLayer(layer, {start: start, end: start});
                            } else {
                                olLayer.getSource().addFeatures(layer.get('features'));
                            }
                        } else {
                            layer.setWMSSource();
                        }
                        deferred.resolve(layer);
                    }, function() {
                        deferred.reject(arguments);
                    });
                return deferred.promise;
            }
        };
    }]);

    module.service('stLayerBuilder', ["$q", function($q) {
        return {
            buildLayer: function(data, map) {
                var layer = new StoryLayer(data);
                var deferred = $q.defer();
                layer.setWMSSource();
                deferred.resolve(layer);
                return deferred.promise;
            }
        };
    }]);

    module.service('stStoryMapBaseBuilder', ["stBaseLayerBuilder", function(stBaseLayerBuilder) {
        return {
            defaultMap: function(storymap) {
                storymap.getMap().setView(new ol.View({center: [0,0], zoom: 3}));
                this.setBaseLayer(storymap, {
                    title: 'OpenStreetMap',
                    type: 'OSM',
                    layer: 'OSM',
                    name: 'OpenStreetMap'
                });
            },
            setBaseLayer: function(storymap, data) {
                var baseLayer = stBaseLayerBuilder.buildLayer(data);
                storymap.setBaseLayer(baseLayer);
            }
        };
    }]);

    module.service('stStoryMapBuilder', ["stLayerBuilder", "stStoryMapBaseBuilder", function(stLayerBuilder, stStoryMapBaseBuilder) {
        return {
            modifyStoryMap: function(storymap, data) {
                storymap.clear();
                var mapConfig = storytools.mapstory.MapConfigTransformer.MapConfigTransformer(data);
                if (mapConfig.id >= 0) {
                    storymap.set('id', mapConfig.id);
                    storymap.setStoryTitle(mapConfig.about.title);
                    storymap.setStoryAbstract(mapConfig.about.abstract);
                    storymap.setStoryOwner(mapConfig.about.owner);
                    storymap.setMode(mapConfig.playbackMode);
                }
                for (var i = 0, ii = mapConfig.map.layers.length; i < ii; ++i) {
                    var layerConfig = mapConfig.map.layers[i];
                    if (layerConfig.group === 'background' && layerConfig.visibility === true) {
                        stStoryMapBaseBuilder.setBaseLayer(storymap, layerConfig);
                    }else if(layerConfig.group === undefined && layerConfig.id === undefined && layerConfig.title === undefined && layerConfig.name === undefined){

                          console.log("WARNING: Something is wrong with this layer.");
                          console.log(layerConfig);


                    } else {
                        /*jshint loopfunc: true */
                        stLayerBuilder.buildLayer(layerConfig, storymap.getMap()).then(function(sl) {
                            // TODO insert at the correct index
                            storymap.addStoryLayer(sl);
                        });
                    }
                }
                storymap.getMap().setView(new ol.View({
                    center: mapConfig.map.center,
                    zoom: mapConfig.map.zoom,
                    projection: mapConfig.map.projection
                }));

                storymap.getMap().updateSize();
            }
        };
    }]);

    module.service('stEditableStoryMapBuilder', ["stStoryMapBaseBuilder", "stEditableLayerBuilder", function(stStoryMapBaseBuilder, stEditableLayerBuilder) {
        return {
            modifyStoryLayer: function(storylayer, newType) {
                var data = storylayer.getProperties();
                var storymap = storylayer.getStoryMap();
                data.type = newType ? newType : ((data.type === 'WMS') ? 'VECTOR' : 'WMS');
                if (data.type === 'WMS') {
                    delete data.features;
                }
                stEditableLayerBuilder.buildEditableLayer(data, storymap.getMap()).then(function(sl) {
                    // sequence is important here, first change layer, then the type.
                    storylayer.setLayer(sl.getLayer());
                    storylayer.set('type', sl.get('type'));
                });
            },
            modifyStoryMap: function(storymap, data) {
                storymap.clear();
                var mapConfig = storytools.mapstory.MapConfigTransformer.MapConfigTransformer(data);
                if (mapConfig.id >= 0) {
                    storymap.set('id', mapConfig.id);
                    storymap.setStoryTitle(mapConfig.about.title);
                    storymap.setStoryAbstract(mapConfig.about.abstract);
                    storymap.setStoryOwner(mapConfig.about.owner);
                }
                for (var i = 0, ii = mapConfig.map.layers.length; i < ii; ++i) {
                    var layerConfig = mapConfig.map.layers[i];
                    if (layerConfig.group === 'background' && layerConfig.visibility === true) {
                        stStoryMapBaseBuilder.setBaseLayer(storymap, layerConfig);
                    }else if(layerConfig.group === undefined && layerConfig.id === undefined && layerConfig.title === undefined && layerConfig.name === undefined){

                          console.log("WARNING: Something is wrong with this layer.");
                          console.log(layerConfig);


                    }else {
                        /*jshint loopfunc: true */
                        stEditableLayerBuilder.buildEditableLayer(layerConfig, storymap.getMap()).then(function(sl) {
                            // TODO insert at the correct index
                            storymap.addStoryLayer(sl);
                        });
                    }
                }
                storymap.getMap().setView(new ol.View({
                    center: mapConfig.map.center,
                    zoom: mapConfig.map.zoom,
                    projection: mapConfig.map.projection
                }));
            }
        };
    }]);

})();

(function() {
    'use strict';

    var module = angular.module('storytools.core.mapstory', [
    ]);

    // @todo naive implementation on local storage for now
    module.service('stMapConfigStore', function() {
        function path(mapid) {
            return '/maps/' + mapid;
        }
        function get(mapid) {
            var saved = localStorage.getItem(path(mapid));
            saved = (saved === null) ? {} : angular.fromJson(saved);
            return saved;
        }
        function set(mapConfig) {
            localStorage.setItem(path(mapConfig.id), angular.toJson(mapConfig));
        }
        function list() {
            var maps = [];
            var pattern = new RegExp('/maps/(\\d+)$');
            Object.getOwnPropertyNames(localStorage).forEach(function(key) {
                var match = pattern.exec(key);
                if (match) {
                    // name/title eventually
                    maps.push({
                        id: match[1]
                    });
                }
            });
            return maps;
        }
        function nextId() {
            var lastId = 0;
            var existing = list().map(function(m) {
                return m.id;
            });
            existing.sort();
            if (existing.length) {
                lastId = parseInt(existing[existing.length - 1]);
            }
            return lastId + 1;
        }
        return {
            listMaps: function() {
                return list();
            },
            loadConfig: function(mapid) {
                return get(mapid);
            },
            saveConfig: function(mapConfig) {
                if (!angular.isDefined(mapConfig.id)) {
                    mapConfig.id = nextId();
                }
                set(mapConfig);
            }
        };
    });

})();

(function() {
    'use strict';

    var module = angular.module('storytools.core.pins', [
    ]);

    var pins = storytools.core.maps.pins;

    function StoryPinLayerManager() {
        this.storyPins = [];
    }
    StoryPinLayerManager.prototype.pinsChanged = function(pins, action) {
        var i;
        if (action == 'delete') {
            for (i = 0; i < pins.length; i++) {
                var pin = pins[i];
                for (var j = 0, jj = this.storyPins.length; j < jj; j++) {
                    if (this.storyPins[j]._id == pin._id) {
                        this.storyPins.splice(j, 1);
                        break;
                    }
                }
            }
        } else if (action == 'add') {

            var maxId = new Date().getTime();
            this.storyPins.forEach(function(b) {
                maxId = Math.max(maxId, b._id);
            });

            for (i = 0; i < pins.length; i++) {

                pin = pins[i];

                if (typeof pin._id === 'undefined' || pin._id === null) {
                        pin._id = ++maxId;
                }

                this.storyPins.push(pins[i]);
            }
        } else if (action == 'change') {
            for (i = 0; i < pins.length; i++) {
                pin = pins[i];
                for (var x = 0, xx = this.storyPins.length; x < xx; x++) {
                    if (this.storyPins[x]._id == box._id) {
                        this.storyPins[x]= box;
                        break;
                    }
                }
            }
        } else {
            throw new Error('action? :' + action);
        }
        // @todo optimize by looking at changes
        var times = this.storyPins.map(function(p) {
            if (p.start_time > p.end_time) {
                return storytools.core.utils.createRange(p.end_time, p.start_time);
            } else {
                return storytools.core.utils.createRange(p.start_time, p.end_time);
            }
        });
        this.storyPinsLayer.set('times', times);
        this.storyPinsLayer.set('features', this.storyPins);
    };
    StoryPinLayerManager.prototype.loadFromGeoJSON = function(geojson, projection) {
        if (geojson && geojson.features) {
            var loaded = pins.loadFromGeoJSON(geojson, projection);
            this.pinsChanged(loaded, 'add', true);
        }
    };

    module.service('StoryPinLayerManager', StoryPinLayerManager);

    module.constant('StoryPin', pins.StoryPin);

    module.service('stAnnotationsStore', ["StoryPinLayerManager", function(StoryPinLayerManager) {
       function path(mapid) {
            return '/maps/' + mapid + '/annotations';
        }
        function get(mapid) {
            var saved = localStorage.getItem(path(mapid));
            saved = (saved === null) ? [] : JSON.parse(saved);
            return saved;
        }
        function set(mapid, annotations) {
            localStorage.setItem(path(mapid),
                new ol.format.GeoJSON().writeFeatures(annotations,
                    {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})
            );
        }
        return {
            loadAnnotations: function(mapid, projection) {
                return StoryPinLayerManager.loadFromGeoJSON(get(mapid), projection);
            },
            deleteAnnotations: function(annotations) {
                var saved = get();
                var toDelete = annotations.map(function(d) {
                    return d.id;
                });
                saved = saved.filter(function(s) {
                    return toDelete.indexOf(s.id) < 0;
                });
                set(saved);
            },
            saveAnnotations: function(mapid, annotations) {
               var saved = get();
                var maxId = 0;
                saved.forEach(function(s) {
                    maxId = Math.max(maxId, s.id);
                });
                var clones = [];
                annotations.forEach(function(a) {
                    if (typeof a.id == 'undefined') {
                        a.id = ++maxId;
                    }
                    var clone = a.clone();
                    if (a.get('start_time') !== undefined) {
                        clone.set('start_time', a.get('start_time')/1000);
                    }
                    if (a.get('end_time') !== undefined) {
                        clone.set('end_time', a.get('end_time')/1000);
                    }
                    clones.push(clone);
                });
                set(mapid, clones);
            }
        };
    }]);



    module.service('stAnnotationService', ['$http',"StoryPinLayerManager", function($http, StoryPinLayerManager) {
        function path(mapid) {
            return '/maps/' + mapid + '/annotations';
        }
        return {
            loadAnnotations: function(mapid, projection) {
                return StoryPinLayerManager.loadFromGeoJSON(get(mapid), projection);
            },
            deleteAnnotations: function(mapid, annotations) {

                var toDelete = annotations.map(function(d) {
                    return d.id;
                });

                return $http.post(path(mapid), toDelete).success(function(data) {
                    return "success";
                });
            },
            saveAnnotations: function(mapid, annotations) {
                var clones = [];
                annotations.forEach(function(a) {
                    var clone = a.clone();
                    if (a.get('start_time') !== undefined) {
                        clone.set('start_time', a.get('start_time')/1000);
                    }
                    if (a.get('end_time') !== undefined) {
                        clone.set('end_time', a.get('end_time')/1000);
                    }
                    clones.push(clone);
                });
                return $http.post(path(mapid),   new ol.format.GeoJSON().writeFeatures(clones,
                        {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})).success(function(data) {
                        return "success";
                    });
            }
        };
    }]);
})();

(function() {
    'use strict';

    angular.module('storytools.core.style', [
        'storytools.core.style.ol3StyleConverter',
        'storytools.core.style.svgIcon'
    ]);

})();
(function() {
    'use strict';

    var module = angular.module('storytools.core.style.ol3StyleConverter', []);

    module.factory('ol3MarkRenderer', ["ol3StyleConverter", function(ol3StyleConverter) {
        return function(shapeName, size) {
            var black = ol3StyleConverter.getColor('#000000');
            var strokeWidth = 3; // hack to fix down-scaling for x and cross
            var opts = {color: black, width: strokeWidth};
            var canvas = angular.element(ol3StyleConverter.generateShape({
                    symbol: {shape: shapeName, size: size - strokeWidth}
                },
                new ol.style.Fill(opts),
                new ol.style.Stroke(opts)).getImage());
            return canvas;
        };
    }]);

    module.factory('ol3StyleConverter', ["stSvgIcon", function(stSvgIcon) {
        return {
            generateShapeConfig: function(style, fill, stroke) {
                var shape = style.symbol.shape,
                    // final size is actually (2 * (radius + stroke.width)) + 1
                    radius = style.symbol.size / 2;
                if (shape === 'circle') {
                    return {
                        fill: fill,
                        stroke: stroke,
                        radius: radius
                    };
                } else if (shape === 'square') {
                    return {
                        fill: fill,
                        stroke: stroke,
                        points: 4,
                        radius: radius,
                        angle: Math.PI / 4
                    };
                } else if (shape === 'triangle') {
                    return {
                        fill: fill,
                        stroke: stroke,
                        points: 3,
                        radius: radius,
                        angle: 0
                    };
                } else if (shape === 'star') {
                    return {
                        fill: fill,
                        stroke: stroke,
                        points: 5,
                        radius: radius,
                        radius2: 0.5*radius,
                        angle: 0
                    };
                } else if (shape === 'cross') {
                    return {
                        fill: fill,
                        stroke: stroke,
                        points: 4,
                        radius: radius,
                        radius2: 0,
                        angle: 0
                    };
                } else if (shape === 'x') {
                    return {
                        fill: fill,
                        stroke: stroke,
                        points: 4,
                        radius: radius,
                        radius2: 0,
                        angle: Math.PI / 4
                    };
                }
            },
            calculateRotation: function(style, feature) {
                if (style.symbol && style.symbol.rotationAttribute) {
                    if (style.symbol.rotationUnits === 'radians') {
                        return feature.get(style.symbol.rotationAttribute);
                    } else {
                        return (feature.get(style.symbol.rotationAttribute)/360)*Math.PI;
                    }
                } else {
                    return undefined;
                }
            },
            generateShape: function(style, fill, stroke, feature) {
                var config = this.generateShapeConfig(style, fill, stroke);
                if (config && feature) {
                    config.rotation = this.calculateRotation(style, feature);
                }
                if (style.symbol.graphic) {
                    var info = stSvgIcon.getImage(style.symbol.graphic, fill.getColor(), stroke.getColor(), true);
                    return new ol.style.Icon({
                        src: info.dataURI,
                        rotation: this.calculateRotation(style, feature),
                        scale: style.symbol.size / Math.max(info.width, info.height),
                        opacity: style.symbol.opacity
                    });
                } else if (style.symbol.shape === 'circle') {
                    return new ol.style.Circle(config);
                } else {
                    return new ol.style.RegularShape(config);
                }
            },
            getText: function(style, feature) {
                if (style.label && style.label.attribute) {
                    return '' + feature.get(style.label.attribute);
                } else {
                    return undefined;
                }
            },
            generateText: function(style, stroke, feature) {
                if (style.label && style.label.attribute !== null) {
                    return new ol.style.Text({
                        fill: new ol.style.Fill({color: style.label.fillColor}),
                        stroke: stroke,
                        font: style.label.fontStyle + ' ' + style.label.fontWeight + ' ' + style.label.fontSize + 'px ' + style.label.fontFamily,
                        text: this.getText(style, feature)
                    });
                }
            },
            getColor: function(color, opacity) {
                var rgba = ol.color.asArray(color);
                if (opacity !== undefined) {
                    rgba = rgba.slice();
                    rgba[3] = opacity/100;
                }
                return 'rgba(' + rgba.join(',') + ')';
            },
            generateCacheKey: function(style, feature) {
                var text = this.getText(style, feature);
                var classify = (style.classify && style.classify.attribute) ? feature.get(style.classify.attribute) : undefined;
                var rotation = (style.symbol && style.symbol.rotationAttribute) ? feature.get(style.symbol.rotationAttribute): undefined;
                return text + '|' + classify + '|' + rotation;
            },
            generateStyle: function(style, feature, resolution) {
                var result, key2;
                if (!this.styleCache_) {
                    this.styleCache_ = {};
                }
                var key = JSON.stringify(style);
                if (this.styleCache_[key]) {
                    if (!this.styleCache_[key].length) {
                        key2 = this.generateCacheKey(style, feature);
                        if (this.styleCache_[key][key2]) {
                            return this.styleCache_[key][key2];
                        }
                    } else {
                        return this.styleCache_[key];
                    }
                }
                var stroke;
                if (style.stroke) {
                    var lineDash;
                    if (style.stroke.strokeStyle === 'dashed') {
                        lineDash = [5];
                    } else if (style.stroke.strokeStyle === 'dotted') {
                        lineDash = [1,2];
                    }
                    stroke = new ol.style.Stroke({
                        lineDash: lineDash,
                        color: this.getColor(style.stroke.strokeColor, style.stroke.strokeOpacity),
                        width: style.stroke.strokeWidth
                    });
                }
                if (style.classify && style.classify.attribute !== null) {
                    var label;
                    for (var i=0, ii=style.rules.length; i<ii; ++i) {
                        var rule = style.rules[i];
                        var attrVal = feature.get(style.classify.attribute);
                        var match = false;
                        if (rule.value !== undefined) {
                            match = attrVal === rule.value;
                        } else if (rule.range) {
                            match = (attrVal >= rule.range.min && attrVal <= rule.range.max);
                        }
                        if (match) {
                            label = this.generateText(style, stroke, feature);
                            if (style.geomType === 'point' && rule.style.symbol.fillColor) {
                                result = [new ol.style.Style({
                                    text: label,
                                    image: this.generateShape(style, new ol.style.Fill({color: rule.style.symbol.fillColor}), stroke, feature)
                                })];
                            } else if (style.geomType === 'line' && rule.style.stroke.strokeColor) {
                                result = [new ol.style.Style({
                                    text: label,
                                    stroke: new ol.style.Stroke({
                                        color: rule.style.stroke.strokeColor,
                                        width: 2
                                    })
                                })];
                            } else if (style.geomType === 'polygon' && rule.style.symbol.fillColor) {
                                result = [new ol.style.Style({
                                    text: label,
                                    stroke: stroke,
                                    fill: new ol.style.Fill({
                                        color: rule.style.symbol.fillColor
                                    })
                                })];
                            }
                        }
                    }
                    if (result) {
                        if (!this.styleCache_[key]) {
                            this.styleCache_[key] = {};
                        }
                        key2 = this.generateCacheKey(style, feature);
                        this.styleCache_[key][key2] = result;
                    }
                } else {
                    var fill = new ol.style.Fill({
                        color: this.getColor(style.symbol.fillColor, style.symbol.fillOpacity)
                    });
                    result = [
                        new ol.style.Style({
                            image: this.generateShape(style, fill, stroke, feature),
                            fill: fill,
                            stroke: stroke,
                            text: this.generateText(style, stroke, feature)
                        })
                    ];
                }
                if (result) {
                    var hasText = result[0].getText();
                    if (hasText || (style.classify && style.classify.attribute) || (style.symbol && style.symbol.rotationAttribute)) {
                        if (!this.styleCache_[key]) {
                            this.styleCache_[key] = {};
                        }
                        key2= this.generateCacheKey(style, feature);
                        this.styleCache_[key][key2] = result;
                    } else {
                        this.styleCache_[key] = result;
                    }
                }
                return result;
            }
        };
    }]);
})();

(function() {
    'use strict';

    var module = angular.module('storytools.core.style.svgIcon', []);

    module.factory('stSvgIcon', ["$cacheFactory", "$http", "$q", "$log", function($cacheFactory, $http, $q, $log) {
        var element = angular.element(document.createElement('div'));
        var imageCache = $cacheFactory('stSvgImage');
        var dataCache = $cacheFactory('stSvgData');
        function process(svg, fill, stroke) {
            element.html(svg);
            // @todo make smarter
            ['path', 'polygon', 'circle', 'ellipse', 'rect', 'line', 'polyline'].forEach(function(el) {
                angular.forEach(element.find(el), function(e) {
                    // @todo does it make sense to override stroke width?
                    e = angular.element(e);
                    var css = {
                        opacity: 1
                    };
                    var existingFill = e.css('fill') || e.attr('fill') || '';
                    if (existingFill != 'none' && existingFill != 'rgb(255, 255, 255)' && existingFill.toLowerCase() != '#ffffff') {
                        css.fill = fill;
                    }
                    var existingStroke = e.css('stroke') || e.attr('stroke');
                    if (existingStroke != 'none') {
                        css.stroke = stroke;
                    }
                    e.css(css);
                });
            });
            var root = element.find('svg');
            var width = parseInt(root.attr('width'));
            var height = parseInt(root.attr('height'));
            // ugh - we're totally guessing here but things go badly without:
            // on firefox: ns_error_not_available on calling canvas.drawimage
            // on chrome: very large icon (default size as it renders)
            // we might be able to set the src on an img element and figure this out...
            if (isNaN(width) || isNaN(height)) {
                root.attr('width', 64);
                root.attr('height', 64);
                width = 64;
                height = 64;
            }
            var dataURI = 'data:image/svg+xml;base64,' + btoa(element.html());
            return {
                dataURI: dataURI,
                width: width,
                height: height
            };
        }
        return {
            getImage: function(svgURI, fill, stroke, sync) {
                var key = svgURI + fill + stroke;
                var cached = imageCache.get(key);
                var deferred = $q.defer();
                if (cached) {
                    if (sync) {
                        return cached;
                    }
                    deferred.resolve(cached);
                } else {
                    if (sync) {
                        var svg = dataCache.get(svgURI);
                        if (svg) {
                            var imageInfo = process(svg, fill, stroke);
                            imageInfo.uri = svgURI;
                            imageCache.put(key, imageInfo);
                            return imageInfo;
                        }
                        $log.warning('no svg for', svgURI);
                        return null;
                    }
                    this.getImageData(svgURI).then(function(response) {
                        var imageInfo = process(response.data, fill, stroke);
                        imageInfo.uri = svgURI;
                        imageCache.put(key, imageInfo);
                        deferred.resolve(imageInfo);
                    }, function() {
                        deferred.reject('error');
                    });
                }
                return deferred.promise;
            },
            getImageData: function(svgURI) {
                return $http.get(svgURI, {cache: true}).success(function(response) {
                    dataCache.put(svgURI, response);
                    return response;
                }).error(function() {
                    $log.warn('error fetching ' + svgURI);
                });
            }
        };
    }]);

})();

(function() {
    'use strict';

    /**
     * @namespace storytools.core.time.directives
     */
    var module = angular.module('storytools.core.time.directives', []);

    /**
     * @ngdoc directive
     * @name stPlaybackControls
     * @memberOf storytools.core.time.directives
     * @description
     * Directive that presents playback controls to manipulate the provided
     * TimeController instance.
     *
     * @param {TimeController} time-controls attribute
     */
    module.directive('stPlaybackControls', function() {
        return {
            restrict: 'E',
            templateUrl: 'time/playback-controls.html',
            scope: {
                timeControls: '='
            },
            link: function (scope, elem) {
                scope.playText = "Start";
                scope.loopText = "Enable Loop";
                scope.loop = false;
                scope.storyBoxText = "";
                scope.showTimeLine = false;
                scope.next = function () {
                    scope.timeControls.next();
                };
                scope.prev = function () {
                    scope.timeControls.prev();
                };
                scope.$watch('timeControls', function (neu, old) {
                    if (neu !== old) {
                        neu.on('stateChange', function () {
                            var started = scope.timeControls.isStarted();
                            scope.started = started;
                            scope.playText = started ? "Stop" : "Start";
                            scope.$apply();
                        });
                        neu.on('rangeChange', function (range) {
                            var tc = scope.timeControls;
                            var element = $('#story-box-title');
                            element.empty();
                            element.append(tc.getCurrentBox().get('title'));

                            var el = $('#story-box-description');
                            el.empty();
                            el.append(tc.getCurrentBox().get('description'));

                            scope.currentRange = range;
                            scope.$apply();
                        });
                    }
                });
                scope.play = function () {
                    var tc = scope.timeControls;

                    var started = tc.isStarted();
                    if (started) {
                        tc.stop();
                    } else {
                        tc.start();
                    }
                };
                scope.toggleLoop = function () {
                    var tc = scope.timeControls;
                    scope.loop = tc.loop = !tc.loop;
                    scope.loopText = tc.loop ? 'Disable Loop' : 'Enable Loop';
                };

                scope.toggleTimeLine = function () {
                    var tc = scope.timeControls;
                    scope.showTimeLine = tc.showTimeLine = !tc.showTimeLine;
                    var element = $('#timeline');

                    if(tc.showTimeLine) {
                        element.show( "slow" );

                    } else {
                        element.hide("slow");
                    }
                };
            }
        };
    });

    /**
     * @ngdoc directive
     * @name stPlaybackSettings
     * @memberOf storytools.core.time.directives
     * @description
     * Directive that presents playback settings that manipulate the provided
     * TimeController instance.
     *
     * @param {TimeController} time-controls attribute
     * @param {object} playbackOptions (will go away)
     */
    module.directive('stPlaybackSettings', function () {
        return {
            restrict: 'E',
            templateUrl: 'time/playback-settings.html',
            scope: {
                timeControls: '=',
                // @todo remove once timeControls properly exposes access to this
                playbackOptions: '='
            },
            link: function (scope, elem) {
                scope.optionsChanged = function () {
                    var ctrl = scope.timeControls || scope.$parent.timeControls;
                    if (ctrl) {
                        ctrl.update(scope.playbackOptions);
                    }
                };
            }
        };
    });

})();
(function() {
    'use strict';

    var module = angular.module('storytools.core.time', [
        'storytools.core.time.directives',
        'storytools.core.time.services',
        'storytools.core.templates'
    ]);

    module.filter('isodate', function() {
        // @todo should support optional precision specifier (as unit?)
        return function(input) {
            return input !== null && angular.isDefined(input)  ?
                angular.isNumber(input) ? new Date(input).toISOString():
                    Date.parse(input).toISOString():
                    '';
        };
    });

})();
(function() {
    'use strict';

    var module = angular.module('storytools.core.time.services', []);

    var stutils = storytools.core.time.utils;

    /**
     * Compute a sorted, unique array of ticks for the provided layers. The
     * algorithm uses any provided instant or extent(start value used) list values
     * and looks at the total range of all interval values creating a tick at the
     * minimum interval for the total range. See the tests for examples.
     * @param {array|ol.Map} layersWithTime
     * @returns array of ticks
     */
    function computeTicks(layersWithTime) {
        // allow a map to be passed in
        if (!angular.isArray(layersWithTime)) {
            var storyMap = layersWithTime;
            layersWithTime = storyMap.getStoryLayers().getArray().filter(function(l) {
                var times = l.get('times');
                /*jshint eqnull:true */
                return times != null;
            });
            layersWithTime.push(storyMap.storyPinsLayer);
            layersWithTime.push(storyMap.storyBoxesLayer);
        }
        var ticks = {};
        var totalRange = null;
        var intervals = [];
        function addTick(add) {
            add = stutils.getTime(add);
            if (add !== null && ! (add in ticks)) {
                ticks[add] = 1;
            }
        }
        layersWithTime.forEach(function(l) {
            var times = l.get('times');
            var range;
            if (angular.isArray(times)) {
                // an array of instants or extents
                range = stutils.computeRange(times);
                if (times.length) {
                    if (stutils.isRangeLike(times[0])) {
                        times.forEach(function(r) {
                            addTick(r.start);
                            if (totalRange === null) {
                                totalRange = stutils.createRange(r);
                            } else {
                                totalRange.extend(r);
                            }
                        });
                    } else {
                        times.forEach(function(r) {
                            addTick(r);
                        });
                    }
                }
                // add a tick at the end to ensure we get there
                /*jshint eqnull:true */
                if (range.end != null) {
                    addTick(range.end);
                }
            } else if (times) {
                // a interval (range+duration)
                range = times;
                intervals.push(times);
            }
            if (totalRange === null) {
                // copy, will be modifying
                totalRange = stutils.createRange(range);
            } else {
                totalRange.extend(range);
            }
        });
        if (intervals.length) {
            intervals.sort(function(a, b) {
                return a.interval - b.interval;
            });
            var smallest = intervals[0];
            var start = totalRange.start;
            while (start <= totalRange.end) {
                addTick(start);
                start = smallest.offset(start);
            }
        }
        ticks = Object.getOwnPropertyNames(ticks).map(function(t) {
            return parseInt(t);
        });
        return ticks.sort(function(a, b) {
            return a - b;
        });
    }

    function TimeControlsManager($log, $rootScope, StoryPinLayerManager, StoryBoxLayerManager, MapManager) {
        this.timeControls = null;
        var timeControlsManager = this;

        function maybeCreateTimeControls(update) {
            $log.debug("Creating TimeControls with boxes: ");
            $log.debug(StoryBoxLayerManager.storyBoxes);

            if (timeControlsManager.timeControls !== null) {
                if (update) {
                    var values = update();
                    if (values) {
                        timeControlsManager.timeControls.update(values);
                    }else{
                        timeControlsManager.timeControls.reset();
                    }
                }
                return;
            }
            var range = computeTicks(MapManager.storyMap);
            if (range.length) {
                var annotations = StoryPinLayerManager.storyPins;
                var boxes = StoryBoxLayerManager.storyBoxes;
                timeControlsManager.timeControls = storytools.core.time.create({
                    annotations: annotations,
                    boxes: boxes,
                    storyMap: MapManager.storyMap,
                    data: range,
                    mode: MapManager.storyMap.mode,
                    tileStatusCallback: function(remaining) {
                        $rootScope.$broadcast('tilesLoaded', remaining);
                    }
                });
                timeControlsManager.timeControls.on('rangeChange', function(range) {
                    timeControlsManager.currentRange = range;
                });
            }
        }

        MapManager.storyMap.getStoryLayers().on('change:length', function() {
            maybeCreateTimeControls(function() {
                var range = computeTicks(MapManager.storyMap);
                if (range.length) {
                    return {
                        data: range
                    };
                }
            });
        });

        var boxesLayer = MapManager.storyMap.storyBoxesLayer;
        var pinsLayer = MapManager.storyMap.storyPinsLayer;
        pinsLayer.on('change:features', function() {
            maybeCreateTimeControls(function() {
                var range = computeTicks(MapManager.storyMap);
                if (range.length) {
                    return {
                        annotations: pinsLayer.get("features"),
                        data: range,
                        boxes: boxesLayer.get("features")

                    };
                }
            });
        });

        boxesLayer.on('change:features', function() {
            maybeCreateTimeControls(function() {
                var range = computeTicks(MapManager.storyMap);
                if (range.length) {
                    return {
                        annotations: pinsLayer.get("features"),
                        data: range,
                        boxes: boxesLayer.get("features")
                    };
                }
            });
        });

        maybeCreateTimeControls();
    }

    module.constant('TimeControlsManager', TimeControlsManager);

    module.service('TimeMachine', function() {
        return {
            computeTicks: computeTicks
        };
    });
})();

(function() {
    'use strict';

    var module = angular.module('storytools.core.boxes', ['storytools.core.time.services']);

    var boxes = storytools.core.maps.boxes;
    var utils = storytools.core.time.utils;

    function StoryBoxLayerManager() {
        this.storyBoxes = [];
    }
    StoryBoxLayerManager.prototype.boxesChanged = function(boxes, action) {
        var i;
        var box;

        if (action == 'delete') {
            for (i = 0; i < boxes.length; i++) {
                box = boxes[i];
                for (var j = 0, jj = this.storyBoxes.length; j < jj; j++) {
                    if (this.storyBoxes[j]._id == box._id) {
                        this.storyBoxes.splice(j, 1);
                        break;
                    }
                }
            }
        } else if (action == 'add') {

            var maxId = new Date().getTime();
            this.storyBoxes.forEach(function(b) {
                maxId = Math.max(maxId, b._id);
            });

            for (i = 0; i < boxes.length; i++) {

                box = boxes[i];

                if (typeof box._id === 'undefined' || box._id === null) {
                        box._id = ++maxId;
                }

                this.storyBoxes.push(box);
            }
        } else if (action == 'change') {
            // provided edits could be used to optimize below
            for (i = 0; i < boxes.length; i++) {
                box = boxes[i];
                for (var x = 0, xx = this.storyBoxes.length; x < xx; x++) {
                    if (this.storyBoxes[x]._id == box._id) {
                        this.storyBoxes[x]= box;
                        break;
                    }
                }
            }

        } else {
            throw new Error('action? :' + action);
        }
        // @todo optimize by looking at changes
        var times = this.storyBoxes.map(function(p) {
            if (p.start_time > p.end_time) {
                return storytools.core.utils.createRange(p.end_time, p.start_time);
            } else {
                return storytools.core.utils.createRange(p.start_time, p.end_time);
            }
        });
   
        this.storyBoxesLayer.set('times', times);
        this.storyBoxesLayer.set('features', this.storyBoxes);
    };


    StoryBoxLayerManager.prototype.load = function(boxList) {
        if (boxList) {
            this.boxesChanged(boxList, 'add', true);
        }
    };


    StoryBoxLayerManager.prototype.loadFromGeoJSON = function(geojson, projection) {
        if (geojson && geojson.features) {
            var loaded = boxes.loadFromGeoJSON(geojson, projection);
            this.boxesChanged(loaded, 'add', true);
        }
    };

    module.service('StoryBoxLayerManager', StoryBoxLayerManager);

    module.constant('StoryBox', boxes.Box);


   module.service('stBoxesStore', ['StoryBoxLayerManager', function(StoryBoxLayerManager) {
        function path(mapid) {
            return '/maps/' + mapid + '/boxes';
        }
        function get(mapid) {
            var saved = $http.get(path(mapid));
            saved = (saved === null) ? null : JSON.parse(saved);
            return saved;
        }
        function set(mapid, boxes) {
            localStorage.setItem(path(mapid),
                new ol.format.GeoJSON().writeFeatures(boxes,
                    {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})
            );
        }
        return {
            loadBoxes: function(mapid, storyMap) {
                return StoryBoxLayerManager.loadFromGeoJSON(get(mapid), projection);
            },
            deleteBoxes: function(boxes) {
                var saved = get();
                var toDelete = boxes.map(function(d) {
                    return d.id;
                });
                saved = saved.filter(function(s) {
                    return toDelete.indexOf(s.id) < 0;
                });
                set(saved);
            },
            saveBoxes: function(mapid, boxes) {
                var clones = [];
                boxes.forEach(function(a) {
                    if (typeof a.id == 'undefined') {
                        a.id = ++maxId;
                    }
                    var clone = a.clone();
                    if (a.get('start_time') !== undefined) {
                        clone.set('start_time', a.get('start_time')/1000);
                    }
                    if (a.get('end_time') !== undefined) {
                        clone.set('end_time', a.get('end_time')/1000);
                    }
                    clones.push(clone);
                });
                return set(mapid, clones);
            }
        };
    }]);

    module.service('stStoryBoxService', ['$http', 'StoryBoxLayerManager', function($http, StoryBoxLayerManager) {
        function path(mapid) {
            return '/maps/' + mapid + '/boxes';
        }
        return {
            loadBoxes: function(mapid, storyMap) {
                return StoryBoxLayerManager.loadFromGeoJSON(get(mapid), projection);
            },
            deleteBoxes: function(mapid, boxes) {
                var toDelete = boxes.map(function(d) {
                    return d.id;
                });
                return $http.post(path(mapid), JSON.stringify({'ids':toDelete}));//.success(function(data) {
                   // return "success";
                //});
            },
            saveBoxes: function(mapid, boxes) {
                var clones = [];
                boxes.forEach(function(a) {
                    var clone = a.clone();
                    if (a.get('start_time') !== undefined) {
                        clone.set('start_time', a.get('start_time')/1000);
                    }
                    if (a.get('end_time') !== undefined) {
                        clone.set('end_time', a.get('end_time')/1000);
                    }
                    clones.push(clone);
                });
                return $http.post(path(mapid), new ol.format.GeoJSON().writeFeatures(clones,
                        {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'})).success(function(data) {
                        return "success";
                    });

            }
        };
    }]);

})();


(function() {
  var module = angular.module('storytools.core.legend.directives', []);

  var legendOpen = false;

  module.directive('stLegend',
      ["$rootScope", "MapManager", function($rootScope, MapManager) {
        return {
          restrict: 'C',
          replace: true,
          templateUrl: 'legend/legend.html',
          // The linking function will add behavior to the template
          link: function(scope, element) {
            scope.mapManager = MapManager;

            var openLegend = function() {
              angular.element('#legend-container')[0].style.visibility = 'visible';
              angular.element('#legend-panel').collapse('show');
              legendOpen = true;
            };
            var closeLegend = function() {
              angular.element('#legend-panel').collapse('hide');
              legendOpen = false;

              //the timeout is so the transition will finish before hiding the div
              setTimeout(function() {
                angular.element('#legend-container')[0].style.visibility = 'hidden';
              }, 350);
            };

            scope.toggleLegend = function() {
              if (legendOpen === false) {
                if (angular.element('.legend-item').length > 0) {
                  openLegend();
                }
              } else {
                closeLegend();
              }
            };

            scope.getLegendUrl = function(layer) {
              var url = null;
              var server = '/geoserver/wms';
              var layer_name = layer.get('typeName') || layer.get('id');
              url = server + '?request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=' +
                  layer_name + '&transparent=true&legend_options=fontColor:0xFFFFFF;' +
                  'fontAntiAliasing:true;fontSize:14;fontStyle:bold;';
              return url;
            };

            scope.$on('layer-added', function() {
              if (legendOpen === false) {
                openLegend();
              }
            });

            scope.$on('layerRemoved', function() {
              //close the legend if the last layer is removed
              if (legendOpen === true && angular.element('.legend-item').length == 1) {
                closeLegend();
              }
            });
          }
        };
      }]);
}());
(function() {
  'use strict';
   var module = angular.module('storytools.core.legend', [
        'storytools.core.legend.directives'
    ]);
})();