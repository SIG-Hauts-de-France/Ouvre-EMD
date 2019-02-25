/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.map = function (pContainer, pWidth, pHeight, pCenterX, pCenterY, pScale) {
    var mapJson = null,
        neighbourJson = null,
        neighbourCountriesJson = null,
        townsJson = null,
        dataJson = null,
        container = pContainer,
        width = pWidth,
        height = pHeight,
        mapZonesDef = null,
        currentZoneType = null,
        activeZone = null,
        transitionTime = D3Viewer.settings.transitionTime,
        maxRadius = D3Viewer.settings.maxRadius,
        attrMatch = null,
        attrDataMatch = null,
        mapTooltipDisabled = false,
        maptooltip = null,
        tooltipData = null,
        colorBound = "#FF0000",
        dictCentroidZones = {},
        rangeColorMap = colorbrewer.BuGn[9],
        mapCurrentDataView = "choroplethe",
        mapCurrentDonutView = "prop",
        mapMode = null,
        movementFrom = null,
        movementTo = null,
        mercatorProjection = d3.geo.mercator()
                    .scale(pScale)
                    .center([pCenterX, pCenterY])
                    .translate([width / 2, height / 2]),
        svgMap = d3.select(container)
                    .append("svg")
                    .attr("width", width)
                    .attr("class", "block map")
                    .attr("height", height),
        d3MapObj = svgMap.append("g"),
        d3MapNeighbourObj = svgMap.append("g"),
        d3MapNeighbourCountriesObj = svgMap.append("g"),
        d3ZoneObj = svgMap.append("g"),
        d3DataObj = svgMap.append("g"),
        d3MapTownsObj = svgMap.append("g"),
        geoPath = null,
        mapScale = new D3Viewer.mapScale(this, svgMap, 200, 50),
        currentMapScale = null,
        currentMapCenter = pCenterX + "_" + pCenterY,
        svgMapColorPicker = null,
        overviewMap = null,
        fillCurrent = "#f6fce6",
        strokeCurrent = "#8aba16",
        legendItemOff = [],
        visualMapKey = null,
        movLimit = null;


    /*
     * Json Data for the map (geometries)
     */
    this.setJson = function (json) {
        mapJson = json;
    };

    /*
     * Json Data for the neighbour zones
     */
    this.setNeighbourJson = function (json) {
        neighbourJson = json;
    };

    /*
     * Json Data for the neighbour countries
     */
    this.setNeighbourCountriesJson = function (json) {
        neighbourCountriesJson = json;
    };

    /*
     * Json Data for the main towns
     */
    this.setTownsJson = function (json) {
        townsJson = json;
    };

    /*
     * Json Data for the map (data)
     */
    this.setDataJson = function (json) {
        dataJson = json;
    };

    /*
     * Json Data for de10
     */
    this.setDe10Json = function (json) {
        de10Json = json;
    };

    /*
     * Json Data for de30
     */
    this.setDe30Json = function (json) {
        de30Json = json;
    };

    /*
     * Json Data for dtir
     */
    this.setDtirJson = function (json) {
        dtirJson = json;
    };

    /*
     * Link to overview map
     */
    this.setOverviewMap = function (overviewmap) {
        overviewMap = overviewmap;
    };

    /*
     * Set the criteria
     */
    this.setZonesDef = function (criteria, zoneSelContainer) {
        mapZonesDef = criteria;

        // Build a zone selector
        addZoneSelector(zoneSelContainer);
    };

    /*
     * Set the default zone representation
     * */
    this.setVisualMapKey  = function (mapKey) {
        setVisualMapKey(mapKey);
    };

    /*
     * Set the default zone representation
     * */
    setVisualMapKey  = function (mapKey) {
        switch(mapKey) {
            case "de10":
                displayDe10();    
                break;
            case "de30":
                displayDe30();   
                break;
            case "dtir":
                displayDtir();
                break;
            default:
                displayDe10();
                break;
        }
        visualMapKey = mapKey;
    };

    /*
     * Zone selector
     */
    var addZoneSelector = function (zoneSelContainer) {
        var x = 20;
        var svgSelector = d3.select(zoneSelContainer)
                    .append("svg")
                    .attr("width", 200)
                    .attr("class", "zone_selector")
                    .attr("height", 20);
        var d3Selector = svgSelector.append("g");

        for (var crit in mapZonesDef) {
            cclass = "unselected";
            d3Selector.append("circle")
                        .attr("cx", x)
                        .attr("cy", 10)
                        .attr("r", 5)
                        .attr("class", "map_criteria " + cclass)
                        .attr("tag", mapZonesDef[crit])
                        .on("click", function(d, i) {
                            if(currentZoneType != d3.select(this).attr("tag")) {
                                d3.select("circle.selected").attr("class", "map_criteria unselected");
                                d3.select(this).attr("class", "map_criteria selected");
                                currentZoneType = d3.select(this).attr("tag");
                                updateColorMap();
                                setVisualMapKey(currentZoneType);
                            }
                        });
            d3Selector.append("text")
                        .attr("transform", "translate(" + (x + 10) + "," + (13) + ")")  
                        .attr("text-anchor", "start")
                        .attr("class", "map_criteria info_on_map")
                        .text(i18n.t("chart." + mapZonesDef[crit]));
            x += 50;
        }

        // Default to de30
        d3Selector.selectAll('circle').each(function (d, i) {
            if(d3.select(this).attr("tag") == "de30") {
                d3.select(this).attr("class", "map_criteria selected");
                currentZoneType = d3.select(this).attr("tag");
                setVisualMapKey(currentZoneType);
            }
        });
    }

    /*
     * Transition d3 time
     */
    this.getCurrentZoneType = function () {
        return currentZoneType;
    };

    /*
     * Transition d3 time
     */
    this.setTransitionTime = function (time) {
        transitionTime = time;
    };

    /*
     * Match the attributes
     */
    this.setAttributesMatch = function (matches) {
        attrMatch = matches;
    }

    /*
     * Set map type
     */
    //this.setTypeMap = function (mode, from, to) {
    this.setTypeMap = function (mode) {
        // from , top applied only to movments maps
        mapMode = mode.mode;
        movementFrom = mode.from;
        movementTo = mode.to;
    }

    /*
     * Match the data attributes
     */
    this.setAttributesDataMatch = function (matches) {
        attrDataMatch = matches;
        // To avoid null comparison
        if(!attrDataMatch.subfilter)
            attrDataMatch.subfilter = {};        
        if(!attrDataMatch.subfilter2)
            attrDataMatch.subfilter2 = {};
    }

    var getMapColors = function () {
        var color = d3.scale.ordinal()
                .domain(mapJson.features.map( function (d) { return d.properties[currentZoneType]; }))
                .range(rangeColorMap);
        return color;
    }

    /*
     * Draw the map
     */
    this.drawMap = function () {
        // Delete before redraw
        d3MapObj.selectAll("path").remove();
        d3MapObj.selectAll(".map_scale").remove();
        d3MapObj.selectAll(".infos_on_map").remove();
        d3MapObj.selectAll(".description").remove();

        d3MapNeighbourObj.selectAll("path").remove();
        d3MapNeighbourCountriesObj.selectAll("path").remove();
        d3MapTownsObj.selectAll(".towns").remove();

        var mapColors = getMapColors();
        maptooltip = d3.select("body").append("div")
            .attr("class", "nvtooltip with-3d-shadow")
            .style("opacity", 0); 

        geoPath = d3.geo.path()
            .projection(mercatorProjection);

        displayNeighbourhood();

        displayTowns();

        // Default
        setVisualMapKey(visualMapKey);

        // draw map
        d3MapObj.selectAll("path")
            .data(mapJson.features)
            .enter()
            .append("path")
            .attr("fill", function (d, i) {
                return mapColors(d.properties[currentZoneType]);
            })
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties[attrMatch.id]})
            .attr(attrMatch.dtir, function (d) {return d.properties[attrMatch.dtir]}) // TODO make this dynamic
            .attr(attrMatch.de30, function (d) {return d.properties[attrMatch.de30]})
            .attr(attrMatch.de10, function (d) {return d.properties[attrMatch.de10]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 0); // TODO change that, we dont need to display ZF anymore
                                 // but carreul on getCentroid function cause we use them
                                 // we must now use the ditr, de10 or de30 data

        // Color picker
        if(!svgMapColorPicker)
            addMapColorPicker();

        // Mouse events
        d3MapObj.selectAll("path")
            .on("mouseover", function (d, i) {
                var bbox = this.getBBox();
                var centroid = [bbox.x + bbox.width/2, bbox.y + bbox.height/2];
                var x = centroid[0];
                var y = centroid[1];
                var scale = 4;

                // Tooltip
                if(!mapTooltipDisabled) {
                    maptooltip.transition()
                            .duration(200)
                            .style("opacity", .9);

                    maptooltip.html(infosHtml)  
                            .style("left", (d3.event.pageX) +  10  + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                }

            })
            .on("mouseout", function (d, i) {
                svgMap.selectAll("path.mapselection").remove();
                svgMap.selectAll("line.mapselection_frame").remove();
                // Hide tooltip
                maptooltip.transition()
                            .style("opacity", 0);
            })
            .on("click", function (d, i) {
            });

        // Redraw mapScale
        if(!mapScale)
            mapScale.drawMapScale();
    };

    /*
     * Display neighbourhood
     */
    var displayNeighbourhood = function () {
        // draw neighbour countries
         d3MapNeighbourCountriesObj.selectAll("path")
            .data(neighbourCountriesJson.features)
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("class", "neighbour country")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties["ogc_fid"]})
            .attr("cntr_id", function (d) {return d.properties["cntr_id"]}) // TODO make this dynamic
            .attr("country", function (d) {return d.properties["country"]})
            .attr("iso_pays", function (d) {return d.properties["iso_pays"]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 1);

        // draw neighbour zones
         d3MapNeighbourObj.selectAll("path")
            .data(neighbourJson.features)
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("class", "neighbour")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties["ogc_fid"]})
            .attr("code_dept", function (d) {return d.properties["code_dept"]}) // TODO make this dynamic
            .attr("code_reg", function (d) {return d.properties["code_reg"]})
            .attr("nom_dept", function (d) {return d.properties["nom_dept"]})
            .attr("nom_region", function (d) {return d.properties["nom_region"]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 1);
    }

    /*
     * Display de10
     */
    var displayDe10 = function () {
        d3ZoneObj.selectAll("path").remove();
        d3ZoneObj.selectAll("path")
            .data(de10Json.features)
            .enter()
            .append("path")
            .attr("fill", fillCurrent)
            .attr("stroke", strokeCurrent)
            .attr("class", "zone")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties["id"]})
            .attr("name", function (d) {return d.properties["name"]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 1);
    }

    /*
     * Display de30
     */
    var displayDe30 = function () {
        d3ZoneObj.selectAll("path").remove();
        d3ZoneObj.selectAll("path")
            .data(de30Json.features)
            .enter()
            .append("path")
            .attr("fill", fillCurrent)
            .attr("stroke", strokeCurrent)
            .attr("class", "zone")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties["id"]})
            .attr("name", function (d) {return d.properties["name"]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 1);
    }

    /*
     * Display dtir
     */
    var displayDtir = function () {
        d3ZoneObj.selectAll("path").remove();
        d3ZoneObj.selectAll("path")
            .data(dtirJson.features)
            .enter()
            .append("path")
            .attr("fill", fillCurrent)
            .attr("stroke", strokeCurrent)
            .attr("class", "zone")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties["id"]})
            .attr("name", function (d) {return d.properties["name"]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 1);
    }

    /*
     * Display towns
     */
    var displayTowns = function () {
        // draw towns
         d3MapTownsObj.selectAll("circle")
            .data(townsJson.features)
            .enter()
            .append("path")
            .attr("r", 5)
            .attr("class", "towns towns_point")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties["gid"]})
            .attr("nomcommune", function (d) {return d.properties["code_dept"]}) // TODO make this dynamic
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr("opacity", 1);  

         // Town names
        d3MapTownsObj.selectAll(".place-label")
            .data(townsJson.features)
            .enter()
            .append("text")
            .attr("class", "place-label towns")
            .attr("transform", function(d) { return "translate(" + mercatorProjection(d.geometry.coordinates) + ")"; })
            .attr("dy", ".35em")
            .attr("dx", "10px")
            .text(function(d) { return d.properties.nomcommune; });   
    }

    /*
     * Infos on zone
     */
    var addInfosOnZone = function () {
        var infosOnZone = d3MapObj.append("foreignObject")
            .attr("class", "infos infos_on_map")
            .attr("width", 200)
            .attr("height", 110)
            .attr("x", width - 160)
            .attr("y", 0)
            .attr("dy", ".25em")
            .attr("fill", function(d, i) {
                return "#aaa";
            })
            .html("");
        return infosOnZone;
    };

    /*
     * Global description zone on the map
     */
    var addDescZone = function () {
        var infosOnZone = d3MapObj.append("foreignObject")
            .attr("class", "infos description")
            .attr("width", 400)
            .attr("height", 30)
            .attr("x", width - 400)
            .attr("y", height - 10)
            .attr("dy", ".25em")
            .attr("fill", function(d, i) {
                return "#aaa";
            })
            .html("Description of the current map..."); // TODO dynamic
    };

    this.drawDataOnMap = function (update) { 
        movLimit = null; // reset limit
        legendItemOff = []; // reset legend
        drawData(update);
    }

    drawData = function (update) {
        // Clean map first
        cleanMap(update);

        if(!tooltipData)
            tooltipData = d3.select("body").append("div")
                .attr("class", "nvtooltip with-3d-shadow nvtooltipdata")
                .style("opacity", 0);  

        if(!dataJson)
            return;

        var maxValCriteria = d3.max(dataJson, function(d) {
            // Exclude value if specified
            if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                && d[attrDataMatch.subfilter.value] != attrDataMatch.exclude_crit
                && d[attrDataMatch.subfilter2.value] != attrDataMatch.exclude_crit
            ) {
                return d[attrDataMatch.ycrit.value];
            }
        });
        var minValCriteria = d3.min(dataJson, function(d) {
            // Exclude value if specified
            if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                && d[attrDataMatch.subfilter.value] != attrDataMatch.exclude_crit
                && d[attrDataMatch.subfilter2.value] != attrDataMatch.exclude_crit
            ) {
                return d[attrDataMatch.ycrit.value];
            }
        });

        if(!maxValCriteria) {
            enableMapToolTip();
            return; // means that current data is not associated to geographical zones
        }

        //var domain = [0, maxValCriteria];
        var domain = [minValCriteria, maxValCriteria];
        var color = d3.scale.linear()
            .domain(domain)
            .range(["white", colorBound]);

        if(mapMode == "flux") {
            // Movements
            // display "oursins" or arrows beetween movementFrom and movementTo
            movementView(maxValCriteria, minValCriteria, tooltipData);

            // Apply filters if setted (legend / limit)
            updateMovementVisibility(movLimit);
        }
        else {
            if(attrDataMatch.subfilter.value != "" && attrDataMatch.subfilter.value != undefined) {
                // Sub values => Donuts
                drawDonutPropSelector();
                donutView();
            } else {
                // Selector for the representation method
                drawCircleChoropletheSelector();
                addDataColorPicker();
                if(mapCurrentDataView == "circle") {
                    // Redraw the zone, in case we draw chloropethe before
                    setVisualMapKey(visualMapKey);

                    circleView(update, color, tooltipData, maxValCriteria);
                    // Show representation map control
                    svgMap.selectAll(".map_criteria")
                        .transition()
                        .duration(transitionTime)
                        .style("opacity", "1");
                    addLegend(domain, color, "circle");
                }
                else {
                    choropletheView(update, color, tooltipData);
                    // Hide other representation map control
                    svgMap.selectAll(".map_criteria")
                        .transition()
                        .duration(transitionTime)
                        .style("opacity", "0");
                    // Add legend
                    addLegend(domain, color, "color");
                }
            }
        }
    };

    /*
     * Draw a curved line beetween 2 coords
     */
    var drawMovement = function (d, coords, color, curved, radius, strokeWidth, value, tooltip, from, dest) {
        var x1 = coords[0],
            y1 = coords[1],
            x2 = coords[2],
            y2 = coords[3];    
        var markerWidth = 6,
            markerHeight = 6,
            cRadius = radius,
            refX = cRadius + (markerWidth * 2),
            refY = -Math.sqrt(cRadius),
            drSub = cRadius + refY;
        svgMap.append("path")
            .attr("class", "movement cls_" + d[attrDataMatch.filter.value].replace(/[\. ,:-]+/g, "_"))
            .style("stroke", color(d[attrDataMatch.filter.value]))
            .attr("opacity", ".5")
            .attr("fill", "none")
            .attr("stroke-width", strokeWidth)
            .attr("value", value)
            .attr("d", function (dd) {
                // For the curve
                var dx = x2 - x1,
                    dy = (y2 - y1),
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + x1 + "," + y1 + "A" + (dr - drSub) + "," + (dr - drSub) + " 0 0,1 " + x2 + "," + y2;
            })
            .on( "mouseover", function(dd){
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);

                var infosHtml = "";
                infosHtml += "<span class='sub_infos'><b>" + from + " => " + dest + "</b> : " + value + "<br/>( " + d[attrDataMatch.filter.value] + " )</span>";
                if(d["precision"])
                    infosHtml += "<br/>Précision: +/- " + d["precision"]*100 + "%";

                tooltip.html(infosHtml)  
                        .style("left", (d3.event.pageX) + "px")     
                        .style("top", (d3.event.pageY - 28) + "px");    
            })
            .on("mouseout", function(dd) {       
                tooltip.transition()        
                    .duration(500)      
                    .style("opacity", 0);   
            }); 
    }

    /*
     * Update movements stroke width
     */
    var updateMovementWidth = function (strokeCoeff) {
        svgMap.selectAll("path.movement")
            .transition()
            .duration(transitionTime)
            .attr("stroke-width", function () {
                var originalStrokeWidth = d3.select(this).attr("save-stroke-width");
                if(!originalStrokeWidth)
                    originalStrokeWidth = d3.select(this).attr("stroke-width");
                d3.select(this).attr("save-stroke-width", originalStrokeWidth); // save the original value
                var newStrokeWidth = originalStrokeWidth * strokeCoeff;
                return newStrokeWidth;
            });
    }

    /*
     * Update movements visibility
     */
    var updateMovementVisibility = function (limit) {
         svgMap.selectAll("path.movement")
            .transition()
            .duration(transitionTime)
            .style("visibility", function() {

                // If legend is off for a specific class, then do not display
                var visibilityLimit = "visible";
                for(legendItem in legendItemOff) {
                    if(d3.select(this).attr("class").indexOf(legendItemOff[legendItem]) > -1) { // check if the elemtn class is contain in the legendItemOff array
                        visibilityLimit = "hidden";
                    }
                }

                var visibility = "visible";
                var pathValue = d3.select(this).attr("value");
                if(pathValue < limit)
                    visibility = "hidden";
                else
                    visibility = "visible";

                d3.select(this).attr("save-limit-visibility", visibility); // save the value

                if(visibilityLimit == "visible" && visibility == "visible")
                    return "visible";
                else
                    return "hidden";
            });
    }

    /*
     * Update circle radius
     */
    var updateCircleRadius = function (radiusCoeff) {
        svgMap.selectAll("circle.pathcircle")
            .transition()
            .duration(transitionTime)
            .attr("r", function () {
                var originalRadius = d3.select(this).attr("save-radius");
                if(!originalRadius)
                    originalRadius = d3.select(this).attr("r");
                d3.select(this).attr("save-radius", originalRadius); // save the original value
                var newRadius = originalRadius * radiusCoeff;
                return newRadius;
            });
    }
    
    /*
     * Color picker for the data
     */
    var addDataColorPicker = function () {
        var picker = new D3Viewer.utils.colorPicker(i18n.t("chart.color_picker_data"), svgMap, "#00DB00");
        picker.picked = function (color) {
            colorBound = color;
            updateColorDataOnMap();
        };
    }
 
    /*
     * Color picker for the map
     */
    var addMapColorPicker = function () {
        svgMapColorPicker = d3.select("#map_color_picker")
                            .append("svg")
                            .attr("width", 100)
                            .attr("class", "map_color_picker")
                            .attr("height", 80);
        var d3MapColorPicker = svgMapColorPicker.append("g");

        var tabColorBrewer = [colorbrewer.Purples[9], colorbrewer.Blues[9], colorbrewer.Greens[9], 
                                      colorbrewer.Oranges[9], colorbrewer.Reds[9], colorbrewer.Greys[9]];
        var tabColorBrewerExtract = [];
        for(i = 0 ; i < tabColorBrewer.length; i++) {
            tabColorBrewerExtract[i] = tabColorBrewer[i][4];
        }
        var picker = new D3Viewer.utils.colorPicker(i18n.t("chart.color_picker_map"), d3MapColorPicker, tabColorBrewer[0][4], 30, 25, "colorpickermap", tabColorBrewerExtract);
        picker.picked = function (color, idx) {
            rangeColorMap = tabColorBrewer[idx];
            fillCurrent = rangeColorMap[0];
            strokeCurrent = rangeColorMap[rangeColorMap.length - 1];
            updateColorMap();
        };
    }

 
    /*
     * Lines and arrows view for the representation of the data
     */
    movementView = function (maxValCriteria, minValCriteria, tooltip) {
        // for each filter, trace line beetween movementFrom and movementTo
        var filterDomain = d3.scale.ordinal().domain(dataJson.map( function (d) { return d[attrDataMatch.filter.value]; })).domain();
        var color = d3.scale.category20()
            .domain(filterDomain);

        var maxStrokeWidth = 10;
        var coeffStrokeWidth = maxStrokeWidth / maxValCriteria;

        dataJson.forEach(function (d) {
            // exlude values if specified
            if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                && d[attrDataMatch.subfilter.value] != attrDataMatch.exclude_crit
                && d[attrDataMatch.subfilter2.value] != attrDataMatch.exclude_crit) {

                var strokeWidth = d[attrDataMatch.ycrit.value] * coeffStrokeWidth;
                if(strokeWidth < 1)
                    strokeWidth = 1;

                var centerFrom = getCentroidZone(true, d[movementFrom.id_col], movementFrom.type_zone);
                var centerTo = getCentroidZone(true, d[movementTo.id_col], movementFrom.type_zone);

                var drawn = false;
                if(centerFrom[0] == 0 && centerFrom[1] == 0) {
                    // movement from exterior to zone
                    // draw a circle line  ?
                    drawn = true;
                }
                if(centerTo[0] == 0 && centerTo[1] == 0) {
                    drawn = true;
                }

                if(centerFrom[0] == centerTo[0] && centerFrom[1] ==  centerTo[1]){
                    // movement from zone to the same zone
                    // Draw a circular arrow
                    drawn = true;
                    var lengthLine = 40;
                    var x1 = centerFrom[0] - lengthLine / 2,
                        y1 = centerFrom[1],
                        x2 = centerTo[0] + lengthLine / 2,
                        y2 = centerTo[1];
                    drawMovement(d, [x1, y1, x2, y2], color, true, 30, strokeWidth, d[attrDataMatch.ycrit.value],
                                 tooltip, d[movementFrom.id_col], d[movementTo.id_col]);
                }

                if(!drawn) {
                    // movement from zone to another zone
                    var x1 = centerFrom[0],
                        y1 = centerFrom[1],
                        x2 = centerTo[0],
                        y2 = centerTo[1]; 
                    drawMovement(d, [x1, y1, x2, y2], color, true, 10, strokeWidth, d[attrDataMatch.ycrit.value], 
                                 tooltip, d[movementFrom.id_col], d[movementTo.id_col]);
                }
            }
        });

        addLegend(filterDomain, color, "line");

        addParamSlider("line", 550);

        // Slider to give a visibility limit (minValCriteria, maxValCriteria) of the movement
        addLimitSlider("line", minValCriteria, maxValCriteria, 130, 550);

    }

    /*
     * Donuts for the representation of the data
     */
    donutView = function () {
        nv.addGraph(function() {
            var zoneDomain = d3.scale.ordinal().domain(dataJson.map( function (d) {
                if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                    && d[attrDataMatch.subfilter.value] != attrDataMatch.exclude_crit
                    && d[attrDataMatch.subfilter2.value] != attrDataMatch.exclude_crit) {
                        return d[attrDataMatch.filter.value]; 
                }
            })).domain();
            undVal = zoneDomain.indexOf(undefined);
            if(undVal != -1)
                zoneDomain.splice(undVal, 1); // remove unwante values

            // Remove exclude_value because it's not usefull on a donut (it's always half of the donut)
            var subFilterDomain = d3.scale.ordinal().domain(dataJson.map( function (d) {
                if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                    && d[attrDataMatch.subfilter.value] != attrDataMatch.exclude_crit
                    && d[attrDataMatch.subfilter2.value] != attrDataMatch.exclude_crit) {

                    return d[attrDataMatch.subfilter.value];
                }
            })).domain();

            // But take the exclude_crit value to get the max
            var maxValDonut = null;
            if(attrDataMatch.exclude_crit) {
                maxValDonut = d3.max(dataJson, function(d) {
                    // We deal only with the subfilter, adapted to this kind of representation
                    if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                        && d[attrDataMatch.subfilter.value] == attrDataMatch.exclude_crit) {
                        return d[attrDataMatch.ycrit.value];
                    }
                });
            }
            if(maxValDonut == null) {
                // That means there is no exclude_crit in these data, the recalculate the max
                maxValDonut = d3.max(dataJson, function(d) {
                    return d[attrDataMatch.ycrit.value];
                });
            }

            var coeffDonut = 1;
            if(maxValDonut)
                coeffDonut = 1 / maxValDonut;

            var color = d3.scale.category20();

            undVal = subFilterDomain.indexOf(undefined);
            if(undVal != -1)
                subFilterDomain.splice(undVal, 1); // remove unwante values

            color.domain(subFilterDomain);

            addLegend(subFilterDomain, color, "donut");

            for(dom in zoneDomain) {
                var dataFiltered = dataJson.filter(function(d) { 
                            //return (d[attrDataMatch.filter.value] == zoneDomain[dom]);
                            var res = false;
                            // Do not take exluced values if specified
                            if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                            && d[attrDataMatch.subfilter.value] != attrDataMatch.exclude_crit
                            && d[attrDataMatch.subfilter2.value] != attrDataMatch.exclude_crit) {
                                res = (d[attrDataMatch.filter.value] == zoneDomain[dom]);
                            }
                            return res;
                        });
                var maxVal = 1;
                if(attrDataMatch.exclude_crit) {
                    var gotExcludeCrit = false;
                    maxVal = d3.max(dataJson, function(d) {
                        // We deal only with the subfilter, adapted to this kind of representation
                        if(d[attrDataMatch.filter.value] != attrDataMatch.exclude_crit
                            && d[attrDataMatch.subfilter.value] == attrDataMatch.exclude_crit
                            && d[attrDataMatch.filter.value] == zoneDomain[dom]) {
                            gotExcludeCrit = true;
                            return d[attrDataMatch.ycrit.value];
                        }
                    });
                    if(!gotExcludeCrit) {
                        maxVal = d3.max(dataJson, function(d) {
                            // We deal only with the subfilter, adapted to this kind of representation
                            if(d[attrDataMatch.filter.value] == zoneDomain[dom]) {
                                return d[attrDataMatch.ycrit.value];
                            }
                        }); 
                    }
                }

                var center = getCentroidZone(true, zoneDomain[dom]);

                var x = center[0];
                var y = center[1];
                //var widthDonut = 75;
                //var heightDonut = 75;
                var widthDonut = 150;
                var heightDonut = 150;
                var radius = 0;
                if(mapCurrentDonutView == "prop")
                    radius = maxVal * coeffDonut * (Math.min(widthDonut, heightDonut) / 2);
                else
                    radius = .5 * (Math.min(widthDonut, heightDonut) / 2);

                var donutRingWidth = 20;

                var svgDonut = d3DataObj.append("svg")
                    .append('svg')
                    .attr("class", "donutOnMap")
                    .attr('width', widthDonut)
                    .attr('height', heightDonut)
                    .attr('x', x - widthDonut/2)
                    .attr('y', y - heightDonut/2)
                    .style('opacity', '.9')
                    .append('g')
                    .attr('transform', 'translate(' + (widthDonut / 2) + 
                        ',' + (heightDonut / 2) + ')');

                var arc = d3.svg.arc()
                    .innerRadius(radius - donutRingWidth) 
                    .outerRadius(radius);

                var pie = d3.layout.pie()
                    .value(function(d) { 
                        return d[attrDataMatch.ycrit.value]; 

                    })
                    .sort(null);

                var path = svgDonut.selectAll('path')
                    //.data(pie(dataset))
                    .data(pie(dataFiltered))
                    .enter()
                    .append('path')
                    .attr('d', arc)
                    .attr('fill', function(d, i) { 
                        return color(d.data[attrDataMatch.subfilter.value]);
                    })
                    .on( "mouseover", function(d){
                        tooltipData.transition()
                            .duration(200)
                            .style("opacity", .9);

                        var infosHtml = d.value;
                        if(d.data["precision"])
                            infosHtml += "<br/>Précision: +/- " + d.data["precision"]*100 + "%";

                        tooltipData.html(infosHtml)  
                                .style("left", (d3.event.pageX) + "px")
                                .style("top", (d3.event.pageY - 28) + "px");
                    })
                    .on( "mouseout", function(d){
                        // Hide tooltip
                        tooltipData.transition()
                            .duration(200)
                            .style("opacity", 0);
                    });
            }
        });
    }

    /*
     * Proportionnal circles for representation of the Data
     */
    circleView = function (update, color, tooltip, maxValCriteria) {
        coeffCircle = maxRadius / maxValCriteria;

        if(update) {
            d3DataObj.selectAll("circle.pathcircle")
                .transition()
                .duration(transitionTime)
                .attr("fill", function(d, i) { 
                    return color(d[attrDataMatch.ycrit.value])
                })
        } else {
            d3DataObj.selectAll( "circle" )
                .data(dataJson )
                .enter()
                .append( "circle" )
                .attr( "class", "pathcircle")
                .attr( "cx", function(d) {
                    // Search the centroid for the actual ZONE
                    center = getCentroidZone(true, d[attrDataMatch.filter.value]);
                    var x = center[0];
                    return x;
                })
                .attr( "cy", function(d) {
                    // Search the centroid for the actual ZONE
                    center = getCentroidZone(true, d[attrDataMatch.filter.value]);
                    var y = center[1];
                    return y;
                })
                .attr( "r", function(d) {
                    return d[attrDataMatch.ycrit.value] * coeffCircle;
                })
                .attr( "fill", function(d, i) {
                    return color(d[attrDataMatch.ycrit.value])
                })
                .on( "click", function(){
                })
                .on( "mouseover", function(d){
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);

                    var infosHtml = "";
                    infosHtml += "<span class='sub_infos'><b>" + d[attrDataMatch.filter.value] + "</b> : " + d[attrDataMatch.ycrit.value] + "</span>";
                    if(d["precision"])
                        infosHtml += "<br/>Précision: +/- " + d["precision"]*100 + "%";

                    tooltip.html(infosHtml)
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function(d) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        }

        addParamSlider("circle", 530);
    }

    /*
     * Choroplethe for representation of the Data
     */
    choropletheView = function(update, color, tooltip) {
        // associate the values with the zone unity

        dictVal = d3.map();
        dataJson.forEach(function (d) {
            //dictVal.set(d[attrDataMatch.filter.value], d[attrDataMatch.ycrit.value]);
            precision = "";
            if(d["precision"])
                precision = Math.round(d["precision"]*100);
            dictVal.set(d[attrDataMatch.filter.value], {"val": d[attrDataMatch.ycrit.value], "precision": precision});
        });

        d3ZoneObj.selectAll('path').each(function (d, i) {

            // Check the zone unity of the current path
            zone_id = d3.select(this).attr("name");

            // Find the good value for this unity
            val = precision = 0;
            if(dictVal.get(zone_id)) {
                val = dictVal.get(zone_id).val;
                precision = dictVal.get(zone_id).precision;
            }

            // The value to the path
            d3.select(this)
                .attr("fill", color(val))
                .attr("val_chloro", val)
                .attr("precision", precision)
                .attr("zone_id", zone_id)
                .attr("class", "cls_" + val.toString().replace(/[\. ,:-]+/g, "_"))
                .on( "mouseover", function(dd){
                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);

                    var infosHtml = "";
                    infosHtml += "<span class='sub_infos'><b>" + d3.select(this).attr("zone_id") + "</b> : " + d3.select(this).attr("val_chloro") + "</span>";
                    infosHtml += "<br/>Précision: +/- " + d3.select(this).attr("precision") + "%";
                    tooltip.html(infosHtml)
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                })
                .on("mouseout", function(dd) {
                    tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
                });
        });
    }

    /*
     * Control selector remove
     */
    removeCircleChoropletheSelector = function () {
        svgMap.selectAll(".circle_selector").remove();
    }

    /*
     * Color picker remove
     */
    removeColorPicker = function () {
        svgMap.selectAll(".colorpicker").remove();
    }

    /*
     * Donut proportionnality control remove
     */
    removeDonutPropSelector = function () {
        svgMap.selectAll(".donut_prop_ctrl").remove();
    }

    /*
     * Clear map from all data representation
     */
    cleanMap = function (update) {
        disableMapToolTip();
        removeCircleChoropletheSelector();
        removeColorPicker();
        removeDonutPropSelector();
        if(!update) {
            svgMap.selectAll(".pathcircle").remove();
        }
        svgMap.selectAll(".donutOnMap").remove();
        svgMap.selectAll(".movement").remove();
        svgMap.selectAll(".legend").remove();
        svgMap.selectAll(".slider_param").remove();
        svgMap.selectAll(".limit_text_field").remove();
        d3.selectAll(".slider_param_container").remove();
    }

    /*
     * Control selector beetween circle and choroplethe
     */
    drawCircleChoropletheSelector = function () {
        removeCircleChoropletheSelector();

        var x = 0;
        var tabSelector = ["choroplethe", "circle"];
        tabSelector.forEach(function (selector) {
            var cclass = "method_unselected";
            if(mapCurrentDataView == selector)
                cclass = "method_selected";
            d3MapObj.append("circle")
                        .attr("cx", x)
                        .attr("cy", height - 10)
                        .attr("r", 5)
                        .attr("class", "circle_selector " + cclass)
                        .attr("tag", selector)
                        .on("click", function(d, i) {
                            if(mapCurrentDataView != d3.select(this).attr("tag")) {
                                d3.select("circle.method_selected").attr("class", "circle_selector method_unselected");
                                d3.select(this).attr("class", "circle_selector method_selected");
                                mapCurrentDataView = d3.select(this).attr("tag");
                                updateDataOnMap();
                            }
                        });
            d3MapObj.append("text")
                        .attr("transform", "translate(" + (x + 10) + "," + (height - 7) + ")")  
                        .attr("text-anchor", "start")
                        .attr("class", "circle_selector info_on_map")
                        .text(i18n.t("chart." + selector));  
            x += 90;
        });
    }

    /*
     * Control selector for donut proportionnality
     */
    drawDonutPropSelector = function () {
        removeDonutPropSelector();

        var x = 0;
        var tabSelector = ["prop", "fixed"];
        tabSelector.forEach(function (selector) {
            var cclass = "method_unselected";
            if(mapCurrentDonutView == selector)
                cclass = "method_selected";
            d3MapObj.append("circle")
                        .attr("cx", x)
                        .attr("cy", height - 10)
                        .attr("r", 5)
                        .attr("class", "donut_prop_ctrl " + cclass)
                        .attr("tag", selector)
                        .on("click", function(d, i) {
                            if(mapCurrentDonutView != d3.select(this).attr("tag")) {
                                d3.select("circle.method_selected").attr("class", "donut_prop_ctrl method_unselected");
                                d3.select(this).attr("class", "donut_prop_ctrl method_selected");
                                mapCurrentDonutView = d3.select(this).attr("tag");
                                updateDataOnMap();
                            }
                        });
            d3MapObj.append("text")
                        .attr("transform", "translate(" + (x + 10) + "," + (height - 7) + ")")  
                        .attr("text-anchor", "start")
                        .attr("class", "donut_prop_ctrl info_on_map")
                        .text(i18n.t("chart." + selector));  
            x += 150;
        });
    }

    /*
     * Legend
     */
    var addLegend = function(domain, colors, type) {
        // Trick: if domain contains only 2 values (bounds), add a few more to have a nice legend
        if(domain.length == 2 && type != "donut") {
            var min = domain[0];
            var max = domain[1];
            var delta = max - min;
            var step = delta / 4;
            domain[1] = min + step;
            domain[2] = min + step * 2;
            domain[3] = max;
        }

        var coeffHighlight = 10;
        var legend = svgMap.append("g")
            .attr("class", "legend")
            .attr("height", 100)
            .attr("width", 100)
            .attr("transform", "translate(0 340)");

        //legendItemOff = [];

        var coeffCircle = 1;
        var lastPos = 0;
        if(type == "circle")
            var coeffCircle = maxRadius / domain[3];

        legend.selectAll('g').data(domain)
            .enter()
            .append('g')
            .each(function(d, i) {
                if(d != attrDataMatch.exclude_crit) {
                    var g = d3.select(this);
                    if(type == "circle") {
                        radius = d * coeffCircle / 2;
                        g.append("circle")
                            .attr("cx", 2)
                            //.attr("cy", i*20)
                            .attr("cy", lastPos)
                            .attr("r", radius)
                            .style("stroke", "#ccc")
                            .style("fill", colors(d));

                        g.append("text")
                            .attr("x", radius + 15)
                            .attr("y", lastPos + 8)
                            .attr("height",30)
                            .attr("width",100)
                            .style("fill", function() {
                                color = colors(d);
                                if(color == D3Viewer.settings.backgroundColor)
                                    color = "#ccc";
                                return color;
                            })
                            .text(d);

                        lastPos = lastPos + radius * 2 + 10;
                    } else {
                        opacity = 1;

                        // Check if legend items has been deactivated (only for movement view)
                        // We need to do that cause this function is called even when mapscale is changed for example
                        if(type == "line") { // only available for movement view
                            for(legendItem in legendItemOff) {
                                id_item = "cls_" + d.toString().replace(/[\. ,:-]+/g, "_");
                                if(id_item == legendItemOff[legendItem]) {// the item is off
                                    opacity = 0.2;
                                    console.log("iiiiii");
                                }
                            }
                        }

                        g.append("rect")
                            .attr("x", 2)
                            .attr("y", i*20)
                            .attr("width", 10)
                            .attr("height", 10)
                            .style("stroke", "#ccc")
                            .style("fill", colors(d))
                            .style("opacity", opacity)
                            .on("mouseover", function(dd, i) {
                                if(type == "line") {
                                    // Hide all path
                                    svgMap.selectAll(".movement")
                                        .style("opacity", .1);
                                    svgMap.selectAll(".cls_" + dd.toString().replace(/[\. ,:-]+/g, "_"))
                                        .style("opacity", .5);
                                }
                                if(type == "color") {
                                    svgMap.selectAll(".cls_" + dd.toString().replace(/[\. ,:-]+/g, "_"))
                                        .style("fill", function (ddd, i) {
                                            var currentColorFill = d3.select(this).attr("fill");
                                            // Save the colorFill in the object
                                            d3.select(this).attr("fill-save", currentColorFill)
                                            // Apply a new temporary one
                                            return "#ccc";
                                        });
                                }
                            })
                            .on("mouseout", function(dd, i) {
                                    if(type == "line") {
                                        svgMap.selectAll(".movement")
                                            .style("opacity", .5);opacity
                                    }
                                    if(type == "color") {
                                        svgMap.selectAll(".cls_" + dd.toString().replace(/[\. ,:-]+/g, "_"))
                                            .style("fill", function (ddd, i) {
                                                // re apply the saved color fill
                                                return d3.select(this).attr("fill-save");
                                            });
                                    }
                                })
                            .on("click", function(dd, i) {
                                    if(type == "line") { // only available for movement view
                                        var visibility = null;
                                        var opacity = null;
                                        id_item = "cls_" + dd.toString().replace(/[\. ,:-]+/g, "_");
                                        idx = legendItemOff.indexOf(id_item);
                                        if(idx != -1) { // means that the item is off => hidden
                                            visibility = "visible";
                                            opacity = 1;
                                            legendItemOff.splice(idx, 1);
                                        }
                                        else {
                                            visibility = "hidden";
                                            opacity = 0.2;
                                            legendItemOff.push(id_item);
                                        }
                                        // if a limit has been set, check if path is visible

                                        limit = movLimit;
                                        if(visibility == "visible")
                                            updateMovementVisibility(d3.round(limit));
                                        else
                                            svgMap.selectAll(".cls_" + dd.toString().replace(/[\. ,:-]+/g, "_"))
                                                    .style("visibility", visibility);
                                        d3.select(this).style("opacity", opacity)
                                    }
                                });
                        g.append("text")
                            .attr("x", 15)
                            .attr("y", i * 20 + 8)
                            .attr("height",30)
                            .attr("width",100)
                            .style("fill", function() {
                                color = colors(d);
                                if(color == D3Viewer.settings.backgroundColor)
                                    color = "#ccc";
                                return color;
                            })
                            .text(d);
                    }
                }
            });
    }

    /*
     * Apply an effect on d3 objects
     */
    this.setEffect = function(fn_effect) {
        fn_effect(d3DataObj, "circle", mercatorProjection);        
    };

    /*
     * Search into json data
     */
    var getCentroidZone = function(pixelUnit, label, pZoneCol) {

        // TODO change that
        var currentMapScale = mapScale.getCurrentMapScale();
        var mapAttr = null;
        var zoneCol = pZoneCol || attrDataMatch.filter.value;
        //if(zoneCol == "dtir") {
        if(zoneCol.indexOf("dtir") > -1) {
            mapAttr = attrMatch.dtir;
        }
        if(zoneCol.indexOf("de30") > -1) {
            mapAttr = attrMatch.de30;
        }
        if(zoneCol.indexOf("de10") > -1) {
            mapAttr = attrMatch.de10;
        }

        var xmin = 999999999,
            xmax = -999999999,
            ymin = 999999999,
            ymax = -999999999,
            centroid = null;

        // we must memorize centroid for a particular scale, and map center
        var key = label + "_" + currentMapScale + "_" + currentMapCenter + "_" + pixelUnit; 
        if(!dictCentroidZones[key]) {
            d3MapObj.selectAll('path').each(function (d, i) {
                if(label == d3.select(this).attr(mapAttr)) {

                    var bbox = null;
                    if(pixelUnit)
                        bbox = this.getBBox();
                    else {
                        bbox = d3.geo.bounds(d.geometry);
                    }

                    if(d.geometry != null) {
                        if(pixelUnit) {
                            if(bbox.x < xmin)
                                xmin = bbox.x;
                            if(bbox.y < ymin)
                                ymin = bbox.y;
                            if((bbox.x + bbox.width) > xmax)
                                xmax = bbox.x + bbox.width;
                            if((bbox.y + bbox.height) > ymax)
                                ymax = bbox.y + bbox.height;
                        }
                        else {
                            if(bbox[0][0] < xmin)
                                xmin = bbox[0][0];
                            if(bbox[0][1] < ymin)
                                ymin = bbox[0][1];
                            if(bbox[1][0] > xmax)
                                xmax = bbox[1][0];
                            if(bbox[1][1] > ymax)
                                ymax = bbox[1][1];
                        }
                    }
                }
            });

            var x = xmin + (xmax - xmin) / 2;
            var y = ymin + (ymax - ymin) / 2;

            // Memorize the centroid to avoid next search
            dictCentroidZones[key] = [x, y];   
            centroid = [x, y]

        }
        else {
            centroid = dictCentroidZones[key];
        }

        return centroid;
    };

    /*
     * Center the map on specific zone
     */
    this.centerOnZone = function (label, zone_type) {
        var center = getCentroidZone(false, label, zone_type);
        currentMapCenter = center.join("_");
        mercatorProjection.center([center[0], center [1]]);        
        this.drawMap();
        updateDataOnMap();
    }

     /*
     * Center the map on specific point
     */
     this.centerOnPoint = function (x, y, redrawData) {
        mercatorProjection.center([x, y]);
        currentMapCenter = x + "_" + y;
        this.drawMap();
        if(redrawData)
            updateDataOnMap();
     }

    /*
     * Change map scale
     */
    this.changeScale = function (scale) {
        mercatorProjection.scale(scale);
        this.drawMap();
        updateDataOnMap();
    }

    /*
     * Update the map color
     */
    var updateColorMap = function () {
        var color = getMapColors();
        d3ZoneObj.selectAll("path")
            .transition()
            .duration(transitionTime)
            .attr("stroke", function (d, i) {
                 return strokeCurrent;
            })
            .attr("fill", function (d, i) {
                 return fillCurrent;
            });

        // Update overview too
        overviewMap.updateColorMap(color, currentZoneType);
    };

    /*
     * Update the color of the data
     */
    var updateColorDataOnMap = function () {
        drawData(true);
    };

    /*
     * Update the data on the map
     */
    var updateDataOnMap = function () {
        drawData(false);
    };

    /*
     * To avoid tooltip conflict on map and data
     */
    var disableMapToolTip = function () {
        mapTooltipDisabled = true;
        maptooltip.style("opacity", 0);
    }

    /*
     * To avoid tooltip conflict on map and data
     */
    var enableMapToolTip = function () {
        mapTooltipDisabled = false;
        maptooltip.style("opacity", 1);
    }

    /*
     * When active zone is changed, process data
     */
    var activeZoneChanged = function (active_zone) {
        console.log(active_zone);
    }

    /*
     * Slider to change the attributes of representation (movement map, circle map)
     */
    var addParamSlider = function (type, posY) {
        var width = 100,
            height = 30;

        var svgParamSliderContainer = d3.select("#resizable_map").append("svg")
            .attr("class", "slider_param slider_param_container")
            .attr("width", width + 100 )
            .attr("height", height + 30 )
            .attr("y", posY)
            .attr("x", 130)
            .append("g")
            .attr("transform", "translate(" + 20 + "," + 20 + ")");

        svgParamSlider = svgParamSliderContainer.append("svg")
                .attr("width", width + 40 )
                .attr("height", height )
                .attr("y", 0)
                .append("g")
                .attr("transform", "translate(" + 20 + "," + 20 + ")");

        var sliderDomain = [1, 5];

        var x = d3.scale.linear()
            .domain(sliderDomain)
            .range([0, width])
            .clamp(true);

        var brush = d3.svg.brush()
            .x(x)
            .extent(sliderDomain)
            .on("brush", brushed)
            .on("brushend", brushedEnd);

        svgParamSlider.append("g")
            .attr("class", "x axis_slider_param slider_param")
            //.attr("transform", "translate(0," + height / 2 + ")")
            .call(d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(function(d) { return d; })
            .tickSize(0)
            .tickPadding(32))
        .select(".domain")
        .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "halo");

        var slider = svgParamSlider.append("g")
            .attr("class", "slider_param slider_param")
            .call(brush);

        slider.selectAll(".extent,.resize")
            .remove();

        slider.select(".background")
            .attr("height", height);

        var handle = slider.append("circle")
            .attr("class", "handle slider_param")
            //.attr("transform", "translate(0," + height / 2 + ")")
            .attr("r", 9);

        slider.append("text")
                        //.attr("transform", "translate(30, 3)")
                        .attr("transform", "translate(30, -13)")
                        .attr("text-anchor", "start")
                        .attr("class", "slider_param")
                        .text(i18n.t("chart.slider_param"));

        function brushed () {
            var value = brush.extent()[0];
            if (d3.event.sourceEvent) { // not a programmatic event
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }
            handle.attr("cx", x(value));
        }
        function brushedEnd () {
            var value = brush.extent()[0];
            if(type == "line")
                updateMovementWidth(value);
            if(type == "circle")
                updateCircleRadius(value);
        }
    }

    /*
     * Slider to set a limit
     */ 
    var addLimitSlider = function (type, min, max, posX, posY) {

        var width = 100,
            height = 30;

        svgParamLimitSliderContainer = d3.select("#resizable_map").append("svg")
            .attr("class", "slider_param slider_param_container")
            .attr("width", width + 100 )
            .attr("height", height + 30 )
            .attr("y", posY)
            .attr("x", posX)
            .append("g")
            .attr("transform", "translate(" + 20 + "," + 20 + ")");

        var svgParamSlider = svgParamLimitSliderContainer.append("svg")
                .attr("width", width + 40 )
                .attr("height", height )
                .attr("y", 0)
                .attr("x", 0)
                .append("g")
                .attr("transform", "translate(" + 20 + "," + 20 + ")");

        var sliderDomain = [min,max/100,max];

        // Non linear scale
        var x = d3.scale.linear()
            .domain(sliderDomain)
            .range([0,width/2,width])
            .clamp(true);

        var brush = d3.svg.brush()
            .x(x)
            .extent(sliderDomain)
            .on("brush", brushed)
            .on("brushend", brushedEnd);

        svgParamSlider.append("g")
            .attr("class", "x axis_slider_param slider_param")
            .call(d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(function(d) { return d; })
            .tickSize(0)
            .tickPadding(32))
        .select(".domain")
        .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "halo");

        var slider = svgParamSlider.append("g")
            .attr("class", "slider_param slider_param")
            .call(brush);

        slider.selectAll(".extent,.resize")
            .remove();

        slider.select(".background")
            .attr("height", height);

        var handle = slider.append("circle")
            .attr("class", "handle slider_param")
            .attr("r", 9);

        svgParamSlider.append("text")
                        //.attr("transform", "translate(30, 3)")
                        .attr("transform", "translate(30, -13)")
                        .attr("text-anchor", "start")
                        .attr("class", "slider_param slider_param_text")
                        .text(i18n.t("chart.slider_limit"));

        // Add textfield for free value
        var freeValueLimit = svgParamLimitSliderContainer.append("foreignObject")
            .attr("class", "limit_text_field")
            .attr("width", 50)
            .attr("height", 20)
            .attr("x", 75)
            .attr("y", -10)
            .attr("dy", ".25em")
            .html("<input type='text' id='free_limit' name='free_limit'>");

        if(movLimit) {
            $('#free_limit').val(movLimit);
        }

        $('#free_limit').keyup(function(e){
            if(e.keyCode == 13)
            {
                movLimit = $('#free_limit').val();
                updateMovementVisibility(d3.round(movLimit));
            }
        });

        function brushed () {
            var value = brush.extent()[0];
            if (d3.event.sourceEvent) { // not a programmatic event
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }
            handle.attr("cx", x(value));
        }

        function brushedEnd () {
            movLimit = brush.extent()[0];
            // Value represent the limit
             if(type == "line") {
                $('#free_limit').val(d3.round(movLimit));
                updateMovementVisibility(movLimit);
             }
        }
    }
}

