/**
 * @author Sylvain Beorchia / http://www.oslandia.com/
 */

D3Viewer.mainView = {
    map: null,
    overviewmap: null,
    brush: null,
    bars: null,
    curves: null,
    tabular: null,
    activeZone: null,
    datasetlist: null,
    currentDataSet: null,
    currentDataView: null,
    tabMenu: ["menu_map", "menu_curve", "menu_tab", "menu_bar", "menu_print"],
    proxy: "",

    init: function(){

        // Init i18n
        i18n.init(function (t) {
            i18n.init({ lng: "fr-FR" });
            $("body").i18n();
        });

        // If running on localhost, add a proxy
        if(D3Viewer.settings.useProxy)
            this.proxy = D3Viewer.settings.proxy;

        $(document).ready(function () {

            var formatOutput = "&output=json";
            //var formatOutput = "";

            // Build menu
            var menu = $('ul.nav')
            $.each(D3Viewer.mainView.tabMenu, function(i)
            {
                var li = $('<li/>')
                    .attr("id", D3Viewer.mainView.tabMenu[i])
                    .addClass('menu_icon')
                    .appendTo(menu);
            });

            // Add category list
            var li = $('<li/>')
                    .appendTo(menu);
            var categoryList = $('<select/>')
                    .attr("id", "category_list")
                    .appendTo(li);
            var tabCategory = [];

            // Add data list
            var li = $('<li/>')
                    .appendTo(menu);
            var dataList = $('<select/>')
                    .attr("id", "data_list")
                    .appendTo(li);

            // Load config
            var json = null,
                data_list = $("#data_list");
                category_list = $("#category_list");

            queue()
                .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.datasetListUrl)
                .await(function (error, json) {
                    var frameworks = json.DatasetDescriptions.Framework;
                    // Search for the one with datasets (others are for admin)
                    var datasetlist = null;
                    frameworks.forEach(function (framework) {
                        if(framework.Dataset)
                            datasetlist = framework.Dataset;
                            return;
                    });

                    // Fill category
                    datasetlist.forEach(function (dataset) {
                        if(tabCategory.indexOf(dataset.Category) < 0)
                            tabCategory.push(dataset.Category);
                    });
                    defaultCategory = tabCategory[0];

                    tabCategory.forEach(function (category) {
                        category_list.append($("<option />").val(category).text(category));       
                    });

                    // Fill data selector
                    datasetlist.forEach(function (dataset) {
                        if(dataset.Category == defaultCategory)
                            data_list.append($("<option />").val(dataset.DescribeDataRequest['@xlink:href'].replace("DescribeData", "GetData") + formatOutput).text(dataset.Title));
                    });

                    // Store dataset
                    D3Viewer.mainView.datasetlist = datasetlist;

                    // Launch app
                    D3Viewer.mainView.setStatus(true); // Loading message
                    queue()
                        .defer(d3.json, D3Viewer.mainView.proxy + datasetlist[0].DescribeDataRequest['@xlink:href'].replace("DescribeData", "GetData") + formatOutput) // first dataset
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.zonesUrl)
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.neighbourZonesUrl)
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.neighbourCountriesUrl)
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.townsUrl)
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.de10Url)
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.de30Url)
                        .defer(d3.json, D3Viewer.mainView.proxy + D3Viewer.settings.dtirUrl)
                        .await(function(error, data, zones, neighbourZones, neighbourCountries, towns, de10, de30, dtir) {
                            D3Viewer.mainView.setStatus(false);
                            if(error)
                                console.log(error);
                            D3Viewer.mainView.loadFirstDataSet(data, zones, neighbourZones, neighbourCountries, towns, de10, de30, dtir, datasetlist[0]);
                        });
                });

            // When dataset change, reload new config
            var datasel = null;
            $("#data_list").change(function () {
                dataset_url = $(this).val();
                D3Viewer.mainView.setStatus(true);
                queue()
                    .defer(d3.json, D3Viewer.mainView.proxy + dataset_url)
                    .await(function (error, data) {
                        //D3Viewer.mainView.loadConfig(data, dataset_url);
                        D3Viewer.mainView.loadConfig(data);
                        D3Viewer.mainView.setStatus(false);
                    });
            });

            // When category change, update dataset list
            var categorysel = null;
            $("#category_list").change(function () {
                defaultCategory = $(this).val();
                // Reset datasect list
                data_list.find('option').remove().end();  
                // Add default
                data_list.append($("<option />").val("").text("------"));
                D3Viewer.mainView.datasetlist.forEach(function (dataset) {
                        if(dataset.Category == defaultCategory)
                            data_list.append($("<option />").val(dataset.DescribeDataRequest['@xlink:href'].replace("DescribeData", "GetData") + formatOutput).text(dataset.Title));
                    });
            });

            // Make data selector always visible
            /*
            var s = $("#data_selector");
            var pos = s.position();
            $(window).scroll(function () {
                var windowpos = $(window).scrollTop();
                if (windowpos >= pos.top) {
                    s.addClass("stick");
                } else {
                    s.removeClass("stick");
                }
            });
            */

            // Hide all views
            D3Viewer.mainView.tabMenu.forEach(function (menu) {
                var div = menu.replace("menu", "resizable");
                $("#" + div).hide();
            });

            // Hide all help
            $(".help_map").hide();
            $(".help_bars").hide();
            $(".help_tabular").hide();

            // Menu
            D3Viewer.mainView.tabMenu.forEach(function (menu) {
                var id = menu.replace("menu_", "");
                var div = menu.replace("menu", "resizable");
                $("#"+menu).click(function () {
                    if(id == "print") {
                        // Special case for print
                        window.print();
                        return;
                    }

                    $(".viewer_part").hide();
                    $(".menu_icon").removeClass("active");
                    $("#" + div).show();
                    $("#" + menu).addClass("active");

                    D3Viewer.mainView.currentDataView = id;
                    if(id == "map") {
                        D3Viewer.mainView.loadDataOnMap(D3Viewer.mainView.currentDataSet);
                        $(".help_map").show();
                        $(".help_bars").hide();
                        $(".help_tabular").hide();
                        $(".map_specific").show();
                    }
                    if(id == "curve") {
                        D3Viewer.mainView.loadCurves(D3Viewer.mainView.currentDataSet);
                        $(".help_map").hide();
                        $(".help_bars").show();
                        $(".help_tabular").hide();
                        $(".map_specific").hide();
                    }
                    if(id == "bar") {
                        D3Viewer.mainView.loadBars(D3Viewer.mainView.currentDataSet);
                        $(".help_map").hide();
                        $(".help_bars").show();
                        $(".help_tabular").hide();
                        $(".map_specific").hide();
                    }
                    if(id == "tab") {
                         D3Viewer.mainView.loadTabular(D3Viewer.mainView.currentDataSet);  
                        $(".help_map").hide();
                        $(".help_bars").hide();
                        $(".help_tabular").show();
                        $(".map_specific").hide();
                    }

                    // Update params list
                    dataSetObj.displayFilters(id);
                });
            });

            $("#menu_top").click(function () {
                $("html, body").animate({ scrollTop: 0 }, "slow");
            });
        });
     },


    /*
     * Enable / disable menus
     */
    setMenuState: function (dataset) {
        D3Viewer.mainView.tabMenu.forEach(function (menu) {
            $("#" + menu).addClass("inactive");
        });
        if(dataset.Displaymap)
            $("#menu_map").removeClass("inactive");
        if(dataset.Displaycurve)
            $("#menu_curve").removeClass("inactive");
        if(dataset.Displaybar)
            $("#menu_bar").removeClass("inactive");
        if(dataset.Displaytab)
            $("#menu_tab").removeClass("inactive");
        if(dataset.Displayprint)
            $("#menu_print").removeClass("inactive");
    },

    /*
     * Change currentView if needed
     */
    adaptCurrentView: function (dataset) {
        // Change current view if not present in display modes enabled
        if(D3Viewer.mainView.currentDataView == "map" && dataset.Displaymap)
            return;
        if(D3Viewer.mainView.currentDataView == "curve" && dataset.Displaycurve)
            return;
        if(D3Viewer.mainView.currentDataView == "bar" && dataset.Displaybar)
            return;
        if(D3Viewer.mainView.currentDataView == "tab" && dataset.Displaytab)
            return;

        // Else, current view has to be changed
        if(dataset.Displaymap) {
             D3Viewer.mainView.setCurrentView("map")
             return;
        }
        if(dataset.Displaycurve) {
             D3Viewer.mainView.setCurrentView("curve")
             return;
        }
        if(dataset.Displaybar) {
             D3Viewer.mainView.setCurrentView("bar")
             return;
        }
        if(dataset.Displaytab) {
             D3Viewer.mainView.setCurrentView("tab")
             return;
        }
    },

    /*
     * Load initial data
     */
    loadFirstDataSet: function (data_json, map_json, neighbour_json, neighbourcountries_json, towns, de10, de30, dtir, dataset) {
        D3Viewer.mainView.setMenuState(dataset);
        D3Viewer.mainView.currentDataSet = dataset;

        // map
        D3Viewer.mainView.map = new D3Viewer.map("#resizable_map", D3Viewer.settings.widthMap, D3Viewer.settings.heightMap, 
                                                D3Viewer.settings.centerX, D3Viewer.settings.centerY, D3Viewer.settings.initScale);
        D3Viewer.mainView.loadMap(map_json, neighbour_json, neighbourcountries_json, towns, de10, de30, dtir, dataset);

        // overviewmap
        D3Viewer.mainView.overviewmap = new D3Viewer.overviewmap("#mini_map", D3Viewer.mainView.map, D3Viewer.settings.widthMiniMap, D3Viewer.settings.heightMiniMap, 
                                                    D3Viewer.settings.centerX, D3Viewer.settings.centerY, D3Viewer.settings.initOverviewScale);
        D3Viewer.mainView.loadOverviewMap(map_json, dataset);
        D3Viewer.mainView.map.setOverviewMap(D3Viewer.mainView.overviewmap);

        // curves
        D3Viewer.mainView.curves = new D3Viewer.curve("#resizable_curve", D3Viewer.settings.widthChart, D3Viewer.settings.heightChart, 
                                        {bottom: D3Viewer.settings.marginBottomChart, right: D3Viewer.settings.marginRightChart});

        // bars
        D3Viewer.mainView.bars = new D3Viewer.bar("#resizable_bar", D3Viewer.settings.widthChart, D3Viewer.settings.heightChart, 
                                        {bottom: D3Viewer.settings.marginBottomChart, right: D3Viewer.settings.marginRightChart});

        // tabular
        D3Viewer.mainView.tabular = new D3Viewer.tabular("#resizable_tab");

        D3Viewer.mainView.loadConfig(data_json);
    },

    /*
     * When user change the dataset, update all charts and map
     */
    loadConfig: function (data_json) {
        dataSetObj = new D3Viewer.dataset(data_json);

        D3Viewer.mainView.adaptCurrentView(data_json.GDAS.Framework.Dataset);
        D3Viewer.mainView.setMenuState(data_json.GDAS.Framework.Dataset);
        D3Viewer.mainView.currentDataSet = dataSetObj;

        if(D3Viewer.mainView.currentDataView == "map")
            D3Viewer.mainView.loadDataOnMap(dataSetObj);
        if(D3Viewer.mainView.currentDataView == "curve")
            D3Viewer.mainView.loadCurves(dataSetObj);
        if(D3Viewer.mainView.currentDataView == "bar")
            D3Viewer.mainView.loadBars(dataSetObj);
        if(D3Viewer.mainView.currentDataView == "tab")
            D3Viewer.mainView.loadTabular(dataSetObj);

        // Display params to the user, so he can modify them
        dataSetObj.displayFilters(D3Viewer.mainView.currentDataView);     

        // Display abstract
        $("#abstract").empty();
        abstract = dataSetObj.getAbstract();
        $("#abstract").text(abstract);

        // Fill title + desc print specific 
        title = dataSetObj.getTitle();
        $("#title_print").html(title + "<br/><i>" + abstract + "</i>");
    },

    /*
     * Set current view
     */
    setCurrentView: function (mode) {
        D3Viewer.mainView.tabMenu.forEach(function (menu) {
                var div = menu.replace("menu", "resizable");
                $("#" + div).hide();
            });
        $("#resizable_" + mode).show();
        D3Viewer.mainView.currentDataView = mode;
    },

    loadMap: function (map_json, neighbour_json, neighbourcountries_json, towns, de10, de30, dtir, dataset) {
        D3Viewer.mainView.map.setJson(map_json);
        D3Viewer.mainView.map.setNeighbourJson(neighbour_json);
        D3Viewer.mainView.map.setNeighbourCountriesJson(neighbourcountries_json);
        D3Viewer.mainView.map.setTownsJson(towns);
        D3Viewer.mainView.map.setDe10Json(de10);
        D3Viewer.mainView.map.setDe30Json(de30);
        D3Viewer.mainView.map.setDtirJson(dtir);
        D3Viewer.mainView.map.setZonesDef(D3Viewer.settings.mapZoneDef, "#map_zone_selector");
        D3Viewer.mainView.map.setAttributesMatch(D3Viewer.settings.mapAttributesMatch);
        D3Viewer.mainView.map.drawMap();
    },

    loadDataOnMap: function (dataset) {
        D3Viewer.mainView.map.setDataJson(dataset.getData());
        D3Viewer.mainView.map.setTypeMap(dataset.getMapMode());
        D3Viewer.mainView.map.setAttributesDataMatch(dataset.getMapAttributesMatch());
        D3Viewer.mainView.map.setVisualMapKey(dataset.getVisualMapKey());
        D3Viewer.mainView.map.drawDataOnMap(false);
    },

    loadOverviewMap: function (map_json, dataset) {
        D3Viewer.mainView.overviewmap.setCriteria(D3Viewer.settings.overviewmap_settings);
        D3Viewer.mainView.overviewmap.setAttributesMatch(D3Viewer.settings.mapAttributesMatch);
        D3Viewer.mainView.overviewmap.setJson(map_json);
        D3Viewer.mainView.overviewmap.drawMap();
    },

    loadCurves: function (dataset) {
        D3Viewer.mainView.curves.setJson(dataset.getData());
        D3Viewer.mainView.curves.setCriteria(dataset.getMetaData().curve);
        D3Viewer.mainView.curves.drawCurves();
    },

    loadBars: function (dataset) {
        D3Viewer.mainView.bars.setJson(dataset.getData());
        D3Viewer.mainView.bars.setCriteria(dataset.getMetaData().bar);
        D3Viewer.mainView.bars.drawMultiBars();
    },

    loadTabular: function (dataset) {
        D3Viewer.mainView.tabular.setJson(dataset.getData());
        D3Viewer.mainView.tabular.setCriteria(dataset.getMetaData().tab);
        D3Viewer.mainView.tabular.drawTabular();
    },

    loadBrush: function (dataset) {
        D3Viewer.mainView.brush.setJson(dataset.getData());
        D3Viewer.mainView.brush.setCriteria(dataset.getMetaData().brush);
        D3Viewer.mainView.brush.drawBrush();
    },

    /*
     * setStatus
     * Show or hide loading modal
     */
    setStatus: function (loading) {
        if(loading) {
            $('#loadingModal').modal('show');
        } else {
            $('#loadingModal').modal('hide');
        }
    }
}

D3Viewer.mainView.init();