/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.dataset = function (json) {
    var dataJson = json,
        data = null,
        metadata = null,
        hasMap = false,
        visualMapKey = null,
        availableParams = [],
        title = null,
        abstract = null;

    /*
     * init
     */
    this.init = function () {

        var tab_key_val = [];
        // Metadata
        metadata = {"map": {}};
        metadata.map.attributes_match = {};
        metadata.curve = {};
        metadata.bar = {};
        metadata.tab = {};
        metadata.brush = {};

        abstract = dataJson.GDAS.Framework.Dataset.Abstract;
        title = dataJson.GDAS.Framework.Dataset.Title;

        if(dataJson.GDAS.Framework.Dataset.Columnset.FrameworkKey.Column) {
            hasMap = true;
            var tabMapKeys = [];

            if(dataJson.GDAS.Framework.Dataset.Columnset.FrameworkKey.Column.length) {
                // Means that there is more than one map key
                dataJson.GDAS.Framework.Dataset.Columnset.FrameworkKey.Column.forEach(function (frameworkkey) {
                    tabMapKeys.push(frameworkkey);
                });
                if(tabMapKeys[0]["@mapmode"] == "flow-source" || tabMapKeys[0]["@mapmode"] == "flow-dest")
                    visualMapKey = tabMapKeys[0]["@jointo"];
            }
            else {
                // Only one map key
                tabMapKeys.push(dataJson.GDAS.Framework.Dataset.Columnset.FrameworkKey.Column);
                visualMapKey = tabMapKeys[0]["@name"];
            }

            tabMapKeys.forEach(function (frameworkkey) {
                // map keys
                var type_col = "string";
                var idx_type_col = frameworkkey["@type"].indexOf("#");
                if(idx_type_col > 0)
                    type_col = frameworkkey["@type"].substring(idx_type_col + 1);
                tab_key_val.push({"column": frameworkkey["@name"], "type": type_col});

                if(frameworkkey["@mapmode"] == "flow-dest" || frameworkkey["@mapmode"] == "flow-source") {
                    // then this is a movement map
                    metadata.map.mode = "flux";
                }
                if(frameworkkey["@mapmode"] == "flow-source") {
                    metadata.map.from = {};
                    metadata.map.from.id_col = frameworkkey["@name"]
                    metadata.map.from.type_zone = frameworkkey["@jointo"];
                    metadata.map.attributes_match.subfilter = {}
                    metadata.map.attributes_match.subfilter.value = metadata.map.from.id_col;
                }
                if(frameworkkey["@mapmode"] == "flow-dest") {
                    metadata.map.to = {};
                    metadata.map.to.id_col = frameworkkey["@name"]
                    metadata.map.to.type_zone = frameworkkey["@jointo"];
                    metadata.map.attributes_match.subfilter2 = {}
                    metadata.map.attributes_match.subfilter2.value = metadata.map.to.id_col;
                }

                fillViewMetaData(frameworkkey, frameworkkey["@curves"],  metadata.curve);

                fillViewMetaData(frameworkkey, frameworkkey["@bars"],  metadata.bar);

                fillViewMetaData(frameworkkey, frameworkkey["@tabular"],  metadata.tab);

                fillViewMetaData(frameworkkey, frameworkkey["@brush"],  metadata.brush);

                fillViewMetaData(frameworkkey, frameworkkey["@map"], metadata.map.attributes_match);

            });
        }

        if(dataJson.GDAS.Framework.Dataset.Columnset.Attributes.Column) {
            var tabColumns = [];
            if(dataJson.GDAS.Framework.Dataset.Columnset.Attributes.Column.length) {
                // Means that there is more than one column    
                dataJson.GDAS.Framework.Dataset.Columnset.Attributes.Column.forEach(function (column) {
                    tabColumns.push(column);
                });
            }
            else {
                // Means that there is only one column 
                tabColumns.push(dataJson.GDAS.Framework.Dataset.Columnset.Attributes.Column);
            }

            tabColumns.forEach(function (column) {

                var type_col = "string";
                var idx_type_col = column["@type"].indexOf("#");
                if(idx_type_col > 0)
                    type_col = column["@type"].substring(idx_type_col + 1);
                tab_key_val.push({"column": column["@name"], "type": type_col});

                fillViewMetaData(column, column.Curves,  metadata.curve);

                fillViewMetaData(column, column.Bars,  metadata.bar);

                fillViewMetaData(column, column.Tabular,  metadata.tab);

                fillViewMetaData(column, column.Brush,  metadata.brush);

                fillViewMetaData(column, column.Map,  metadata.map.attributes_match);
                metadata.map.exclude_crit = D3Viewer.settings.exclude_value;            
            });

            // Add precision column at the end
            tab_key_val.push({"column": "precision", "type": "http://www.w3.org/TR/xmlschema-2/#decimal"});
        }

        // Data
        data = [];
        dataJson.GDAS.Framework.Dataset.Rowset.Row.forEach(function (row) {
            // Format data as an array
            // Data is Keys first, then Vals, in sequencial order
            // (Key are map attributes)
            var data_row = {};
            var idx = 0
            if(hasMap) {
                var tabKeyData = [];
                if(row.K.constructor === Array)
                    row.K.forEach(function (key) {
                        tabKeyData.push(key);
                    });
                else
                    tabKeyData.push(row.K);

                tabKeyData.forEach(function (key) {
                    data_row[tab_key_val[idx].column] = processTypeValue(key, tab_key_val[idx].type);
                    idx++;
                });
            }
            var tabValData = [];
            if(row.V.constructor === Array)
                row.V.forEach(function (key) {
                    tabValData.push(key);
                });
            else
                tabValData.push(row.V);

            tabValData.forEach(function (val) {
                data_row[tab_key_val[idx].column] = processTypeValue(val, tab_key_val[idx].type);
                idx++;
            });

            data.push(data_row);
        });
    };

    /*
     * Get title
     */
    this.getTitle = function () {
        return title;
    }

    /*
     * Get abstract
     */
    this.getAbstract = function () {
        return abstract;
    }

    /*
     * Fill metadata for a specific view
     */
    fillViewMetaData = function (column, view, viewMeta) {
        if(view == "abscissa") {
            viewMeta.xcrit = {};
            viewMeta.xcrit.value = column["@name"];
            if(column.Title != "" && column.Title != undefined)
                viewMeta.xcrit.label = column.Title;
            else
                viewMeta.xcrit.label = column["@name"];
            fillAvailableParamsList(viewMeta.xcrit);
        }
        if(view == "ordinate") {
            viewMeta.ycrit = {};
            viewMeta.ycrit.value = column["@name"];  
            if(column.Title != "")
                viewMeta.ycrit.label = column.Title;
            else
                viewMeta.ycrit.label = column["@name"];
            // No need to make ordinate param available for beeing interchangeable
        }
        if(view == "filter") {
            viewMeta.filter = {};
            viewMeta.filter.value = column["@name"];
            if(column.Title != "")
                viewMeta.filter.label = column.Title;
            else
                viewMeta.filter.label = column["@name"];
            fillAvailableParamsList(viewMeta.filter);
        }
        if(view == "subfilter") {
            viewMeta.subfilter = {};
            viewMeta.subfilter.value = column["@name"];
            if(column.Title != "")
                viewMeta.subfilter.label = column.Title;
            else
                viewMeta.subfilter.label = column["@name"];
            fillAvailableParamsList(viewMeta.subfilter);
        }
        viewMeta.exclude_crit = D3Viewer.settings.exclude_value;
    }

    /*
     * Fill available params list
     */
    fillAvailableParamsList = function (param) {
        var isPresent = false;
        availableParams.forEach(function (av_param) {
            if(av_param.value == param.value)
                isPresent = true;
        });
        if(!isPresent)
            availableParams.push(param);
    }

    /*
     * Get param from available params list
     */
    getParamFromAvailableParamsList = function (value) {
        var param = null;
        availableParams.forEach(function (av_param) {
            if(av_param.value == value) {
                param = av_param;
            }
        });
        return param;
    }

    /*
     * Display filters to user
     */
    this.displayFilters = function (view) {
        var filter_container = $("#filter_selector");
        filter_container.empty();

        var label = "<div class='param_label' id='xcrit'></div>";
        filter_container.append(label);
        $("#xcrit").append(i18n.t("filters.xcrit"));
        var xcritList = $("<select/>")
                .attr("id", "xcrit_list")
                .appendTo(filter_container);

        label = "<div class='param_label' id='filter'></div>";
        filter_container.append(label);
        $("#filter").append(i18n.t("filters.filter"));
        var filterList = $("<select/>")
                .attr("id", "filter_list")
                .appendTo(filter_container);

        label = "<div class='param_label' id='subfilter'></div>";
        filter_container.append(label);
        $("#subfilter").append(i18n.t("filters.subfilter"));
        var subfilterList = $("<select/>")
                .attr("id", "subfilter_list")
                .appendTo(filter_container);

        // Insert a blank value
        xcritList.append($("<option />").val("").text("---"));
        filterList.append($("<option />").val("").text("---"));
        subfilterList.append($("<option />").val("").text("---"));

        // Fill a list with xcrit, ycrit, filter and subfilter
        switch(view) {
            case "bar":
                filter_list = $('#filter_list');
                availableParams.forEach(function (param) {
                    filterVal = param.value;
                    if(param.label)
                        filterVal = param.label;

                    xcritList.append($("<option />").val(param.value).text(filterVal));
                    filterList.append($("<option />").val(param.value).text(filterVal));
                    subfilterList.append($("<option />").val(param.value).text(filterVal));

                    if(metadata.bar.xcrit.value == param.value)
                        xcritList.val(param.value);
                    if(metadata.bar.filter)
                        if(metadata.bar.filter.value == param.value)
                            filterList.val(param.value);
                    if(metadata.bar.subfilter)
                        if(metadata.bar.subfilter.value == param.value)
                            subfilterList.val(param.value);
                });
                break;
            case "curve":
                filter_list = $('#filter_list');
                availableParams.forEach(function (param) {
                    xcritList.append($("<option />").val(param.value).text(param.label));
                    filterList.append($("<option />").val(param.value).text(param.label));
                    subfilterList.append($("<option />").val(param.value).text(param.label));

                    if(metadata.curve.xcrit.value == param.value)
                        xcritList.val(param.value);
                    if(metadata.curve.filter)
                        if(metadata.curve.filter.value == param.value)
                            filterList.val(param.value);
                    if(metadata.curve.subfilter)
                        if(metadata.curve.subfilter.value == param.value)
                            subfilterList.val(param.value);
                });
                break;
            case "map":
            case "tab":
                // Display nothing
                filter_container.empty();
                break;
        }

        switch(view) {
            case "bar":
                var button = $('<button/>')
                    .text('Ok')
                    .click(function () {
                        // process param changes
                        xcrit = getParamFromAvailableParamsList(xcritList.val());
                        metadata.bar.xcrit = xcrit;

                        filter = getParamFromAvailableParamsList(filterList.val());
                        if(metadata.bar.filter) 
                            metadata.bar.filter = filter;

                        subfilter = getParamFromAvailableParamsList(subfilterList.val()); 
                        if(metadata.bar.subfilter) 
                            metadata.bar.subfilter = subfilter;

                        // Reprocess current bar
                        D3Viewer.mainView.loadBars(D3Viewer.mainView.currentDataSet);

                    });
                filter_container.append(button);
                break;
            case "curve":
                var button = $('<button/>')
                    .text('Ok')
                    .click(function () {
                        // process param changes
                        xcrit = getParamFromAvailableParamsList(xcritList.val());
                        metadata.curve.xcrit = xcrit;

                        filter = getParamFromAvailableParamsList(filterList.val());
                        if(metadata.curve.filter) 
                            metadata.curve.filter = filter;

                        subfilter = getParamFromAvailableParamsList(subfilterList.val()); 
                        if(metadata.curve.subfilter) 
                            metadata.curve.subfilter = subfilter;

                        // Reprocess current curve
                        D3Viewer.mainView.loadCurves(D3Viewer.mainView.currentDataSet);

                    });
                filter_container.append(button);
                break;  
        }
    };

    /*
     * Process string or decimal values
     */
    processTypeValue = function (value, type) {
        var possibleNumberTypes = ["decimal", "float", "double", "integer", "long"];
        var idx_type = possibleNumberTypes.indexOf(type)
        if(idx_type >= 0) {
            // means that this column is a number
            return value * 1.0;
        }
        return value;
    };

    /*
     * Get metadata
     */
    this.getMetaData = function () {
        return metadata;
    };

    /*
     * Get data
     */
    this.getData = function () {
        return data;
    };

    /*
     * Get map mode
     */
    this.getMapMode = function () {
        return {"mode": metadata.map.mode, "from": metadata.map.from, "to": metadata.map.to};
    };

    /*
     * Get attributes match
     */
    this.getMapAttributesMatch = function () {
        return  metadata.map.attributes_match;
    };

    /*
     * Get visual map key
     */
    this.getVisualMapKey = function () {
        return visualMapKey;
    };

    // Initialize object
    this.init();
}
