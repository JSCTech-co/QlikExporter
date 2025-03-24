define(["jquery"], function ($) {
	//***********************************************************
	//*
	//* Loading Overlay 제어 클래스
	//*
	//***********************************************************
    function showLoadingOverlay(message, onCancelCallback) {
        $("#QlikCE-loading-text").text(message);
        $("#loadingOverlay").css("display", "flex");

        // 현재 활성화된 취소 콜백을 저장
        window.currentCancelCallback = onCancelCallback;
    }

    function hideLoadingOverlay() {
        $("#loadingOverlay").css("display", "none");
        window.currentCancelCallback = null; // 콜백 초기화
    }
	
	function updateLoadingOverlay(message){
		$("#QlikCE-loading-text").text(message);
	}
	
	// 취소 버튼 이벤트 공통 관리 (한 번만 바인딩)
	$(document).off("click", "#QlikCE-cancel-btn").on("click", "#QlikCE-cancel-btn", function () {
        if (typeof window.currentCancelCallback === "function") {
            window.currentCancelCallback(); // 현재 활성화된 콜백 실행
        }
        hideLoadingOverlay(); // Overlay 닫기
    });
	
	return {
		showLoadingOverlay: showLoadingOverlay,
        hideLoadingOverlay: hideLoadingOverlay,
		updateLoadingOverlay: updateLoadingOverlay
	}
});
