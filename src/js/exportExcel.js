define(["qlik", "jquery", "../lib/xlsx.full.min", "./fileUtils", "./state", "./loadingOverlay"], function (qlik, $, XLSX, fileUtils, state, overlay) {
	var sheetId = qlik.navigation.getCurrentSheetId().sheetId;
	var currentState = state.getState(sheetId);
	
	//***********************************************************
	//*
	//* Object Data Export to Excel
	//*
	//***********************************************************

	async function checkColumnFilter(selectedIds){
		var debugConsole = currentState.debugConsole;
		
		const rawFilterString = currentState.columnFilter || '';
		if(!rawFilterString) return { result: true, matchedIds: []};
		const matchedIds = [];

		//object Properties TEST
		for (const [index, obj] of selectedIds.entries()) {
			const validTypes = ['table', 'pivot-table', 'sn-table', 'sn-pivot-table'];
			if (!validTypes.includes(obj.type)) {
				continue;
			}

			var objProps = await qlik.currApp().getObjectProperties(obj.id);
			const props = objProps.properties;
			const layout = objProps.layout;
			let dimensionInfo = layout.qHyperCube.qDimensionInfo;
			const dimensionInfoFields = dimensionInfo.flatMap(dim =>
				dim.qFallbackTitle ? [dim.qFallbackTitle] : []
			);	
			//console.log(dimensionInfoFields);		
			const normalizedDimensionFields = new Set(
				dimensionInfoFields.map(f =>
					f.replace(/\s+/g, '').toLowerCase()
				)
			);
	
			const normalizedFieldSet = new Set(
				rawFilterString
					.split(';')
					.map(s => s.trim())
					.filter(Boolean)
					.map(s => s.replace(/\s+/g, '').toLowerCase())
			);

			if(debugConsole) {
				console.log(normalizedDimensionFields);
				console.log(normalizedFieldSet);
			}
			

			const matchingFields = [...normalizedFieldSet].filter(field =>
				normalizedDimensionFields.has(field)
			);
			
			if (matchingFields.length > 0) {
				console.warn('Matching Fields', matchingFields);
				matchedIds.push({
					id: obj.id,
					title: obj.title || '',
					matchedFields: matchingFields
				});
			}
		}

		const result = matchedIds.length === 0;
		return {result, matchedIds};
	}
	async function exportSelectedObjectsWithZip(selectedIds, encrypt, password){
		// 시트 병합 - 서버 암호화 대신 압축 후 압축 비밀번호 설정
		sheetId = qlik.navigation.getCurrentSheetId().sheetId;
		currentState = state.getState(sheetId);
		var debugConsole = currentState.debugConsole;

		if(debugConsole){ console.log(`Encrypt : ${encrypt}, password: ${password}, serverAddress : ${currentState.serverAddress}`) }
		
		if( selectedIds.length <= 0){
			alert("No items selected. Please select at least one item.");
			return;
		}
		if( encrypt && !password ){
			alert("Please enter a password to enable encryption.");
			return;
		}
		var { result, matchedIds } = await checkColumnFilter(selectedIds);
		if(!result){
			const titles = matchedIds.map(obj => obj.title?.trim() || obj.id);
			const message = `Export blocked for the following tables due to privacy policy restrictions: ${titles.join(', ')}`;
			alert(message);
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
					if(debugConsole){ console.log(`get visualization ${obj.id} ... `); }	
					let vis = await app.visualization.get(obj.id);
					if(isCancelled) { return Promise.reject("Cancelled"); }
					
					if(debugConsole){ console.log(`export Data ${obj.id} ... `); }
					let result = await vis.exportData({ format: "OOXML" });
					if(isCancelled) { return Promise.reject("Cancelled"); }
					
					if(debugConsole){ console.log(`request Fetch ${obj.id} ... `); }
					let response = await fetch(result);
					if(isCancelled) { return Promise.reject("Cancelled"); }
					if (!response.ok) {
						console.error(`Failed to download excel for ${obj.id}: HTTP ${response.status}`);
						return Promise.reject("Failed to download");
					}
					if(debugConsole){ console.log(`request Fetch ${obj.id} complete ... `); }

					let blob = await response.blob();
					if(isCancelled) { return Promise.reject("Cancelled"); }
					if(debugConsole){ console.log(`create blob ${obj.id} complete ... `); }
					
					
					var fileName = obj.title ? obj.title : obj.id;
					fileName = fileUtils.sanitizeFileName(fileName);
					
					let file = new File([blob], fileName+".xlsx", { type: blob.type});
					await fileUtils.addFileToZip(zipWriter, file);
					if(debugConsole){ console.log(`create zipFile ${obj.id} complete ... `); }

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
		var debugConsole = currentState.debugConsole;

		if(debugConsole) { console.log(`Encrypt : ${encrypt}, password: ${password}, serverAddress : ${currentState.serverAddress}`) }
		if( selectedIds.length <= 0){
			alert("No items selected. Please select at least one item.");
			return;
		}
		if( encrypt && !password ){
			alert("Please enter a password to enable encryption.");
			return;
		}
		var { result, matchedIds } = await checkColumnFilter(selectedIds);
		if(!result){
			const titles = matchedIds.map(obj => obj.title?.trim() || obj.id);
			const message = `Export blocked for the following tables due to privacy policy restrictions: ${titles.join(', ')}`;
			alert(message);
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
			if(debugConsole){ console.log("Single Object Processing"); }
			try {
				if(debugConsole){ console.log(`get visualization ${selectedIds[0].id} ... `); }
				let vis = await app.visualization.get(selectedIds[0].id); 
				if(debugConsole){ console.log(`export Data ${selectedIds[0].id} ... `); }
				let result = await vis.exportData({ format: "OOXML" });
				if(debugConsole){ console.log(`request Fetch ${selectedIds[0].id} ... `); }
				let data = await safeFetch(result);
				if(debugConsole){ console.log(`request Fetch ${selectedIds[0].id} complete ... `); }
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
					if(debugConsole){ console.log(`get visualization ${obj.id} ... `); }
					let vis = await app.visualization.get(obj.id);
					if(debugConsole){ console.log(`export Data ${obj.id} ... `); }
					let result = await vis.exportData({ format: "OOXML" });
					if(debugConsole){ console.log(`request Fetch ${obj.id} ... `); }
					let data = await safeFetch(result);
					if(debugConsole){ console.log(`request Fetch ${obj.id} complete ... `); }
					
					var newWorkbook = XLSX.read(new Uint8Array(data), { type: "array" });
					if(debugConsole){ console.log(`create workbook ${obj.id} complete ... `); }
					var sheetName = newWorkbook.SheetNames[0];
					if(debugConsole){ console.log(`create sheetName ${obj.id} complete ... `); }
					var newSheet = newWorkbook.Sheets[sheetName];
					if(debugConsole){ console.log(`insert new sheet ${obj.id} complete ... `); }
					
					var sheetName = obj.title ? obj.title : obj.id;
					sheetName = fileUtils.sanitizeSheetName(index, sheetName);

					XLSX.utils.book_append_sheet(wb, newSheet, sheetName);
					if(debugConsole){ console.log(`create excel sheet ${obj.id} in ${sheetName} ... `); }
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
					console.error("An error occurred during file encryption.");
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
                console.error("There was a problem retrieving the file."); // 사용자에게 피드백
                throw error;  // 상위에서 처리할 수 있도록 오류를 다시 던짐
            });
    }
	
	return {exportSelectedObjects,exportSelectedObjectsWithZip, safeFetch};
});