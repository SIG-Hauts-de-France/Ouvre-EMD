/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.overviewmap = function (pContainer, pMap, pWidth, pHeight, pCenterX, pCenterY, pScale) {
    var mapJson = null,
        container = pContainer,
        width = pWidth,
        height = pHeight,
        activeZone = null,
        transitionTime = 1000,
        mapCriterias = null,
        map = pMap,
        attrMatch = null,

        mercatorProjection = d3.geo.mercator()
            .scale(pScale)
            .center([pCenterX, pCenterY])
            .translate([width/2, height/2]),

        svgMap = d3.select(container)
                    .append("svg")
                    .attr("width", width)
                    .attr("class", "block overview")
                    .attr("height", height),
        d3MapObj = svgMap.append("g");

    /*
     * Json Data for the map
     */
    this.setJson = function (json) {
        mapJson = json;
    };
 
    this.setCriteria = function (criteria) {
        mapCriterias = criteria;
    };

    /*
     * Match the attributes
     */
    this.setAttributesMatch = function (matches) {
        attrMatch = matches;
    }

    /*
     * Transition d3 time
     */
    this.setTransitionTime = function (time) {
        transitionTime = time;
    };

    /*
     * Draw the map
     */
    this.drawMap = function () {
        var geoPath = d3.geo.path()
            .projection(mercatorProjection);

        d3MapObj.selectAll("path")
            .data(mapJson.features)
            .enter()
            .append("path")
            .attr("class", "overview")
            .attr("fill", "#eee")
            .attr("d", geoPath)
            .attr("id", function (d) {return d.properties[attrMatch.id]})
            .attr(attrMatch.dtir, function (d) {return d.properties[attrMatch.dtir]})
            .attr(attrMatch.de30, function (d) {return d.properties[attrMatch.de30]})
            .attr(attrMatch.de10, function (d) {return d.properties[attrMatch.de10]})
            .attr("opacity",0)
            .transition()
            .duration(transitionTime)
            .attr( "opacity", 1 );

        var activeZone = d3MapObj.append("text")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", ".25em")
            .attr("class", "overview")
            .text(function(d) { return ""; });

        var tooltip = d3.select("body").append("div")
                .attr("class", "nvtooltip with-3d-shadow nvtooltipdata")
                .style("opacity", 0);

        svgMap.selectAll("path")
            .on("click", function (d, i) {
                var zoneType = map.getCurrentZoneType();

                if(activeZone == d.properties[mapCriterias.sel_id])
                    D3Viewer.mainView.activeZone = -1; // reset
                else 
                    D3Viewer.mainView.activeZone = d.properties[mapCriterias.sel_id];

                d3.select(".overview path.active").attr("class","overview");
                d3.select(this).attr("class", "active");

                // Recenter map of the zone clicked
                map.centerOnZone(d3.select(this).attr(zoneType), zoneType);
            })
            //
            .on("mouseover", function (d, i) {
                // Get current zone type
                var zoneType = map.getCurrentZoneType();

                // Highlight all zone of that type on the overview
                if(zoneType) {
                    svgMap.selectAll('path').each(function (dd, ii) {
                        if(d.properties[zoneType] == d3.select(this).attr(zoneType)) {
                            d3.select(this).attr("save_fill", d3.select(this).attr("fill")); // save current fill
                            d3.select(this).attr("fill", D3Viewer.settings.highlightColor);
                        }
                    });

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", .9);

                    var infosHtml = "";
                    infosHtml += "<span class='sub_infos'>" + d3.select(this).attr(zoneType) + "</span>";

                    tooltip.html(infosHtml)
                            .style("left", (d3.event.pageX) + "px")
                            .style("top", (d3.event.pageY - 28) + "px");
                }
            })
            .on("mouseout", function(dd, ii) {
                svgMap.selectAll('path').each(function (dd, ii) {
                    if(d3.select(this).attr("save_fill"))
                        d3.select(this).attr("fill", d3.select(this).attr("save_fill")); 
                });
                tooltip.transition()
                        .duration(500)
                        .style("opacity", 0);
             });
    };


    /*
     * Update the map color
     */
    this.updateColorMap = function (color, mapCurrentCriteria) {
        d3MapObj.selectAll("path.overview")
            .transition()
            .duration(transitionTime)
            .attr("fill", function (d, i) {
                return color(d.properties[mapCurrentCriteria]);
            })
            .attr("save_fill", null);
    };
}