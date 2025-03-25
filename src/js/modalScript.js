define(["qlik", "jquery", "./state", "./loadingOverlay", "./exportImage", "./exportExcel"], function (qlik, $, state, overlay, exportImage, exportExcel) {
	let lastActiveTab = "QlikCE-tab1";
	var currentSheet = qlik.navigation.getCurrentSheetId();
	
    return {
		//***********************************************************
		//*
		//* Modal 객체를 그리는 함수 (window 전역에서 한 번만 실행됨.)
		//*
		//***********************************************************
        init: function (layout, pLayout) {
            if (window.QlikCE_EventsRegistered) return;
            window.QlikCE_EventsRegistered = true;
			$("body").append(pLayout);	

            const modal = $("#QlikCE-modal");
            const encryptionCheckbox = $("#QlikCE-enable-encryption");
            const passwordInput = $("#QlikCE-password-input");
            

			var self = this;
            // 모달 열기 버튼 이벤트
            $(document).on("click", ".QlikCE-open-modal-btn", function () {
                var app = qlik.currApp();
                var mode = qlik.navigation.getMode();
                if (mode === "edit") {
                    return;
                }
				self.paint(layout);
				modal.show();
            });

            // 모달 닫기 버튼 이벤트
            $(document).on("click", "#QlikCE-close-btn", function () {
                modalRefresh();
				modal.hide();
            });

            // 탭 전환 기능
            $(document).on("click", ".QlikCE-tab-button", function () {
                const currentTab = $(this).data("tab");
                if (currentTab == lastActiveTab) return;

                $(".QlikCE-tab-button").removeClass("active");
                $(this).addClass("active");
                $(".QlikCE-tab-content").hide();
                $("#" + currentTab).show();

                $("#QlikCE-modal input[type='checkbox']").prop("checked", false);

                if (currentTab === "QlikCE-tab2") {
                    encryptionCheckbox.prop("checked", true);
                    passwordInput.removeClass("QlikCE-hidden").val("");
					$("#QlikCE-printscn-btn").removeClass("QlikCE-hidden");
                } else if (lastActiveTab === "QlikCE-tab2" && currentTab === "QlikCE-tab1") {
                    encryptionCheckbox.prop("checked", true);
					passwordInput.removeClass("QlikCE-hidden").val("");
					$("#QlikCE-printscn-btn").addClass("QlikCE-hidden");
                }

                lastActiveTab = currentTab;
            });

            // "Select All" 체크박스 기능
            $(document).on("change", ".QlikCE-select-all", function () {
                const target = $("#" + $(this).data("target"));
                target.find(".QlikCE-row-checkbox").prop("checked", $(this).prop("checked"));
            });

            // Encryption 체크박스 변경 이벤트
            encryptionCheckbox.on("change", function () {
                passwordInput.toggleClass("QlikCE-hidden", !$(this).prop("checked")).val("");
            });
			
			// PrintScn 버튼 이벤트
			$(document).on("click", "#QlikCE-printscn-btn", function () {
				exportImage.exportPrintScreen();
			});
			
			// Export 버튼 클릭 이벤트
            $(document).on("click", "#QlikCE-export-btn", function () {
				var encrypt = $("#QlikCE-enable-encryption").prop("checked");
				var password = encrypt ? $("#QlikCE-password-input").val() : "";
				//비밀번호는 무조건 6자리 이상.
				if (encrypt && password.length < 6) {
					alert("Password must be longer than 6 characters.");
					return;
				}
				var currentTab = $(".QlikCE-tab-button.active").data("tab");
				const tableBodyId = currentTab === "QlikCE-tab1" ? "QlikCE-table-body-1" : "QlikCE-table-body-2";
				
				const selectedIds = $("#" + tableBodyId + " .QlikCE-row-checkbox:checked")
                    .map((_, cb) => ({
						id: $(cb).data("id"),
						type: $(cb).data("type"),
						title: $(cb).data("title"),
						parent_id: $(cb).data("parent_id"),
						parent_type: $(cb).data("parent_type")
					}))
                    .get();

				
				if(currentTab == "QlikCE-tab1"){
					var zipExportMode = state.getState(qlik.navigation.getCurrentSheetId().sheetId).zipExportMode;
					if(zipExportMode){
						exportExcel.exportSelectedObjectsWithZip(selectedIds, encrypt, password);
					}else{
						exportExcel.exportSelectedObjects(selectedIds, encrypt, password);
					}
				}else if(currentTab == "QlikCE-tab2"){
					exportImage.exportImageSelectedObjects(selectedIds, encrypt, password);
				}
				
			});
		
			
			
        },
		//***********************************************************
		//*
		//* Data를 Refresh 하고 Modal 창의 테이블을 다시 그림 (paint시 마다 호출)
		//*
		//***********************************************************
        paint: async function (layout) {
			var debugConsole = layout.debugConsole;
			
            if(debugConsole){ console.log("Paint function called, refreshing data..."); }
			modalRefresh();
            var app = qlik.currApp();
            currentSheet = qlik.navigation.getCurrentSheetId();

            if (!currentSheet || !currentSheet.sheetId) {
                console.error("현재 시트를 찾을 수 없습니다.");
                return;
            }else{
                // 현재 SheetID를 기준으로 State 설정
                await state.init(layout);
            }
			
			$(".QlikCE-title").text(state.getState(currentSheet.sheetId).sheetName);
						
            var dataObjectArray = [];
            var imageObjectArray = [];

            try {
                const props = await app.getObjectProperties(currentSheet.sheetId);
				if(debugConsole){ console.log(props); }
                for (const item of props.layout.qChildList.qItems) {
                    await processObject(app, item, props, dataObjectArray, imageObjectArray);
                }
                // 테이블에 데이터 채우기
                populateTable("QlikCE-table-body-1", dataObjectArray);
                populateTable("QlikCE-table-body-2", imageObjectArray);
            } catch (error) {
                console.error("오브젝트 데이터를 불러오는 데 문제가 발생했습니다.", error);
            } 
			if(debugConsole){
				console.log("Paint function completed...");
				console.log(state.getState(currentSheet.sheetId));
			}
			
            return qlik.Promise.resolve();
        }
    };

    // 테이블 데이터 삽입 함수 (jQuery 사용)
    function populateTable(tableBodyId, data) {
        const $tableBody = $("#" + tableBodyId);
        $tableBody.empty();
		
		if (data.length === 0) {
			// 데이터가 없을 경우, 하나의 행과 셀을 생성하여 메시지 표시
			const $emptyRow = $(`
				<tr class="QlikCE-tr">
					<td class="QlikCE-td" colspan="3" style="text-align:center; padding: 10px; font-weight: bold;">
						No exportable objects available.
					</td>
				</tr>
			`);
			$tableBody.append($emptyRow);
			return;
		}

        data.forEach(item => {
            const $row = $(`
                <tr class="QlikCE-tr">
                    <td class="QlikCE-td"><input type="checkbox" class="QlikCE-row-checkbox" 
					data-id="${item.id}" 
					data-title="${item.title.trim()}"
					data-type="${item.type}"
				 	data-parent_id="${item.parent_id}"
					data-parent_type="${item.parent_type}"></td>
                    <td class="QlikCE-td">${item.type}</td>
                    <td class="QlikCE-td">${item.title}</td>
                </tr>
            `);
            $tableBody.append($row);
        });
    }

    // Object 탐색 함수
    async function processObject(app, item, props, dataObjectArray, imageObjectArray) {
		//title이 존재하지 않으면 제외
        if (checkObjectType("excel", props, item)) {
            dataObjectArray.push({
				id: item.qInfo.qId,
				title: item.qData.title.trim(),
				type: item.qInfo.qType === "childObject" && item.qData.visualization !== undefined 
					? item.qData.visualization 
					: item.qInfo.qType,
				parent_id: props.id,
				parent_type: props.genericType
			});
        }
        if (checkObjectType("image", props, item)) {
            imageObjectArray.push({
				id: item.qInfo.qId,
				title: item.qData.title.trim(),
				type: item.qInfo.qType === "childObject" && item.qData.visualization !== undefined 
					? item.qData.visualization 
					: item.qInfo.qType,
				parent_id: props.id,
				parent_type: props.genericType
			});
        }

		// Container 내부 탐색
        if (["sn-tabbed-container", "sn-layout-container", "container"].includes(item.qInfo.qType)) {
            try {
                const containerProps = await app.getObjectProperties(item.qInfo.qId);

                for (const subItem of containerProps.layout.qChildList.qItems) {
                    await processObject(app, subItem, containerProps, dataObjectArray, imageObjectArray);
                }
            } catch (error) {
                console.error(`Failed to fetch container ${item.qInfo.qId}:`, error);
            }
        }
    }
	function checkObjectType(type, props, item){
		// Data Export 가능한 타입
		//console.log("===========================================================================================")
		//console.log(item);
		//console.log(`type: ${item.qInfo.qType}, visualization: ${item.qData.visualization}`);
		//if(item.qInfo.qType === "table"){
		//	console.log(props);
		//}
   		var exportableTypes = [
			"gauge", "bulletchart",	"linechart", "barchart", "mekkochart",
			"distributionplot", "table", "piechart", "combochart",
			"pivot-table", "treemap", "waterfallchart", "sn-pivot-table",
			"histogram", "kpi", "sn-table",	"qlik-word-cloud", "qlik-multi-kpi", "qlik-radar-chart",
			"childObject", "bi-irregular-2dim-heatmap"
		];
		// Image Export 가능한 타입 (text-image, sn-pivot-table 제외)
		var imageableTypes = [
			"gauge", "bulletchart",	"linechart", "barchart", "mekkochart",
			"distributionplot", "boxplot", "table", "piechart", "combochart",
			"pivot-table", "treemap", "waterfallchart", "qlik-multi-kpi",
			"histogram", "kpi", "sn-table", "qlik-word-cloud", "map", "qlik-radar-chart",
			"sn-nlg-chart", "childObject", "bi-irregular-2dim-heatmap", "map"
		];
		
		var qTypeCond = false;
		if(type === "excel"){
			qTypeCond = exportableTypes.includes(item.qInfo.qType)
		}else if(type === "image"){
			qTypeCond = imageableTypes.includes(item.qInfo.qType)
		}
		//console.log("qTypeCond : "+ qTypeCond);
		
		var titleCond = true;
		var titleFilter = state.getState(currentSheet.sheetId).titleFilter;
		
		if(titleFilter){
			if(!item.qData.title) titleCond = false;
		}
		//console.log("titleCond : "+ titleCond);
		
		var childCond = true;
		if(item.qInfo.qType === "childObject"){
			childCond = false;
			if(item.qData.visualization){
				if(type === "excel"){
					childCond = exportableTypes.includes(item.qData.visualization);
				}else if(type === "image"){
					childCond = imageableTypes.includes(item.qData.visualization);
				}
			}
		}
		//console.log("childCond : "+ childCond);
		
		var bugTableCond = true;
		if(props.genericType === "sheet"){
			if(props.layout.cells){
				var cells = props.layout.cells;
				if(!cells.some(cell => cell.name === item.qInfo.qId)){
					console.log(`${item.qInfo.qId} is not visualization in sheet !!!!!!!!!!!!!!!!!!!`);
					bugTableCond = false;
				}
			}
		}
		
		return qTypeCond && titleCond && childCond && bugTableCond;
	}
	function modalRefresh(){
		// 활성 탭 초기화
		$(".QlikCE-tab-button").removeClass("active");
		$(".QlikCE-tab-content").hide();
		$("#QlikCE-tab1").show();
		$(".QlikCE-tab-button[data-tab='QlikCE-tab1']").addClass("active");

		// 체크박스 및 입력 필드 초기화
		$("#QlikCE-modal input[type='checkbox']").prop("checked", false);
		$("#QlikCE-enable-encryption").prop("checked", true);
		$("#QlikCE-printscn-btn").addClass("QlikCE-hidden");
		$("#QlikCE-password-input").val("").removeClass("QlikCE-hidden");

		lastActiveTab = "QlikCE-tab1";
	}
	
});
