define(["qlik", "jquery", "../lib/xlsx.full.min", "./fileUtils", "./state", "./loadingOverlay"], function (qlik, $, XLSX, fileUtils, state, overlay) {
	var sheetId = qlik.navigation.getCurrentSheetId().sheetId;
	var currentState = state.getState(sheetId);
	
	//***********************************************************
	//*
	//* Object Data Export to Excel
	//*
	//***********************************************************
	async function exportSelectedObjectsWithZip(selectedIds, encrypt, password){
		// 시트 병합 - 서버 암호화 대신 압축 후 압축 비밀번호 설정
		sheetId = qlik.navigation.getCurrentSheetId().sheetId;
		currentState = state.getState(sheetId);
		console.log(selectedIds);
		console.log(`Encrypt : ${encrypt}, password: ${password}, serverAddress : ${currentState.serverAddress}`)
		if( selectedIds.length <= 0){
			alert("No items selected. Please select at least one item.");
			return;
		}
		if( encrypt && !password ){
			alert("Please enter a password to enable encryption.");
			return;
		}
		var app = qlik.currApp();
		var isCancelled = false;
		var zipWriter = await fileUtils.createZipWriter(password);
		var exportPromises = [];
		overlay.showLoadingOverlay("Excel donwloading ... ", function(){
			isCancelled = true;
		})
		for (const [index, obj] of selectedIds.entries()) {
			exportPromises.push((async () => {
				try {
					console.log(`get visualization ${obj.id} ... `);
					let vis = await app.visualization.get(obj.id);
					if(isCancelled) { return Promise.reject("Cancelled"); }
					console.log(`export Data ${obj.id} ... `);
					let result = await vis.exportData({ format: "OOXML" });
					if(isCancelled) { return Promise.reject("Cancelled"); }
					console.log(`request Fetch ${obj.id} ... `);
					let response = await fetch(result);
					if(isCancelled) { return Promise.reject("Cancelled"); }
					if (!response.ok) {
						console.error(`Failed to download excel for ${obj.id}: HTTP ${response.status}`);
						return Promise.reject("Failed to download");
					}
					console.log(`request Fetch ${obj.id} complete ... `);
					let blob = await response.blob();
					if(isCancelled) { return Promise.reject("Cancelled"); }
					console.log(`create blob ${obj.id} complete ... `);
					
					var fileName = obj.title ? obj.title : obj.id;
					fileName = fileUtils.sanitizeFileName(fileName);
					
					let file = new File([blob], fileName+".xlsx", { type: blob.type});
					await fileUtils.addFileToZip(zipWriter, file);
					console.log(`create zipFile ${obj.id} complete ... `);

				} catch (error) {
					console.error(`Export failed for ${obj.id}:`, error);
				}
			})());
		}
		
		try {
			await Promise.all(exportPromises); // 모든 내보내기 완료될 때까지 대기
			if (isCancelled) {
				console.warn("Export was cancelled. Skipping file generation.");
				overlay.hideLoadingOverlay();
				return;
			}
			const zipBlob = await fileUtils.finalizeZip(zipWriter);
			var fileName = currentState.sheetName;
			fileName = fileUtils.sanitizeFileName(fileName);
			fileUtils.saveFileFromBlob(zipBlob, `${fileName}.zip`);
			
		}catch(error){
			console.error("Export Failed.");
		}finally{
			overlay.hideLoadingOverlay();
		}
		
	}
	
	
    async function exportSelectedObjects(selectedIds, encrypt, password) {
		sheetId = qlik.navigation.getCurrentSheetId().sheetId;
		currentState = state.getState(sheetId);
		
		console.log(`Encrypt : ${encrypt}, password: ${password}, serverAddress : ${currentState.serverAddress}`)
		if( selectedIds.length <= 0){
			alert("No items selected. Please select at least one item.");
			return;
		}
		if( encrypt && !password ){
			alert("Please enter a password to enable encryption.");
			return;
		}
		
        var app = qlik.currApp();
        var wb = XLSX.utils.book_new();
		var isCancelled = false;
		overlay.showLoadingOverlay("Excel donwloading ... ", function(){
			isCancelled = true;
		})
		var exportPromises = [];
		
		if (selectedIds.length === 1) {
			// 단일 오브젝트 처리 (병합 X)
			console.log("Single Object Processing");
			try {
				console.log(`get visualization ${selectedIds[0].id} ... `);
				let vis = await app.visualization.get(selectedIds[0].id);
				console.log(`export Data ${selectedIds[0].id} ... `);
				let result = await vis.exportData({ format: "OOXML" });
				console.log(`request Fetch ${selectedIds[0].id} ... `);
				let data = await safeFetch(result);
				console.log(`request Fetch ${selectedIds[0].id} complete ... `);
				let blob = new Blob([data], { type: 'application/octet-stream' });

				if (encrypt && currentState.serverAddress) {
					const formData = new FormData();
					formData.append("file", blob, "export.xlsx");
					if (currentState.isDevelop) {
						formData.append("password", password);
					}

					const excelApiURL = currentState.isDevelop
						? "https://223.130.139.187:8891/api/excel/protect"
						: currentState.serverAddress.replace(/\/$/, '') + `/api/v1/common/qlik/excel?password=${password}&fileName=protect_file.xlsx`;

					const response = await fetch(excelApiURL, {
						method: 'POST',
						body: formData
					});
					const encryptedBlob = await response.blob();

					if (!isCancelled) {
						const fileName = fileUtils.sanitizeFileName(currentState.sheetName);
						fileUtils.saveFileFromBlob(encryptedBlob, fileName + ".xlsx");
					}

				} else {
					if (!isCancelled) {
						const fileName = fileUtils.sanitizeFileName(currentState.sheetName);
						fileUtils.saveFileFromBlob(blob, fileName + ".xlsx");
					}
				}
			} catch (error) {
				console.error("Error exporting single object:", error);
			} finally {
				overlay.hideLoadingOverlay();
			}
			return; // 단일 파일 처리 완료 → 함수 종료
		}


		for (const [index, obj] of selectedIds.entries()) {
			exportPromises.push((async () => {
				try {
					console.log(`get visualization ${obj.id} ... `);
					let vis = await app.visualization.get(obj.id);
					console.log(`export Data ${obj.id} ... `);
					let result = await vis.exportData({ format: "OOXML" });
					console.log(`request Fetch ${obj.id} ... `);
					let data = await safeFetch(result);
					console.log(`request Fetch ${obj.id} complete ... `);
					
					var newWorkbook = XLSX.read(new Uint8Array(data), { type: "array" });
					console.log(`create workbook ${obj.id} complete ... `);
					var sheetName = newWorkbook.SheetNames[0];
					console.log(`create sheetName ${obj.id} complete ... `);
					var newSheet = newWorkbook.Sheets[sheetName];
					console.log(`insert new sheet ${obj.id} complete ... `);
					
					var sheetName = obj.title ? obj.title : obj.id;
					sheetName = fileUtils.sanitizeSheetName(index, sheetName);

					XLSX.utils.book_append_sheet(wb, newSheet, sheetName);
					console.log(`create excel sheet ${obj.id} in ${sheetName} ... `);
				} catch (error) {
					console.error(`Export failed for ${obj.id}:`, error);
				}
			})());
		}
		try {
			await Promise.all(exportPromises); // 모든 내보내기 완료될 때까지 대기

			if (isCancelled) {
				console.warn("Export was cancelled. Skipping file generation.");
				overlay.hideLoadingOverlay();
				return;
			}

			// 시트 이름을 알파벳 및 숫자 순으로 정렬
			wb.SheetNames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

			var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
			var blob = new Blob([wbout], { type: 'application/octet-stream' });

			if (encrypt && currentState.serverAddress) {
				if (isCancelled) {
					console.warn("Export was cancelled. Skipping encryption request.");
					overlay.hideLoadingOverlay();
					return;
				}

				var formData = new FormData();
				formData.append("file", blob, "export.xlsx");
				if (currentState.isDevelop) {
					formData.append("password", password);
				}

				var excelApiURL = currentState.isDevelop
					? currentState.serverAddress.replace(/\/$/, '') + "/api/excel/protect"
					: currentState.serverAddress.replace(/\/$/, '') + `/api/v1/common/qlik/excel?password=${password}&fileName=protect_file.xlsx`;

				try {
					let response = await fetch(excelApiURL, {
						method: 'POST',
						body: formData
					});

					let encryptedBlob = await response.blob();

					if (isCancelled) {
						console.warn("Export was cancelled. Skipping file save.");
						overlay.hideLoadingOverlay();
						return;
					}

					var fileName = fileUtils.sanitizeFileName(currentState.sheetName);
					fileUtils.saveFileFromBlob(encryptedBlob, fileName + ".xlsx");
					overlay.hideLoadingOverlay();

				} catch (error) {
					console.log("파일 암호화 중 오류가 발생했습니다.");
					overlay.hideLoadingOverlay();
				}

			} else {
				if (isCancelled) {
					console.warn("Export was cancelled. Skipping file save.");
					overlay.hideLoadingOverlay();
					return;
				}

				var fileName = fileUtils.sanitizeFileName(currentState.sheetName);
				fileUtils.saveFileFromBlob(blob, fileName + ".xlsx");
				overlay.hideLoadingOverlay();
			}

		} catch (error) {
			if (error.message === "Export cancelled by user") {
				console.warn("Export process was fully cancelled.");
			} else {
				console.error("Error during Excel export process:", error);
				console.log("엑셀 파일을 생성하는 중 문제가 발생했습니다.");
			}
			overlay.hideLoadingOverlay();
		}

    }
	
	// 안전한 fetch 요청 (에러 처리 포함)
    function safeFetch(url) {
        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`); // 상태 코드가 오류인 경우 처리
                }
                return response.arrayBuffer();
            })
            .catch(error => {
                ////console.error("Fetch error:", error);
                console.log("파일을 가져오는 데 문제가 발생했습니다. 다시 시도해 주세요."); // 사용자에게 피드백
                throw error;  // 상위에서 처리할 수 있도록 오류를 다시 던짐
            });
    }
	
	return {exportSelectedObjects,exportSelectedObjectsWithZip, safeFetch};
});