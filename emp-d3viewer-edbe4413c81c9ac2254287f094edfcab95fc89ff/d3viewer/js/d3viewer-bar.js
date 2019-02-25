/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.bar = function (pContainer, pWidth, pHeight, pMargin) {

    var dataJson = null,
        width = pWidth,
        height = pHeight,
        margin = pMargin,
        barCriterias = null,
        valXCriteria = null,
        valYCriteria = null, 
        valFilter = null,
        valSubFilter = null,
        valCriteriaExclude = null,
        barCurrentCriteria = null,
        xDomain = null,
        yDomain1 = null,
        ySubDomain1 = null,    
        barTimerStop = false,
        transitionTime = 1000,
        container = pContainer,
        previousTypeBar = null,
        svgBars = d3.select(pContainer)
                        .append("svg")
                        .attr("class", "block")
                        .attr("width", width)
                        .attr("height", height); 
    /*
     * Json Data for the bars
     */
    this.setJson = function (json) {
        dataJson = json;
    };

    /*
     * Set criterias
     */
    this.setCriteria = function (criteria) {
        barCriterias = criteria;
        valXCriteria = barCriterias.xcrit;
        valYCriteria = barCriterias.ycrit;
        valFilter = barCriterias.filter;
        valSubFilter = barCriterias.subfilter;
        valCriteriaExclude = barCriterias.exclude_crit;

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

     /*
     * Draw the bars
     */
    var drawMultiBars = function () {
 
        heightChart = height - margin.bottom;
        widthChart = width - margin.right;

        data = [];
        if(ySubDomain1) {
            data = ySubDomain1.map(function(ySub, i) {
                var dataFiltered = dataJson.filter(function (d) { 
                    var res = false;
                    // Do not take exluced values if specified
                    if(d[valFilter.value] != valCriteriaExclude
                    && d[valSubFilter.value] != valCriteriaExclude) {
                        res = (d[valSubFilter.value] == ySub && d[valFilter.value] == barCurrentCriteria);
                    }
                    return res;
                });
                subData = dataFiltered.map(function(sd, j) {
                    return {
                        x: sd[valXCriteria.value],
                        y: sd[valYCriteria.value],
                        precision: Math.round(sd["precision"]*100)
                    };
                });

                return {
                    key: ySub,
                    values: subData
                }
            });
        } else {
            data = yDomain1.map(function(ySub, i) {
                var dataFiltered = dataJson.filter(function (d) { 
                    var res = false;
                    // Do not take exluced values if specified
                    if(d[valFilter.value] != valCriteriaExclude) {
                        res = (d[valFilter.value] == ySub);
                    }
                    return res;
                });
                subData = dataFiltered.map(function(sd, j) {
                    return {
                        x: sd[valXCriteria.value],
                        y: sd[valYCriteria.value],
                        precision: Math.round(sd["precision"]*100)
                    };
                });
                return {
                    key: ySub,
                    values: subData
                }
            });
        }

        nv.addGraph(function () {
            var chart = nv.models.multiBarChart();
            chart
                .reduceXTicks(false)
                .rotateLabels(90)
                .showControls(true)
                .groupSpacing(0.1)
                .width(width)
                .height(height)
                .controlLabels({"grouped": i18n.t("chart.grouped"), "stacked": i18n.t("chart.stacked")})
                .tooltip.contentGenerator(function(data) {
                    return "<div style='background:"+data.color+";width: 15px; height: 15px; float: left; margin-right: 5px;'></div><b>" + data.data.x + "</b>: " + data.data.y + "<br/>Precision: +/- " + data.data.precision + "%";
                });

            chart.xAxis
                //.innerTickSize([10])
                //.ticks(20)
                .axisLabel(valXCriteria.label)
                .tickFormat();

            chart.yAxis
                .axisLabel(valYCriteria.label)
                .tickFormat(d3.format('.0f'));

            // Do not display x axis if too much values
            if(xDomain.length > 15) {
                //chart.reduceXTicks(true)
            }

            svgBars
                .datum(data)
                .call(chart)
                .style({ 'width': width, 'height': height });

            nv.utils.windowResize(chart.update);

            // Move legend
            //d3.select(".nv-legendWrap")
            //    .attr("transform", "translate(100,0)");

            return chart;
        });
    }

    var removeFilterSelector = function () {
        svgBars.selectAll(".bar_criteria").remove();
    }

    var drawFilterSelector = function () {
        removeFilterSelector();
        var startX = 325;
        var x = startX;
        var y = 3;
        yDomain1.forEach(function (dom) {
            if(dom != valCriteriaExclude) {
                cclass = "unselected";
                if(x == startX)
                    cclass = "selected";
                svgBars.append("circle")
                            .attr("cx", x)
                            .attr("cy", y)
                            .attr("r", 5)
                            .attr("class", "bar_criteria " + cclass)
                            .attr("tag", dom)
                            .on("click", function (d, i) {
                                if(barCurrentCriteria != d3.select(this).attr("tag")) {
                                    d3.select("circle.selected").attr("class", "bar_criteria unselected");
                                    d3.select(this).attr("class", "bar_criteria selected");
                                    barCurrentCriteria = d3.select(this).attr("tag");
                                    updateBar();
                                }
                            });
                svgBars.append("text")
                            .attr("transform", "translate(" + (x + 10) + "," + (y+3) + ")")  
                            .attr("text-anchor", "start")
                            .attr("class", "bar_criteria info_on_bar")
                            .text(dom);
                x += 80;
                if(x > width) {
                    x = startX;
                    y += 10;
                }
            }
        });
    }

    var updateBar = function() {
        drawMultiBars();
    }

     /*
     * Draw the bars (multi)
     */
    this.drawMultiBars = function () {
        if(!valFilter) {
            // Single
            removeFilterSelector();
            clearSvg("single");
            drawBars();
            previousTypeBar = "single";
        }
        else {
            // Multi
            clearSvg("multi");
            if(ySubDomain1)
                drawFilterSelector();
            else
                removeFilterSelector();
            barCurrentCriteria = yDomain1[0]; // default
            if(barCurrentCriteria == valCriteriaExclude)
                barCurrentCriteria = yDomain1[1];

            drawMultiBars();
            previousTypeBar = "multi";
        }
    }

    /*
     * Clear svg
     */
    var clearSvg = function (typeBar) {
        if(previousTypeBar == "multi" && previousTypeBar != typeBar) {
            svgBars.selectAll(container + " .nv-multiBarWithLegend").remove();
        }
        if(previousTypeBar == "single" && previousTypeBar != typeBar) {
            svgBars.selectAll(container + " .nv-discretebar").remove();
            svgBars.selectAll(container + " .nv-discreteBarWithAxes").remove();
        }
    }

     /*
     * Draw the bars (single)
     */
     var drawBars = function() {
        nv.addGraph(function() {
            var chart = nv.models.discreteBarChart();
            chart
                    .margin({top: 30, right: 60, bottom: 50, left: 70})
                    .x(function(d,i) { return d.label })
                    .y(function(d,i) { return d.value })
                    .staggerLabels(true)
                    .color(['rgb(152, 223, 138)'])
                    .tooltip.contentGenerator(function(data) {
                        return "<div style='background:"+data.color+";width: 15px; height: 15px; float: left; margin-right: 5px;'></div><b>" + data.data.label + "</b>: " + data.data.value + "<br/>Precision: +/- " + data.data.precision + "%";
                    });

            data = [];
            data = dataJson.map(function(d, i) {
                return {
                    label: d[valXCriteria.value],
                    value: d[valYCriteria.value]*1.0,
                    precision: Math.round(d["precision"]*100)
                }
            });

            // Carreful 
            if(data.length > 15)
                chart.showXAxis(false);

            data = [{key: "Simple bars", values: data}];

            chart.xAxis
                .axisLabel(valXCriteria.label)
                .tickFormat();

            chart.yAxis
                .axisLabel(valYCriteria.label)
                .tickFormat(d3.format('.0f'));

            svgBars
                .datum(data)
                .transition()
                .duration(0)
                .call(chart);

            nv.utils.windowResize(chart.update);

            return chart;
        });
    }
}
