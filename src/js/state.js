define(["qlik"], function (qlik) {
	//***********************************************************
	//*
	//* 상태 저장 클래스
	//*
	//***********************************************************
	
    var instances = {}; // 시트별 state 저장 객체

    function getInstance(sheetId) {
        if (!instances[sheetId]) {
            instances[sheetId] = {
                sheetId: sheetId,
                layout: null,  // layout 전체 저장
                isDevelop: false,
				serverAddress: "",
				sheet: null,
                sheetName: "",
				timeout: 30000,
				titleFilter: true,
				zipExportMode: true,
                debugConsole: false,
                forceEncrypt: true,
            };
        }
        return instances[sheetId];
    }

    async function init(layout) {
        var sheetId = qlik.navigation.getCurrentSheetId().sheetId; 
		var state = getInstance(sheetId);
		
		state.sheet = await qlik.currApp().getObject(sheetId);
		state.sheetName = state.sheet.layout.qMeta.title;
        state.layout = layout;
        state.isDevelop = layout.isDevelop;
        state.serverAddress = layout.serverAddress;
		state.timeout = layout.timeout;
		state.titleFilter = layout.titleFilter;
		state.zipExportMode = layout.zipExportMode;
        state.debugConsole = layout.debugConsole;
        state.forceEncrypt = layout.forceEncrypt;
    }

    function getState(sheetId) {
        return getInstance(sheetId);
    }

    return {
        init: init,
        getState: getState
    };
});
