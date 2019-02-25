/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.curve = function (pContainer, pWidth, pHeight, pMargin) {
    
    var dataJson = null,
        width = pWidth,
        height = pHeight,
        margin = pMargin,
        curveTimerStop = false,
        curveCriterias = null,
        valXCriteria = null,
        valYCriteria = null,
        valFilter = null,
        valSubFilter = null, 
        xDomain = null,
        yDomain1 = null,
        ySubDomain1 = null,
        fillCurveEnabled = false,
        container = pContainer,
        transitionTime = 1000,
        svgCurves = d3.select(container)
                        .append("svg")
                        .attr("class", "block")
                        .attr("width", width)
                        .attr("height", height); 
    /*
     * Json Data for the curves
     */
    this.setJson = function (json) {
        dataJson = json;
    };

    /*
     * Set criterias
     */
    this.setCriteria = function (criteria) {
        curveCriterias = criteria;
        valXCriteria = curveCriterias["xcrit"];
        valYCriteria = curveCriterias["ycrit"];
        valFilter = curveCriterias["filter"];
        valSubFilter = curveCriterias["subfilter"];

        // Get domains
        xDomain = d3.scale.ordinal().domain(dataJson.map( function (d) { return d[valXCriteria.value]; })).domain();
        if(valFilter)
            yDomain1 = d3.scale.ordinal().domain(dataJson.map( function (d) { return d[valFilter.value]; })).domain();
        else
            yDomain1 = null;
        if(valSubFilter)
            ySubDomain1 = d3.scale.ordinal().domain(dataJson.map( function (d) { return d[valSubFilter.value]; })).domain();
        else
            ySubDomain1 = null;
    };

    var draw = function (update) {
        nv.addGraph(function() {
        var chart = nv.models.lineChart()
                        .margin({left: 30})
                        .useInteractiveGuideline(true)
                        .showLegend(true)
                        .showYAxis(true)
                        .showXAxis(true)
                        .width(width)
                        .height(height);
        ;

        // Don't use ordinal scale, but instead the x function
        chart.x(function (d,i){
            return d.x; 
        });

        chart.xAxis
            .axisLabel(valXCriteria.label)
            .tickFormat(function(d) { 
                console.log(d);
                return d;
            });

        chart.yAxis
            .axisLabel(valYCriteria.label)

        var data = getFormatedData();

        svgCurves
            .datum(data)
            .call(chart)
            .style({ 'width': width, 'height': height });

        // Update the chart when window resizes.
        nv.utils.windowResize(function() { chart.update() });
            return chart;
        });

        var colors = d3.scale.category20();

        function getFormatedData() {
            var tabCurves = [];
            var idxColor = 0;

            if(ySubDomain1) {
                for(yDom in yDomain1) {
                    // Same color domain for same level of filter
                    var color = d3.scale.linear()
                        .domain([0, ySubDomain1.length])
                        .range([colors(idxColor), colors(idxColor+1)]);  
                    idxColor += 2;

                    var idxSubDom = 0;
                    for(ySubDom in ySubDomain1) {
                        yParam = yDomain1[yDom];
                        xParam = ySubDomain1[ySubDom];
                        currentColor = color(idxSubDom);
                        idxSubDom++;
                        // The curve
                        dataFiltered = dataJson.filter(function (d) { 
                                    return (d[valFilter.value] == yParam) && (d[valSubFilter.value] == xParam);
                                });

                        valsCurve = dataFiltered.map(function(sd, j) {  
                            return {
                                x: sd[valXCriteria.value],
                                y: sd[valYCriteria.value]
                            };
                        });

                        // Add curve to the list
                        tabCurves.push({
                            values: valsCurve,
                            key: yParam + " - " + xParam, // title
                            color: currentColor,
                            area: false    
                        });       
                    }
                }
                return tabCurves;
            }        
            else { // no subDomain
                for(yDom in yDomain1) {
                    // Same color domain for same level of filter
                    var color = 'rgb(152, 223, 138)';

                        yParam = yDomain1[yDom];
                        // The curve
                        dataFiltered = dataJson.filter(function (d) { 
                                    return (d[valFilter.value] == yParam);
                                }); 

                        valsCurve = dataFiltered.map(function(sd, j) {  
                            return {
                                x: sd[valXCriteria.value],
                                y: sd[valYCriteria.value]
                            };
                        });

                        // Add curve to the list
                        tabCurves.push({
                            values: valsCurve,
                            key: yParam,
                            color: color,
                            area: false
                        });
                }
                return tabCurves;
            }
        }
    }

    /*
     * Draw the curves
     */
    var draw2 = function (update) {

        svgCurves.selectAll("path.line").remove();
        svgCurves.selectAll(".axis").remove();
        svgCurves.selectAll("text").remove();
        svgCurves.selectAll(".area").remove();
        $("#fill_container").remove();

        heightChart = height - margin.bottom;
        widthChart = width - margin.right;

        drawEnableFillCheckBox();

        // Range Y
        var maxValY = d3.max(dataJson, function (d) {
            return d[valYCriteria.value];
        })

        var y = d3.scale.linear().range([heightChart, 0]);
        y.domain([0, maxValY]);

        var x = d3.scale.ordinal();
        x.domain(xDomain).rangePoints([0, widthChart]);

        var xAxis = d3.svg.axis().scale(x)
            .orient("bottom").ticks(6);

        var yAxis = d3.svg.axis().scale(y)
            .orient("left").ticks(5);

        // Calculate process for the curves
        var valueline = d3.svg.line()
            .x(function (d) { return x(d[valXCriteria.value]); })
            .y(function (d) { return y(d[valYCriteria.value]); });

        // See http://colorbrewer2.org/
        var colors = d3.scale.category20();
        var idxColor = 0;
        var defaultStroke = 1.5;

        for(yDom in yDomain1) {
            // Same color domain for same level of filter
            var color = d3.scale.linear()
                .domain([0, ySubDomain1.length])
                .range([colors(idxColor), colors(idxColor+1)]);  
            idxColor += 2;

            var idxSubDom = 0;
            for(ySubDom in ySubDomain1) {
                yParam = yDomain1[yDom];
                xParam = ySubDomain1[ySubDom];
                currentColor = color(idxSubDom);
                idxSubDom++;
                // The curve
                dataFiltered = dataJson.filter(function (d) { 
                            return (d[valFilter.value] == yParam) && (d[valSubFilter.value] == xParam);
                        }); 

                if(fillCurveEnabled) {
                    // Fill the curve
                    var area = d3.svg.area()
                        .x(function(d) { return x(d[valXCriteria.value]); })
                        .y0(heightChart)
                        .y1(function(d) { return y(d[valYCriteria.value]); });
                    svgCurves.append("path")
                        .datum(dataFiltered)
                        .attr("class", "area")
                        .attr("d", area)
                        .style("fill", currentColor)
                        .style("opacity", 0)
                        .transition()
                        .duration(transitionTime)
                        .style("opacity", .2);
                }

                // Draw the curve
                classXParam = "c" + idxColor; // create a dynamic class for elements
                svgCurves.append("path")
                    .attr("class", "line " + classXParam)
                    .style("stroke", currentColor)
                    .attr("stroke-width", defaultStroke)
                    .attr("d", valueline(dataFiltered))
                    .on( "mouseover", function (d){
                        curveTimerStop = false;
                        var classes = this.getAttribute("class").split(" ");
                        highlight(classes[classes.length - 1]); // we take the last class
                    })
                    .on( "mouseout", function (d){
                        curveTimerStop = true;
                    });

                curveLegendY = dataFiltered[dataFiltered.length-1].properties[valYCriteria.value];  

                // Curve legend at the end of the curve
                svgCurves.append("text")
                    .attr("transform", "translate(" + (widthChart+3) + "," + y(curveLegendY) + ")")  
                    .attr("dy", ".35em")
                    .attr("text-anchor", "start")
                    .attr("class", classXParam)
                    .style("fill", currentColor)
                    .style("font-size", "8px")
                    .text(yParam + " - " + xParam)
                    // when hovering a specific xParam, highlight or animate
                    .on( "mouseover", function (d){
                        curveTimerStop = false;
                        highlight(this.getAttribute("class"));
                    })
                    .on( "mouseout", function (d){
                        curveTimerStop = true;
                    }); 
            }
        }

        animate = function (classId) {
            d3.timer(function (t) {
                svgCurves.selectAll("path." + classId)
                    .attr("stroke-width", function (d, i) {
                        var breath_speed = 1000;
                        var breath_amplitude = 3;
                        var delta = Math.abs(Math.sin(t / breath_speed)) * breath_amplitude + 0.5; 
                        if (curveTimerStop)
                            return defaultStroke; // default width
                        else
                            return delta;
                    })
                return curveTimerStop; // return true to stop the timer
            });
        }

        highlight = function (classId) {
            var delta = defaultStroke;
            d3.timer(function (t) {
                svgCurves.selectAll("path."+classId)
                    .attr("stroke-width", function (d, i) {
                        var grow_speed = 500;
                        var grow_amplitude = 3;
                        if (curveTimerStop)
                            return defaultStroke; // default width
                        else {
                            if(delta >= grow_amplitude)
                                delta = grow_amplitude;
                            else
                                delta = Math.abs(Math.sin(t / grow_speed)) * grow_amplitude + 0.5;
                            return delta;
                        }
                    })
                return curveTimerStop; // return true to stop the timer
            });
        }        
        
        // X axis
        svgCurves.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + heightChart + ")")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 10)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(20)")
            .style("text-anchor", "start");

        // Y axis
        svgCurves.append("g")
            .attr("class", "y axis")
            .call(yAxis);
    };

    /*
     * Add fill control
     */
    drawEnableFillCheckBox = function() {
        // Add a check box to enable / disabled totals
        if (fillCurveEnabled)
            $(container).append("<div id='fill_container'><INPUT type='checkbox' id='fill' value='Enable fill' checked> " + i18n.t("chart.enable_fill") + "</div>");
        else
            $(container).append("<div id='fill_container'><INPUT type='checkbox' id='fill' value='Enable fill'> " + i18n.t("chart.enable_fill") + "</div>");            

        $("#fill").change(function() {
            if(this.checked) {
                fillCurveEnabled = true;     
            } else {
                fillCurveEnabled = false;
            }
            updateCurves();
        });
    }

    /*
     * Update the curves
     */        
    var updateCurves = function () {
        draw(true);
    }

    /*
     * Update the curves
     */
    this.updateCurves = function () {
        draw(true);
    }

    this.drawCurves = function (update) {
        draw(update);
    }
}