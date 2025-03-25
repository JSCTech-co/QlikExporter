define(["qlik", "jquery", "../lib/html2canvas.min", "./fileUtils", "./state", "./loadingOverlay"], function (qlik, $, html2canvas, fileUtils, state, overlay) {
	var sheetId = qlik.navigation.getCurrentSheetId().sheetId;
	var currentState = state.getState(sheetId);
	var debugConsole = false;
	
	var isCancelled = false; // 취소 여부를 저장하는 변수
	var completedImages = 0;
	var totalImages = 0;
	
	//***********************************************************
	//*
	//* Object Image Export
	//*
	//***********************************************************
    async function exportImageSelectedObjects(selectedObjects, encrypt, password) {
		sheetId = qlik.navigation.getCurrentSheetId().sheetId;
		currentState = state.getState(sheetId);
		debugConsole = currentState.debugConsole;
		
		isCancelled = false;
		completedImages = 0;
		totalImages = 0;
		
		if( selectedObjects.length <= 0){
			alert("No items selected. Please select at least one item.");
			return;
		}
		if( encrypt && !password ){
			alert("Please enter a password to enable encryption.");
			return;
		}
		if(!encrypt) password = "";
	
		var app = qlik.currApp();

		totalImages = selectedObjects.length;
		completedImages = 0;
		
		overlay.showLoadingOverlay("Image Downloading ... ", function(){
			isCancelled = true;
		})
		
		const zipWriter = await fileUtils.createZipWriter(password);
		await exportImages(selectedObjects, zipWriter);	
	}
	
	
	async function exportImages(selectedObjects, zipWriter) {
		let retryList = [];

		overlay.updateLoadingOverlay(`Exporting images: 0/${totalImages} completed`);
		
		// 동기식 요청 (다운로드 리스트가 5개 이하일 때)
		if(selectedObjects.length <= 5){
			for (const obj of selectedObjects) {
				if(isCancelled) break;
				try {
					if(debugConsole){ console.log(`export for ${obj.id}...`); }
					await withTimeout(exportImage(zipWriter, obj), currentState.timeout);
					completedImages++;
					overlay.updateLoadingOverlay(`Exporting images: ${completedImages}/${totalImages} completed`);
					if(debugConsole){ console.log(`export succeeded for ${obj.id}`); }
				} catch (error) {
					retryList.push(obj);
					console.warn(`export failed for ${obj.id}:`, error.message);
				}
			}
		}else{
			// 모든 요청을 동시에 실행 (다운로드 리스트가 6개 이상일 때 비동기 병렬 요청)
			const exportPromises = selectedObjects.map((obj) =>
				exportImage(zipWriter, obj)
					.then(() => {
						completedImages++;
						overlay.updateLoadingOverlay(`Exporting images: ${completedImages}/${totalImages} completed`);
					})
					.catch((error) => {
						console.warn(`Export failed for ${obj.id}:`);
						console.error(error);
						retryList.push(obj); // 실패한 항목 저장
						return Promise.reject(error);
					})
			);
			await Promise.allSettled(exportPromises);
		}
		

		// 실패한 요청들 다시 시도
		if (retryList.length > 0) {
			console.warn(`Retrying ${retryList.length} failed exports...`);
			await retryExportImagesSequentially(retryList, zipWriter);
		}

		// ZIP 파일 생성 (다운로드된 이미지가 있을 경우에만)
		if (!isCancelled && selectedObjects.length > 0 && completedImages > 0) {
			overlay.updateLoadingOverlay("Creating ZIP file...");

			try {
				const zipBlob = await fileUtils.finalizeZip(zipWriter);
				var fileName = state.getState(sheetId).sheetName;
				fileName = fileUtils.sanitizeFileName(fileName);
				fileUtils.saveFileFromBlob(zipBlob, `${fileName}.zip`);
			} catch (error) {
				console.error("Error creating ZIP file:", error);
			} finally {
				overlay.hideLoadingOverlay();
			}
		} else {
			console.warn("No downloaded images available.");
			alert("No downloaded images available.");
			overlay.hideLoadingOverlay();
		}
	}

	
	// 개별 이미지 로직
	async function exportImage(zipWriter, obj) {
		if (isCancelled) return Promise.reject("Export cancelled");
		
		if(obj.type === "map"){
			var targetElement;
			if (obj.parent_type === "sn-tabbed-container" || obj.parent_type === "container" ||
				obj.parent_type === "sn-layout-container") {
				targetElement = $(`#${obj.id}_content`);
			} else{
				targetElement = $(`div[tid="${obj.id}"] .qv-object-${obj.id}`)
			}
			var canvas = await html2canvas(targetElement[0], {
				useCORS: true,
				allowTaint: true
			});
			// 캡처된 이미지 데이터를 Data URL로 변환
			var blob = await canvasToBlob(canvas);
			//var sheetId = qlik.navigation.getCurrentSheetId().sheetId;
			let fileName = obj.title ? fileUtils.sanitizeFileName(obj.title) : obj.id;
			fileName = fileName.substr(0, 50);
			
			let imgFile = new File([blob], fileName + ".png", { type: blob.type });
			fileUtils.addFileToZip(zipWriter, imgFile);
			if(debugConsole){ console.log(`add File for ${obj.id}:`); }
			
			return Promise.resolve();
		}
		
		try {
			//overlay.updateLoadingOverlay(`Downloading Image ${completedImages + 1} of ${totalImages} ...`);
			var app = qlik.currApp();
			let vis = await app.visualization.get(obj.id);
			if(debugConsole){ console.log(`${obj.id} get visualization ... `); }

			if(isCancelled) return Promise.reject("Export cancelled");
			
			var objId;
			if (obj.parent_type === "sn-tabbed-container" || obj.parent_type === "container" ||
				obj.parent_type === "sn-layout-container") {
				objId = obj.parent_id;
			} else {
				objId = obj.id;
			}

			let { width, height } = await getObjectSizeFromDOM(objId);

			let settings = { format: 'png', width: width, height: height };
			let imgUrl;

			try {
				imgUrl = await withTimeout(vis.exportImg(settings), currentState.timeout);
				if (!imgUrl) {
					return Promise.reject(`Failed to export image: No URL returned for ${obj.id}`);
				}
			} catch (error) {
				console.error("Error during exportImg : " + error);
				return Promise.reject(`Error during exportImg for ${obj.id}`);
				
			}

			if(isCancelled) return Promise.reject("Export cancelled");
			
			let response = await fetch(imgUrl);
			if (!response.ok) {
				console.error(`Failed to download image for ${obj.id}: HTTP ${response.status}`);
				return Promise.reject("Failed to download image");
			}
			
			if(isCancelled) return Promise.reject("Export cancelled");
			
			let blob = await response.blob();
			
			if(isCancelled) return Promise.reject("Export cancelled");
			
			let fileName = obj.title ? fileUtils.sanitizeFileName(obj.title) : obj.id;
			fileName = fileName.substr(0, 50);
			
			let imgFile = new File([blob], fileName + ".png", { type: blob.type });
			fileUtils.addFileToZip(zipWriter, imgFile);
			if(debugConsole){ console.log(`add File for ${obj.id}:`); }
			
			return Promise.resolve();

		} catch (error) {
			console.error(`Error exporting image for :`, error);
			return Promise.reject(error);
		}
	}
	
	// 비동기 실행 함수에 타임아웃 적용
	function withTimeout(promise, timeout) {
		return Promise.race([
			promise,
			new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout exceeded")), timeout))
		]);
	}
	
	// 순차 실행 방식으로 재시도
	async function retryExportImagesSequentially(retryList, zipWriter) {
		for (const obj of retryList) {
			try {
				if(debugConsole){ console.log(`Retry export for ${obj.id}...`); }
				await withTimeout(exportImage(zipWriter, obj), currentState.timeout);
				completedImages++;
				overlay.updateLoadingOverlay(`Exporting images: ${completedImages}/${totalImages} completed`);
				if(debugConsole){ console.log(`Retry succeeded for ${obj.id}`); }
			} catch (error) {
				console.warn(`Final retry failed for ${obj.id}:`, error.message);
			}
		}
	}
	
	function canvasToBlob(canvas, type = "image/png", quality = 1.0) {
		return new Promise((resolve) => {
			canvas.toBlob((blob) => resolve(blob), type, quality);
		});
	}


	async function getObjectSizeFromDOM(objId) {
		return new Promise((resolve) => {
			let element = document.querySelector(`[tid="${objId}"]`);
			if (element) {
				let width = element.offsetWidth || 800;
				let height = element.offsetHeight || 600;
				resolve({ width, height });
			} else {
				console.warn(` Object ${objId} not found in DOM, using default size.`);
				resolve({ width: 800, height: 600 });
			}
		});
	}
	
	function exportPrintScreen(){
		// 캡처할 대상 요소 (Qlik Sense 시트 전체를 대상으로 함)
		overlay.showLoadingOverlay("Image Capture ... ", function(){
		})
		var targetElement = $('#grid');
		// html2canvas로 스크린샷 캡처
		html2canvas(targetElement[0], {
			useCORS: true,
			allowTaint: true
		}).then(function (canvas) {
			// 캡처된 이미지 데이터를 Data URL로 변환
			var imageData = canvas.toDataURL("image/png");
			//var sheetId = qlik.navigation.getCurrentSheetId().sheetId;
			var sheetName = currentState.sheetName
			var fileName = fileUtils.sanitizeFileName(sheetName);
			fileUtils.saveFileFromUrl(imageData, fileName);
			overlay.hideLoadingOverlay();
		});
	}

    return { exportImageSelectedObjects, getObjectSizeFromDOM, exportPrintScreen };
});