/*
 * MapScale
 */
D3Viewer.mapScale = function (pMap, pContainer, pWidth, pHeight) {

    var width = pWidth,
        height = pHeight,
        map = pMap,
        currentMapScale = 13000,
        svgMapScale = d3.select("#map_scale").append("svg")
            .attr("width", width + 40 )
            .attr("height", height )
            .attr("y", "550")
            .append("g")
            .attr("transform", "translate(" + 20 + "," + 20 + ")");

    var mapScaleDomain = [13000, 100000];

    this.drawMapScale = function () {
        var x = d3.scale.linear()
            .domain(mapScaleDomain)
            .range([0, width-40])
            .clamp(true);

        var brush = d3.svg.brush()
            .x(x)
            .extent(mapScaleDomain)
            .on("brush", brushed)
            .on("brushend", brushedEnd);

        svgMapScale.append("g")
            .attr("class", "x axis_map_scale map_scale")
            //.attr("transform", "translate(0," + height / 2 + ")")
            .call(d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(function(d) { return d; })
            .tickSize(0)
            .tickPadding(32))
        .select(".domain")
        .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
            .attr("class", "halo");

        var slider = svgMapScale.append("g")
            .attr("class", "slider_map_scale map_scale")
            .call(brush);

        slider.selectAll(".extent,.resize")
            .remove();

        slider.select(".background")
            .attr("height", height);

        var handle = slider.append("circle")
            .attr("class", "handle map_scale")
            //.attr("transform", "translate(0," + height / 2 + ")")
            .attr("r", 9);

        slider
            .call(brush.event)
            .transition() // gratuitous intro!
            .duration(750)
            .call(brush.extent([70, 70]))
            .call(brush.event);

        svgMapScale.append("text")
                        .attr("transform", "translate(60, 20)")  
                        .attr("text-anchor", "start")
                        .attr("class", "map_scale_text")
                        .text();

        // Add reset button
        var reset = svgMapScale.append("foreignObject")
            .attr("class", "reset_map")
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", width - 30)
            .attr("y", -10)
            .html("<div class='reset_map'></div>");

        $(".reset_map").on('click', function (event) {
                    // Reset map location
                    currentMapScale = D3Viewer.settings.initScale;
                    d3.select(".handle").attr("cx", "0");
                    D3Viewer.mainView.map.centerOnPoint(D3Viewer.settings.centerX, D3Viewer.settings.centerY, false);
                    D3Viewer.mainView.map.changeScale(D3Viewer.settings.initScale);
                    d3.select(".map_scale_text").text(D3Viewer.settings.initScale);
                });

        function brushed () {
            var value = brush.extent()[0];
            if (d3.event.sourceEvent) { // not a programmatic event
                value = x.invert(d3.mouse(this)[0]);
                brush.extent([value, value]);
            }
            handle.attr("cx", x(value));
            if(value >= mapScaleDomain[0]) {
                d3.select(".map_scale_text").text("1/" + Math.round(value));
            }
        }
        function brushedEnd () {
            var value = brush.extent()[0];
            if(map.changeScale) {
                if(value >= mapScaleDomain[0]) {
                    currentMapScale = value;
                    map.changeScale(value);
                }
            }
        }
    };

    /*
     * Get map scale
     */
    this.getCurrentMapScale = function () {
        return currentMapScale;
    }

    this.drawMapScale();

}
