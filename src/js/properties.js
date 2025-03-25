define([], function () {
    //***********************************************************
	//*
	//* Extension Properties
	//*
	//***********************************************************

    var settings = {
        // property panel definition
        mysection: {
            label: "Extension Settings",
            type: "items",
            items: [
                {
                    ref: "customCss",
                    label: "Button CSS",
                    type: "string",
                    expression: "optional",
                    defaultValue: "width: 100%;height: 100%;cursor: pointer;color: #e34975;font-weight: bold;background-color: #fefafd;border: 0.135px solid #e34975;padding: 6px 14px;border-radius: 4px;font-size: 12px;"
                },
                { 
                    ref: "buttonText",
                    label: "Button Text",
                    type: "string",
                    expression: "optional",
                    defaultValue: "Export"  
                },
				{
                    ref: "titleFilter",
                    label: "Filter by title only",
                    type: "boolean",
                    defaultValue: true
                },
				{
                    ref: "zipExportMode",
                    label: "ZIP export (replace Excel merge)",
                    type: "boolean",
                    defaultValue: true
                },
                {
                    ref: "forceEncrypt",
                    label: "Force Encryption",
                    type: "boolean",
                    defaultValue: true
                },
            ]
        },
		developerSettings: {
			label: "Developer Settings",
			type: "items",
			items: {
				serverAddress: {
					ref: "serverAddress",
					label: "Encrypt Server URL (Endpoint)",
					type: "string",
					expression: "optional",
					defaultValue: "https://cqisdev.lge.com"
				},
				timeout: {
                    ref: "timeout",
                    label: "Image Render Timeout (ms) Mode",
                    type: "number",
                    defaultValue: 30000
                },
				isDevelop: {
					ref: "isDevelop",
					label: "Develop Mode",
					type: "boolean",
					defaultValue: false
				},
                debugConsole: {
                    ref: "debugConsole",
					label: "Debug Console",
					type: "boolean",
					defaultValue: false
                }
			}
		}
    };

    return {
        type: "items",
        component: "accordion",
        items: settings
    };
});
