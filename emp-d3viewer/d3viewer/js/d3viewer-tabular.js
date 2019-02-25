/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.tabular = function (pContainer) {
    "use strict";
    var container = pContainer,
        dataJson = null,
        valXCriteria = null,
        valYCriteria = null,
        valFilter = null,
        valSubFilter = null,
        valCriteriaExclude = null,
        valCriteriaExcludeEnabled = false,
        xDomain = null,
        yDomain1 = null,
        ySubDomain1 = null,
        tabCriterias = null;

    /*
     * Json Data
     */
    this.setJson = function (json) {
        dataJson = json;
    };

    /*
     * Set criterias
     */
    this.setCriteria = function (criteria) {
        tabCriterias = criteria;
        valXCriteria = tabCriterias.xcrit;
        valYCriteria = tabCriterias.ycrit;
        valFilter = tabCriterias.filter;
        valSubFilter = tabCriterias.subfilter;
        valCriteriaExclude = tabCriterias.exclude_crit;

        // Get domains
        if(valXCriteria)
            xDomain = d3.scale.ordinal().domain(dataJson.map(function (d) { return d[valXCriteria.value]; })).domain();
        else
            xDomain = [undefined];
        if(valFilter)
            yDomain1 = d3.scale.ordinal().domain(dataJson.map(function (d) { return d[valFilter.value]; })).domain();
        else
            yDomain1 = [undefined];
        if(valSubFilter)
            ySubDomain1 = d3.scale.ordinal().domain(dataJson.map(function (d) { return d[valSubFilter.value]; })).domain();
        else
            ySubDomain1 = [undefined];
    };

    /*
     * Tabular representation
     */
    var drawTab = function () {
        $(container).empty();

        if (valCriteriaExclude) {
            // Add a check box to enable / disabled totals
            /*
            if (valCriteriaExcludeEnabled)
                $(container).append("<INPUT type='checkbox' id='total' value='Disable totals' checked> " + i18n.t("chart.disable_totals"));
            else
                $(container).append("<INPUT type='checkbox' id='total' value='Disable totals'> " + i18n.t("chart.disable_totals"));
            */ // Not needed anymore

            //Add export link
            $(container).append("<a href='#' class='export'>" + i18n.t("chart.export_csv") + "</a>");
            $(".export").on('click', function (event) {
                    D3Viewer.mainView.tabular.exportTableToCSV.apply(this, [$('table.tabular'), 'out.csv']);
                });

            $("#total").change(function() {
                if(this.checked) {
                    valCriteriaExcludeEnabled = true;
                } else {
                    valCriteriaExcludeEnabled = false;
                }
                updateTabular();
            });
        }

        var maxValY = d3.max(dataJson, function(d) {
            if (valCriteriaExclude && valCriteriaExcludeEnabled) {
                if(valSubFilter) {
                    if (d[valXCriteria.value] == valCriteriaExclude || d[valSubFilter.value] == valCriteriaExclude)
                        return 0;
                    else {
                        return d[valYCriteria.value];
                    }
                }
                else {
                    if (d[valXCriteria.value] == valCriteriaExclude)
                        return 0;
                    else {
                        return d[valYCriteria.value];
                    }
                }

            }
            else {
                return d[valYCriteria.value];
            }
        })

        var coeff = 100 / maxValY;

        // These values are to be process separatly because non usefull on the result ?        
        var tab_view = "<table class='tabular tablesorter'>"; 

        tab_view += "<thead><tr><th></th>";
        if (valSubFilter && valSubFilter.value)
            tab_view += "<th></th>"; 

        var tabColValues = [];
        for(var xDom in xDomain) {
            var title = xDomain[xDom];
            if(title)
                tabColValues.push(title);
            tabColValues
            if(!title)
                title = "&nbsp;";
            tab_view += "<th class='header'>" + title + "</th>";
            // Add hidden coloumn for precision
            tab_view += "<th class='header precision'>" + title + " (Précision)</th>";
        }
        tab_view += "</tr></thead><tbody>";

        for(var yDom in yDomain1) {

            var yParam = yDomain1[yDom];
            // !! If we use table sorting, we cannot use anymore rowspaning :
            //tab_view += "<tr><td class='filter' rowspan='"+ySubDomain1.length+"'>" + yParam + "</td>";

            for(var ySubDom in ySubDomain1) {

                // Warning: the line below is in this loop because of table sorting
                tab_view += "<tr><td class='filter'>" + yParam + "</td>";

                var xParam = ySubDomain1[ySubDom];
                if (xParam) {
                    tab_view += "<td class='subfilter'>" + xParam + "</td>";
                }
                var dataFiltered = dataJson.filter(function (d) { 
                    if(valSubFilter)
                        return (d[valFilter.value] == yParam) && (d[valSubFilter.value] == xParam);
                    else {
                        var res = false;
                        //if(d[valFilter.value] == yParam)
                        if(valFilter && (d[valFilter.value] == yParam))
                            res = true;
                        if(res && valSubFilter && (d[valSubFilter.value] == xParam))
                            res = true;
                        return res;
                    }
                });

                if(tabColValues.length > 0 && valXCriteria) {
                    for(var col in tabColValues) { // we must ensure that current col is the good one (some views has no value in column instead of 0)
                        var currCol = tabColValues[col];
                        var val = "";
                        var precision = "";
                        dataFiltered.forEach(function (d) {
                            var cclass= "ratio";
                            if(currCol == d[valXCriteria.value]) { // good column
                                val = d[valYCriteria.value];
                                precision = "";
                                if(d["precision"])
                                    precision = d["precision"];
                            }
                            if(valCriteriaExcludeEnabled && (d[valXCriteria.value] == valCriteriaExclude))
                                cclass = "ratio disabled";
                            if(valSubFilter)
                                if(valCriteriaExcludeEnabled && (d[valSubFilter.value] == valCriteriaExclude))
                                    cclass = "ratio disabled";

                        });
                        tab_view += "<td class='marginless'><div class='"+cclass+"' style='width:"+val * coeff+"%;'>" + val + "</div></td>";
                        tab_view += "<td class='marginless precision'><div>" + precision + "</div></td>"; // Precision
                    }
                } else {
                    dataFiltered.forEach(function (d) {
                        var val = d[valYCriteria.value];
                        var cclass= "ratio";

                        if(valCriteriaExcludeEnabled && (d[valSubFilter.value] == valCriteriaExclude))
                            cclass = "ratio disabled";

                        precision = "";
                        if(d["precision"])
                            precision = d["precision"];

                        tab_view += "<td class='marginless'><div class='"+cclass+"' style='width:"+val * coeff+"%;'>" + val + "</div></td>";
                        tab_view += "<td class='marginless precision'><div>" + precision + "</div></td>"; // Precision
                    });
                }
                tab_view += "</tr>";
            }
            tab_view += "</tr>";
        }

        tab_view += "</tbody></table>";
        $(container).append(tab_view);

        // Enable table sorting
        $("table.tabular").tablesorter();
    }

    var updateTabular = function () {
        drawTab();
    }

    /*
     * Tabular representation
     */
    this.drawTabular = function () {
        drawTab();
    }

    /*
     * CSV export
     */
    this.exportTableToCSV = function ($table, filename) {
        var tabSearch = ["th", "td"];
        var csv = "";
        for(var search in tabSearch) { 
            var $rows = $table.find('tr:has('+tabSearch[search]+')' ),

                // Temporary delimiter characters unlikely to be typed by keyboard
                // This is to avoid accidentally splitting the actual contents
                tmpColDelim = String.fromCharCode(11), // vertical tab character
                tmpRowDelim = String.fromCharCode(0), // null character

                // actual delimiter characters for CSV format
                colDelim = '";"',
                rowDelim = '"\r\n"';

            var headerRowDelim = '';
            if(tabSearch[search] == "th")
                headerRowDelim = '\r\n';
            // Grab text from table into CSV formatted string
            csv += '"' + $rows.map(function (i, row) {
                var $row = $(row),
                    $cols = $row.find(tabSearch[search]);

                return $cols.map(function (j, col) {
                    var $col = $(col),
                        text = $col.text();

                    return text.replace(/"/g, '""'); // escape double quotes

                }).get().join(tmpColDelim);

            }).get().join(tmpRowDelim)
                .split(tmpRowDelim).join(rowDelim)
                .split(tmpColDelim).join(colDelim) + '"'
                + headerRowDelim;
        }

        // Data URI
        var csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);

        $(this)
            .attr({
                'download': "export.csv",
                'href': csvData,
                'target': '_blank'
        });
    }

}