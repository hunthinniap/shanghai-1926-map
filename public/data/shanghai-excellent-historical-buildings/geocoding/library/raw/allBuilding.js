$(function() {
	
	var pagerCallBack = function(page_id){
		$('#pageth').val(page_id);
		mapInit();
		selectWhichBuildingToSearch();
	}
	
	// 根据选中的radio, 切换placeholder的值
	$("input[name='chooseBuilding']").click(function(){
		mapInit();
		var chooseBuilding = $("input[name='chooseBuilding']:checked").val();
		if("wuKangRoad" == chooseBuilding){
			$('#txtSearch').attr('placeholder','在此输入建筑名，建筑结构，建筑风格，所在马路、地址');
			$('#txtSearch').val("");
			loadWuKangRoad();
		} if("redTravel" == chooseBuilding){
			$('#txtSearch').attr('placeholder','在此输入景点，所在区，保护类型，所在马路、地址');
			$('#txtSearch').val("");
			loadRedTravel();
		}
		if("excellentHistory" == chooseBuilding){
			$('#txtSearch').attr('placeholder','在此输入景点，所在区，保护类型，所在马路、地址');
			$('#txtSearch').val("");
			loadExcellentHistory();
		}
	});
	
	// 根据选中的radio, 进行对应的数据查询
	var selectWhichBuildingToSearch = function() {
		mapInit();
		var chooseBuilding = $("input[name='chooseBuilding']:checked").val();
		if("wuKangRoad" == chooseBuilding){
			loadWuKangRoad();
		}
		if("redTravel" == chooseBuilding){
			loadRedTravel();
		}
		if("excellentHistory" == chooseBuilding){
			loadExcellentHistory();
		}
	}

	var loadWuKangRoad = function() {
		var freetext = $('#txtSearch').val();
		var pageth = $('#pageth').val();
		$.post(ctx + "/shnh/wkl/webapi/building/dolist", {freetext: freetext, pageth: pageth}, function(result) {
			var thead = "<tr><th widh='8%'>建筑名</th><th widh='15%'>建筑结构</th><th widh='10%'>建筑风格</th><th widh='10%'>地址</th><th widh='6%'>经度</th><th widh='6%'>纬度</th><th widh='5%'>RDF</th><th widh='8%'>相关事件</th></tr>";
			$("#buildingThead").html(thead);
			var tbody = "";
			$.each(result.detail, function(i) {
				var item = result.detail[i];
				tbody += "<tr>";
				tbody += "<td width='8%'>" + item.name + "<input type='hidden' class='hidUri' value=" + item.uri + "></td>";
				tbody += "<td width='15%'>" + item.architectureStructure + "</td>";
				tbody += "<td width='10%'>" + item.architecturalStyle + "</td>";
				tbody += "<td width='10%'>" + item.address + "</td>";
				tbody += "<td width='6%'>" + item.long + "</td>";
				tbody += "<td width='6%'>" + item.lat + "</td>";
				tbody += "<td width='5%'><a id='btnRDF' href='javascript:void(0)' rel='"+item.uri+"'><img style='width:15px;height:15px;'  src='"+ctx+"/res/images/rdf.gif'></td></a>";
				tbody += "<td width='8%'><a id='btnEVENT' href='javascript:void(0)' rel='"+item.uri+"'><img style='width:30px;height:30px;'  src='"+ctx+"/res/images/event.png'></td></a>";
				tbody += "</tr>";
			});
			$("#buildingTbody").html(tbody);
			// 分页
			$("#pager").pagination(result.pager, pagerCallBack);
			$('#pageth').val(1);
			// 显示总数量(条)
			$("#count").html("").append(result.pager.rowCount);
			$("#buildingName").html("武康路建筑");
		});
	};
	
	var loadRedTravel = function() {
		var freetext = $('#txtSearch').val();
		var pageth = $('#pageth').val();
		var iflimit = $('#iflimit').val();
		$.ajax({
			  url: ctx +"/shnh/gmwx/webapi/architecture/getArchitectures",
			  type:"GET",
			  data: {freetext: freetext, isRed: "1", key: "02cdb77b436d4dc383f1b64ebd86b9dc025622ac", pageth: pageth, iflimit: iflimit},
			  dataType:"json",
			  success: function(result){
				  var thead = "<tr><th width='7%'>所在区</th>" +
				  		"<th width='7%'>景点名</th>" +
				  		"<th width='8%'>保护类型</th>" +
				  		"<th width='10%' style=‘padding-left: 30px;’>地址</th>" +
				  		"<th width='26%' style=‘text-align: center;’>简介</th>" +
				  		"<th width='8%'>经度</th><th width='8%'>纬度</th>" +
				  		"<th width='5%'>RDF</th>" +
				  		"<th width='5%'>事件</th></tr>";
				  $("#buildingThead").html(thead);
				  var tbody = "";
				  $.each(result.data, function(i) {
					var d = result.data[i];
					tbody += "<tr>";
					tbody += "<td>" + d.placeValue + "</td>";
					tbody += "<td>" + d.nameS + "</td>";
					tbody += "<td>" + d.type + "</td>";
					tbody += "<td>" + d.address + "</td>";
					tbody += "<td>" + d.des + "</td>";
					tbody += "<td>" + d.long + "</td>";
					tbody += "<td>" + d.lat + "</td>";
					tbody += "<td><a id='btnRDF' href='javascript:void(0)' rel='"+ d.uri +"'><img style='width:15px;height:15px;'  src='"+ctx+"/res/images/rdf.gif'></a></td>";
					tbody += "<td><a id='btnEVENT' href='javascript:void(0)' rel='"+ d.uri +"'><img style='width:30px;height:30px;'  src='"+ctx+"/res/images/event.png'></a></td>";
					tbody += "</tr>";
				  })
				  $("#buildingTbody").html(tbody);
				// 分页
				$("#pager").pagination(result.pager, pagerCallBack);
				$('#pageth').val(1);
				// 显示总数量(条)
				$("#count").html("").append(result.pager.rowCount);
				$("#buildingName").html("红色旅游建筑");
			  }
		});
	};
	
	var loadExcellentHistory = function() {
		var freetext = $('#txtSearch').val();
		var pageth = $('#pageth').val();
		var iflimit = $('#iflimit').val();
		$.ajax({
			  url: ctx+"/shnh/gmwx/webapi/architecture/getArchitectures",
			  type:"GET",
			  data: {freetext: freetext, isRed: "3", key: "02cdb77b436d4dc383f1b64ebd86b9dc025622ac", pageth: pageth, iflimit: iflimit},
			  dataType:"json",
			  success: function(result){
				  var thead = "<tr><th width='7%'>所在区</th>" +
				  		"<th width='7%'>景点名</th>" +
				  		"<th width='8%'>保护类型</th>" +
				  		"<th width='10%' style='padding-left: 30px;'>地址</th>" +
				  		"<th width='26%' style='text-align: center;'>简介</th>" +
				  		"<th width='8%'>经度</th><th width='8%'>纬度</th>" +
				  		"<th width='5%'>RDF</th>" +
				  		"<th width='5%'>事件</th></tr>";
				  $("#buildingThead").html(thead);
				  var tbody = "";
				  $.each(result.data, function(i) {
					var d = result.data[i];
					tbody += "<tr>";
					tbody += "<td>" + d.placeValue + "</td>";
					tbody += "<td>" + d.nameS + "</td>";
					tbody += "<td>" + d.type + "</td>";
					tbody += "<td>" + d.address + "</td>";
					tbody += "<td>" + d.des + "</td>";
					tbody += "<td>" + d.long + "</td>";
					tbody += "<td>" + d.lat + "</td>";
					tbody += "<td><a id='btnRDF' href='javascript:void(0)' rel='"+ d.uri +"'><img style='width:15px;height:15px;'  src='"+ctx+"/res/images/rdf.gif'></a></td>";
					tbody += "<td><a id='btnEVENT' href='javascript:void(0)' rel='"+ d.uri +"'><img style='width:30px;height:30px;'  src='"+ctx+"/res/images/event.png'></a></td>";
					tbody += "</tr>";
				  })
				  $("#buildingTbody").html(tbody);
				// 分页
				$("#pager").pagination(result.pager, pagerCallBack);
				$('#pageth').val(1);
				// 显示总数量(条)
				$("#count").html("").append(result.pager.rowCount);
				$("#buildingName").html("上海市优秀历史建筑");
			  }
		});
	};
	
	// btnRDF
	$("#buildingTbody").delegate("#btnRDF","click",function(){
		var chooseBuilding = $("input[name='chooseBuilding']:checked").val();
		if("wuKangRoad" == chooseBuilding){
			$.post(ctx + "/shnh/wkl/webapi/building/getRdf?dataUri=" + $(this).attr('rel'), null, function(result) {
				var html = (juicer(getTemplate("rdfs"), result));
				$("#RDFid").html(html);
				var $modal = $('#your-modal');
				$modal.modal({
					width : 1200
				});
			});
		} else {
			$.get(ctx+"/shnh/gmwx/webapi/architecture/getRdf?graph=http://red.library.sh.cn/graph/building&uri=" + $(this).attr('rel'), null, function(result) {
				var html = (juicer(getTemplate("rdfs"), result));
				$("#RDFid").html(html);
				var $modal = $('#your-modal');
				$modal.modal({
					width : 1200
				});
			});
		}
	});
	
	// btnEVENT
	$("#buildingTbody").delegate("#btnEVENT","click",function(){
		var chooseBuilding = $("input[name='chooseBuilding']:checked").val();
		if("wuKangRoad" == chooseBuilding){
			$.post(ctx + "/shnh/wkl/webapi/building/getEventListByBuri?buri=" + $(this).attr('rel'), null, function(result) {
// var html = (juicer(getTemplate("events"), result));
// $(".am-modal-bd").html(html);
				var html = "";
				var pTag = "";// 存放没有数据的元素
				$("#cd-timeline").html(html);
				if($.isEmptyObject(result.events)){
					$("#cd-timeline").hide();
					if($("#pdiv p").length <= 0){// 判断p元素是否存在
						pTag = "<p style='margin-top: 20px; padding-left: 20px;'>暂无数据</p>";
						$("#pdiv").append(pTag);
					}
				} else {
					$("#cd-timeline").show();
					if($("#pdiv p").length > 0){// 判断p元素是否存在
						$("#pdiv p").remove();
					}
					$.each(result.events, function(i) {
						var d = result.events[i];
						html += "<div class='cd-timeline-block'>"
						html += "<div class='cd-timeline-img cd-location'>"
						html += "<img src='"+ctx+"/res/timeline/images/cd-icon-location.svg' alt='Location'>"
						html += "</div>"
						html += "<div class='cd-timeline-content'>"
						html += "<p>"+ d.description.trim() +"</p>"
						if(d.endedAtTime == null || d.endedAtTime == "" || d.endedAtTime == undefined){
							html += "<span class='cd-date'>"+d.startedAtTime.trim()+"</span>"
						} else {
							html += "<span class='cd-date'>"+d.startedAtTime.trim()+" - "+d.endedAtTime.trim()+"</span>"
						}
						html += "</div>"
						html += "</div>"
					});
				}
				$("#cd-timeline").html(html);
				var $modal = $('#your-event');
				$modal.modal({
					width : 900
				});
			});
		} else {
			$.get(ctx+"/shnh/gmwx/webapi/architecture/getArchitectureDetail?uri=" + $(this).attr('rel')+"&key="+'02cdb77b436d4dc383f1b64ebd86b9dc025622ac', null, function(resultJSON) {
				var result = $.parseJSON(resultJSON);
				var html = "";
				var pTag = "";// 存放没有数据的元素
				$("#cd-timeline").html(html);
				if($.isEmptyObject(result.data[0].eventList)){
					$("#cd-timeline").hide();
					if($("#pdiv p").length <= 0){// 判断p元素是否存在
						pTag = "<p style='margin-top: 20px; padding-left: 20px;'>暂无数据</p>";
						$("#pdiv").append(pTag);
					}
				} else {
					$("#cd-timeline").show();
					if($("#pdiv p").length > 0){// 判断p元素是否存在
						$("#pdiv p").remove();
					}
					$.each(result.data[0].eventList, function(i) {
						var d = result.data[0].eventList[i];
						html += "<div class='cd-timeline-block'>"
						html += "<div class='cd-timeline-img cd-location'>"
						html += "<img src='"+ctx+"/res/timeline/images/cd-icon-location.svg' alt='Location'>"
						html += "</div>"
						html += "<div class='cd-timeline-content'>"
						html += "<p>"+ d.description.trim() +"</p>"
						if(d.endedAtTime == null || d.endedAtTime == "" || d.endedAtTime == undefined){
							html += "<span class='cd-date'>"+d.startedAtTime.trim()+"</span>"
						} else {
							html += "<span class='cd-date'>"+d.startedAtTime.trim()+" - "+d.endedAtTime.trim()+"</span>"
						}
						html += "</div>"
						html += "</div>"
					});
				}
				$("#cd-timeline").html(html);
				var $modal = $('#your-event');
				$modal.modal({
					width : 900
				});
			});
		}
	});

	var  mapInit = function() {
	    var that = this;
	    // 新建地图
	    var cluster,marker,map = new AMap.Map('mapSearch',{
	        resizeEnable: true,
	        zoom: 8,
	        center: [121.473658,31.230378]
	    });
	    AMap.plugin(['AMap.ToolBar','AMap.Scale','AMap.OverView','AMap.MarkerClusterer'],function(){
	        map.addControl(new AMap.ToolBar());// 工具条
	        map.addControl(new AMap.Scale());// 比例尺
	        map.addControl(new AMap.MarkerClusterer());// 点聚合
	    });
	    var infoWindow = new AMap.InfoWindow({offset: new AMap.Pixel(0,-30)});
	    var mouseTool = new AMap.MouseTool(map);// 在地图中添加MouseTool插件
	    this.map = map;
	    this.infoWindow = infoWindow;
	    this.mouseTool = mouseTool;
	    drawPolygon(map,'go');
	}

	function drawPolygon(map,id){
		map.clearMap();
		var chooseBuilding = $("input[name='chooseBuilding']:checked").val();
		if("wuKangRoad" == chooseBuilding){
			mapWuKangRoad();
		}
		if("redTravel" == chooseBuilding){
			mapRedTravel();
		}
		if("excellentHistory" == chooseBuilding){
			mapExcellentHistory();
		}
	};
	
	// 武康路地图
	var mapWuKangRoad = function() {
		var markers=[];
		var freetext = $('#txtSearch').val();
		var pageth = $('#pageth').val();
		var iflimit = $('#iflimit').val();
		$.post(ctx + "/shnh/wkl/webapi/building/dolist", {freetext: freetext, pageth: pageth, iflimit: iflimit}, function(result) {
	        marks = result.detail;
	        for(var j=0;j<marks.length;j++){
	        	var long = parseFloat(marks[j].long);
	        	var lat = parseFloat(marks[j].lat);
	            // 判断是否存在经纬度
	            if(isNaN(long) || isNaN(lat)){
	            	continue; // 如果不存在, 直接跳过此次循环
	            }
	         // 百度经纬度-转-高德经纬度
	            var newLong = bd_to_gd(long, lat).long;
	            var newLat = bd_to_gd(long, lat).lat;
	            marker = new AMap.Marker({
	                position: [newLong, newLat],
	                title: marks[j].name,
	                address: marks[j].address,
	                map:map
	            });
	            markers.push(marker);
	            marker.on('click',function(e){
	            	var address = this.G.address;
	            	$.post(ctx + '/shnh/wkl/webapi/building/dolist?freetext=' + address, function(
	            			result) {
	            	   var detail = result.detail;
	            	   var  div;
	            	   if(detail.length>0){
	            		   div="<p style='color:#333;font-size:16px;border-bottom:1px solid #eee'>"+detail[0].address+"</p>";
	                	   for(var i=0; i<detail.length; i++){
	                		   div +="<a class='map-WuKangRoad-RDF' href='javascript:void(0)' uri='"+ detail[i].uri +"' style='display: block;' >"+(detail[i].name ? detail[i].name : '未知')+"</a>";
	                	   }
	                 }else{
	                       div +="<span style='color: black'>暂无数据</span>";
	                   }
	                   infoWindow.setContent(div);
	                   infoWindow.open(map, e.target.getPosition());
	            		
	            	});
	            });
	        }
	        cluster = new AMap.MarkerClusterer(map, markers,{gridSize:30});
		});
	};
	
	// 红色旅游地图
	var mapRedTravel = function() {
		var markers=[];
		var freetext = $('#txtSearch').val();
		var pageth = $('#pageth').val();
		var iflimit = $('#iflimit').val();
		$.ajax({
		  url: ctx +"/shnh/gmwx/webapi/architecture/getArchitectures",
		  type:"GET",
		  data: {freetext: freetext, isRed: "1", key:"02cdb77b436d4dc383f1b64ebd86b9dc025622ac", pageth: pageth, iflimit: iflimit},
		  dataType:"json",
		  success: function(result){
	        marks = result.data;
	        for(var j=0;j<marks.length;j++){
	            var long = parseFloat(marks[j].long);
	            var lat = parseFloat(marks[j].lat);
	            // 判断是否存在经纬度
	            if(isNaN(long) || isNaN(lat)){
	            	continue; // 如果不存在, 直接跳过此次循环
	            }
	            // 百度经纬度-转-高德经纬度
	            var newLong = bd_to_gd(long, lat).long;
	            var newLat = bd_to_gd(long, lat).lat;
	            marker = new AMap.Marker({
	                position: [newLong, newLat],
	                title: marks[j].nameS,
	                address: marks[j].address,
	                map:map
	            });
	            markers.push(marker);
	            marker.on('click',function(e){
	            	var address = this.G.address;
            		$.ajax({
        			  url: ctx +"/shnh/gmwx/webapi/architecture/getArchitectures",
        			  type:"GET",
        			  data: {freetext: address, isRed: "1", key:"02cdb77b436d4dc383f1b64ebd86b9dc025622ac"},
        			  dataType:"json",
        			  success: function(result){
	            	   var detail = result.data;
	            	   var  div;
	            	   if(detail.length>0){
	            		   div="<p style='color:#333;font-size:16px;border-bottom:1px solid #eee'>"+detail[0].address+"</p>";
	                	   for(var i=0; i<detail.length; i++){
	                		   div +="<a class='map-RedTravel-ExcellentHistory-RDF' href='javascript:void(0)' uri='"+ detail[i].uri +"' style='display: block;' >"+(detail[i].nameS ? detail[i].nameS : '未知')+"</a>";
	                	   }
	                 }else{
	                       div +="<span style='color: black'>暂无数据</span>";
	                   }
	                   infoWindow.setContent(div);
	                   infoWindow.open(map, e.target.getPosition());
        			  }
	            	});
	            });
	        }
	        cluster = new AMap.MarkerClusterer(map, markers,{gridSize:30});
		  }
		});
	};
	
	// 优秀历史建筑地图
	var mapExcellentHistory = function() {
		var markers=[];
		var freetext = $('#txtSearch').val();
		var pageth = $('#pageth').val();
		var iflimit = $('#iflimit').val();
		$.ajax({
		  url: ctx +"/shnh/gmwx/webapi/architecture/getArchitectures",
		  type:"GET",
		  data: {freetext: freetext, isRed: "3", key:"02cdb77b436d4dc383f1b64ebd86b9dc025622ac", pageth: pageth, iflimit: iflimit},
		  dataType:"json",
		  success: function(result){
	        marks = result.data;
	        for(var j=0;j<marks.length;j++){
	            var long = parseFloat(marks[j].long);
	            var lat = parseFloat(marks[j].lat);
	            // 判断是否存在经纬度
	            if(isNaN(long) || isNaN(lat)){
	            	continue; // 如果不存在, 直接跳过此次循环
	            }
	            // 百度经纬度-转-高德经纬度
	            var newLong = bd_to_gd(long, lat).long;
	            var newLat = bd_to_gd(long, lat).lat;
	            marker = new AMap.Marker({
	                position: [newLong, newLat],
	                title: marks[j].nameS,
	                address: marks[j].address,
	                map:map
	            });
	            markers.push(marker);
	            marker.on('click',function(e){
	            	var address = this.G.address;
            		$.ajax({
        			  url: ctx +"/shnh/gmwx/webapi/architecture/getArchitectures",
        			  type:"GET",
        			  data: {freetext: address, isRed: "3", key:"02cdb77b436d4dc383f1b64ebd86b9dc025622ac"},
        			  dataType:"json",
        			  success: function(result){
	            	   var detail = result.data;
	            	   var  div;
	            	   if(detail.length>0){
	            		   div="<p style='color:#333;font-size:16px;border-bottom:1px solid #eee'>"+detail[0].address+"</p>";
	                	   for(var i=0; i<detail.length; i++){
	                		   div +="<a class='map-RedTravel-ExcellentHistory-RDF' href='javascript:void(0)' uri='"+ detail[i].uri +"' style='display: block;' >"+(detail[i].nameS ? detail[i].nameS : '未知')+"</a>";
	                	   }
	                 }else{
	                       div +="<span style='color: black'>暂无数据</span>";
	                   }
	                   infoWindow.setContent(div);
	                   infoWindow.open(map, e.target.getPosition());
        			  }
	            	});
	            });
	        }
	        cluster = new AMap.MarkerClusterer(map, markers,{gridSize:30});
		  }
		});
	};
	
	// 地图弹出RDF-武康路
	$("body").delegate(".map-WuKangRoad-RDF", "click", function(){
		var uri = $(this).attr('uri');
		$.post(ctx + "/shnh/wkl/webapi/building/getRdf?dataUri=" + uri, null, function(result) {
		   var html = (juicer(getTemplate("rdfs"), result));
		   $("#RDFid").html(html);
		   var $modal = $('#your-modal');
		   $modal.modal({
			   width : 1200
		   });
	   });
	});
	
	// 地图弹出RDF-红色旅游+优秀历史建筑
	$("body").delegate(".map-RedTravel-ExcellentHistory-RDF", "click", function(){
		var uri = $(this).attr('uri');
		$.get(ctx+"/shnh/gmwx/webapi/architecture/getRdf?graph=http://red.library.sh.cn/graph/building&uri=" + uri, null, function(result) {
			var html = (juicer(getTemplate("rdfs"), result));
			$("#RDFid").html(html);
			var $modal = $('#your-modal');
			$modal.modal({
				width : 1200
			});
		});
	});
	
	//输入框的enter事件
	$('#txtSearch').bind('keydown',function(event){
	    if(event.keyCode == "13") {
	    	mapInit();
			selectWhichBuildingToSearch();
	    }
	});  
	
	// 点击查询按钮
	$("#btnSearch").click(function() {
		mapInit();
		selectWhichBuildingToSearch();
	});
	
	// 初次加载默认执行
	$("#btnSearch").click();
	
	// 地图展示
	$("#mapButton").click(function() {
		$(".main").css('display','none'); 
		$(".contain").css('display','block');
	});
	
	// 返回建筑列表
	$("#backToList").click(function() {
		$(".contain").css('display','none');
		$(".main").css('display','block'); 
	});
	
	//百度坐标转高德（传入经度、纬度）
	function bd_to_gd(bd_long, bd_lat) {
	    var X_PI = Math.PI * 3000.0 / 180.0;
	    var x = bd_long - 0.0065;
	    var y = bd_lat - 0.006;
	    var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);
	    var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);
	    var gd_long = z * Math.cos(theta);
	    var gd_lat = z * Math.sin(theta);
	    return {long: gd_long, lat: gd_lat}
	}
	
});
