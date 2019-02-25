/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.brush = function (pContainer, pWidth, pHeight) {
    
    var width = pWidth,
        height = pHeight,
        dataJson = null,
        brushCriterias = null,
        valFilter = null,
        svgBrush = d3.select(pContainer)
                    .append("svg")
                    .attr("width", width)
                    .attr("class", "block")
                    .attr("height", height),    
        x = d3.time.scale()
            .domain([new Date(2015, 3, 1), new Date(2015, 3, 24) - 1])
            .range([0, width]);

    /*
     * Json Data for the brush
     */
    this.setJson = function (json) {
        dataJson = json;
    };

    /*
     * Set criterias
     */
    this.setCriteria = function (criteria) {
        brushCriterias = criteria;
        valFilter = brushCriterias["filter"];
    };

    d3BrushObj = d3.svg.brush()
        .x(x)
        .extent([new Date(2015, 3, 10), new Date(2015, 3, 12)])
        .on("brushend", function () {
                if (!d3.event.sourceEvent) return; // only transition after input
                var extent0 = d3BrushObj.extent(),
                    extent1 = extent0.map(d3.time.day.round);

                // if empty when rounded, use floor & ceil instead
                if (extent1[0] >= extent1[1]) {
                    extent1[0] = d3.time.day.floor(extent0[0]);
                    extent1[1] = d3.time.day.ceil(extent0[1]);
                }

                d3.select(this).transition()
                    .call(d3BrushObj.extent(extent1))
                    .call(d3BrushObj.event);
                dbTime = d3.time.format("%m/%d/%Y");
            });

    this.drawBrush = function () {

        svgBrush.append("rect")
            .attr("class", "grid-background")
            .attr("width", width)
            .attr("height", height);

        svgBrush.append("g")
            .attr("class", "x grid")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .ticks(d3.time.hours, 12)
                .tickSize(-height)
                .tickFormat("")
             )
            .selectAll(".tick")
            .classed("minor", function (d) { return d.getHours(); });

        svgBrush.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.days)
            .tickFormat(FR.timeFormat("%a %d"))
            .tickPadding(0))
        .selectAll("text")
            .attr("x", 6)
            .style("text-anchor", null);

        var gBrush = svgBrush.append("g")
            .attr("class", "brush")
            .call(d3BrushObj)
            .call(d3BrushObj.event);

        gBrush.selectAll("rect")
            .attr("height", height);
    };

}