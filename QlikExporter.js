define( [ "qlik", "jquery", 
	"text!./src/html/template.html", 
	"text!./src/html/modalLayout.html", 
	"css!./src/css/modalStyle.css",
	"./src/js/modalScript",
	"./src/js/properties"
],
function ( qlik, $, template, pLayout, pStyles, pScript, properties) {
	return {
		support : {
			snapshot: false,
			export: false,
			exportData : false
		},
		initialProperties: {
			showTitles: false,
			disableNavMenu: true,
			showDetails: false
		},
		definition: properties,
		paint: function ($element, layout) {
			
			$element.html( template );
			var customCss = layout.customCss || "width: 100%;height: 100%;cursor: pointer;color: #e34975;font-weight: bold;background-color: #fefafd;border: 0.135px solid #e34975;padding: 6px 14px;border-radius: 4px;font-size: 12px;";
			$(".QlikCE-open-modal-btn").attr("style", customCss);
			var buttonText = layout.buttonText || "Export";
			$(".QlikCE-open-modal-btn").html(buttonText);;
			
			
			var ownId = this.options.id;
			$("#" + ownId).remove();
			// 스타일 정의
			var style = `
					div[tid="${ownId}"] .qv-object-${ownId},
					div[tid="${ownId}"] .qv-inner-object:not(.visual-cue) {
							border: none!important;
							background: none!important;
							margin: 0!important;
							padding: 0!important;
					}
					#${ownId}_title{
						display: none!important;
					}
			`;

			// 스타일 요소를 헤드에 추가
			$("<style>", { id: ownId }).html(style).appendTo("head");
			
	
			pScript.init(layout, pLayout);
			//pScript.paint(layout);
			
			/* 새로고침 버튼 구현 */
			$(document).off("click", ".QlikCE-refresh-btn").on("click", ".QlikCE-refresh-btn", function () {
				pScript.paint(layout);
			});
		
		
			return qlik.Promise.resolve();
		}
	};
	
} );

