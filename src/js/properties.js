define([], function () {
    //***********************************************************
	//*
	//* Extension Properties
	//*
	//***********************************************************

    var settings = {
        // property panel definition
		styleSettings: {
			label: "Style Settings",
			type: "items",
			items: {
			     buttonText: { 
                    ref: "buttonText",
                    label: "Button Text",
                    type: "string",
                    expression: "optional",
                    defaultValue: "Export"  
                },
				customCss: {
                    ref: "customCss",
                    label: "Button CSS",
                    type: "string",
                    expression: "optional",
                    defaultValue: "width: 100%;height: 100%;cursor: pointer;color: #e34975;font-weight: bold;background-color: #fefafd;border: 0.135px solid #e34975;padding: 6px 14px;border-radius: 4px;font-size: 12px;"
                }
			}
		},
        extensionSettings: {
            label: "Extension Settings",
            type: "items",
            items: {
				titleFilter: {
                    ref: "titleFilter",
                    label: "Only titled objects",
                    type: "boolean",
                    component: "switch",
                    options: [{
                        value: false,
                        label: "False",
                    },{
                        value: true,
                        label: "True"
                    }],
                    defaultValue: true
                },
				zipExportMode:{
                    ref: "zipExportMode",
                    label: "Data Export Mode",
                    type: "boolean",
                    component: "switch",
                    options: [{
                        value: false,
                        label: "Sheet Merge",
                    },{
                        value: true,
                        label: "Zip File"
                    }],
                    defaultValue: true
                },
                forceEncrypt: {
                    ref: "forceEncrypt",
                    label: "Encryption Mode",
                    type: "boolean",
                    component: "switch",
                    options: [{
                        value: false,
                        label: "Encryption is optional",
                    },{
                        value: true,
                        label: "Encryption is required"
                    }],
                    defaultValue: true
                },
                enableCapture: {
                    ref: "enableCapture",
                    label: "Screen Capture",
                    type: "boolean",
                    component: "switch",
                    options: [{
                        value: true,
                        label: "Enable",
                    },{
                        value: false,
                        label: "Disable"
                    }],
                    defaultValue: false
                },
                columnFilter: {
                    ref: "columnFilter",
                    label: "Column Filter",
                    type: "string",
                    expression: "optional",
                    defaultValue: ""
                },
                filteredMessage: {
                    ref: "filteredMessage",
                    label: "Export message for column filter",
                    type: "string",
                    defaultValue: ""
                }
			}
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
                    component: "switch",
                    options: [{
                        value: false,
                        label: "Disable",
                    },{
                        value: true,
                        label: "Enable"
                    }],
					defaultValue: false
				},
                debugConsole: {
                    ref: "debugConsole",
					label: "Debug Console",
					type: "boolean",
                    component: "switch",
                    options: [{
                        value: false,
                        label: "Debug Console Off",
                    },{
                        value: true,
                        label: "Debug Console On"
                    }],
					defaultValue: false
                },
                captureLibrary:{
                    ref: "captureLibrary",
                    label: "Capture Library",
                    type: "boolean",
                    component: "switch",
                    options: [{
                        value: false,
                        label: "Html2Canvas",
                    },{
                        value: true,
                        label: "Html-To-Image"
                    }],
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
