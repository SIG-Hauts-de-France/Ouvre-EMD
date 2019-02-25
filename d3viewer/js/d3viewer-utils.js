/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */
/*
 * D3Viewer.utils contains utility functions
 */

D3Viewer.utils = {
    breathEffect: function (d3Obj, selector, proj) {
        d3.timer(function (t) {
            d3Obj.selectAll(selector).attr("transform", function (d, i) {
                var x = d3.select(this).attr("cx");
                var y = d3.select(this).attr("cy");
                var breath_speed = 1000;
                var breath_amplitude = 10;
                var delta_scale = ((Math.sin(t / breath_speed) + 1) / 2) / breath_amplitude;
                var scale = 1 - delta_scale;
                return "translate("+x+" "+y+") scale("+scale+") translate(-"+x+" -"+y+")";
            });
        });
    },

    colorPicker: function (title, container, defaultColor, x, y, cclass, colorScale) {
        var self = this;
        var rainbow = ["#FFD300", "#FFFF00", "#A2F300", "#00DB00", "#00B7FF", "#1449C4", "#4117C7", "#820AC3", "#DB007C", "#FF0000", "#FF7400", "#FFAA00"];
        colorScale = colorScale || rainbow;
        var color = function (i) {
            return colorScale[i];
        };
        var x = x || 30;
        var y = y || 30;
        var size = 25;
        var inner = 7;
        var cclass = cclass || "colorpicker";

        defaultColor = defaultColor || color(0);

        self.pickedColor = defaultColor;
        self.picked = function (color, idx) {};
        var clicked = function (d, i) {
            self.picked(self.pickedColor, i);
        };

        var pie = d3.layout.pie().sort(null);
        var arc = d3.svg.arc().innerRadius(size - inner).outerRadius(size);

        var foreignObj = container.append("foreignObject")
            .attr("class", "colorpicker")
            .attr("width", 70)
            .attr("height", 70)
            .attr("x", x)
            .attr("y", y)
            //.attr("dy", ".25em")
            .attr("fill", function(d, i) {
                return "#aaa";
            })
            .html("");

        var svg = foreignObj
            .append("svg")
            .attr("class", cclass)
            .attr("width", 70)
            .attr("height", 70)
            .append("g")
            .attr("transform", "translate("+x+","+y+")");

        var plate = svg.append("circle")
            .attr("fill", defaultColor)
            .attr("class", cclass)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("r", size - inner)
            .attr("cx", 0)
            .attr("cy", 0)
            .on("click", clicked);

        var data = [];
        for(i = 0 ; i < colorScale.length; i++)
            data[i] = 1;

        svg.datum(data)
            .selectAll("path")
            .data(pie)
            .enter()
            .append("path")
            .attr("class", cclass)
            .attr("fill", function (d, i) {
                return color(i);
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("d", arc)
            .on("mouseover", function () {
                var fill = d3.select(this).attr("fill");
                self.pickedColor = fill;
                plate.attr("fill", fill);
            })
            .on("click", clicked);

        var title = svg.append("text")
            .attr("fill", "#FFF")
            .attr("class", cclass)
            .attr("transform", "translate(" + (size / 2 - 13) + "," + (size / 2 - 10) + ")")  
            .attr("text-anchor", "middle")
            .text(title);              
    }
}
