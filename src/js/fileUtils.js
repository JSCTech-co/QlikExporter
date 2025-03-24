define(["../lib/zip-full.min"], function (zipjs) {
	
	//***********************************************************
	//*
	//* File 관련 유틸
	//*
	//***********************************************************
	function sanitizeSheetName(index, sheetName, maxLength = 31){
		sheetName = sheetName.trim();
		var indexStr = (index + 1).toString().padStart(2, '0'); // 1 → "01", 2 → "02"
		var uniqueSheetName = `${indexStr}_${sheetName}`; // "01_이름", "02_이름" 형식
		return uniqueSheetName.replace(/[:\\\/\?\*\[\]]/g, "_").substr(0, maxLength).trim();
	}
	
    function sanitizeFileName(fileName, maxLength = 255) {
		fileName = fileName.trim();
        var uniqueFileName = fileName.replace(/[\/\\:*?"<>|]/g, "_").substr(0, maxLength-16);
		var timeStamp = getTimeStamp();
		return `${uniqueFileName}_${timeStamp}`;
    }
	
    function saveFileFromBlob(blob, fileName) {
        saveFileFromUrl(URL.createObjectURL(blob), fileName);
    }
	
	function saveFileFromUrl(url, fileName){
		let link = document.createElement("a");
		link.href = url;
		link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
	}
	
	function getTimeStamp() {
		var now = new Date();

		var yy = now.getFullYear().toString().slice(-2); // 연도 2자리 (YY)
		var mm = (now.getMonth() + 1).toString().padStart(2, '0'); // 월 (MM, 2자리)
		var dd = now.getDate().toString().padStart(2, '0'); // 일 (DD, 2자리)
		var hh = now.getHours().toString().padStart(2, '0'); // 시 (HH, 2자리)
		var mi = now.getMinutes().toString().padStart(2, '0'); // 분 (MM, 2자리)
		var ss = now.getSeconds().toString().padStart(2, '0'); // 초 (SS, 2자리)
		var ms = now.getMilliseconds().toString().padStart(3, '0'); // 밀리초 (mmm, 3자리)

		return `${yy}${mm}${dd}${hh}${mi}${ss}${ms}`;
	}


	var BlobWriter = zipjs.BlobWriter;
    var ZipWriter = zipjs.ZipWriter;
    var BlobReader = zipjs.BlobReader;

	async function createZipWriter(password) {
        return new ZipWriter(new BlobWriter("application/zip"), { password });
    }

    async function addFileToZip(zipWriter, file) {
        await zipWriter.add(file.name, new BlobReader(file));
    }

    async function finalizeZip(zipWriter) {
        return await zipWriter.close();
    }
	
    return { sanitizeSheetName, sanitizeFileName, saveFileFromBlob, saveFileFromUrl, createZipWriter, addFileToZip, finalizeZip};
});
