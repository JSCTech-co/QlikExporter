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
                    ref: "serverAddress",
                    label: "Encrypt Server URL (Endpoint)",
                    type: "string",
                    expression: "optional",
                    defaultValue: "https://223.130.139.187:8891"  
                },
				{
                    ref: "timeout",
                    label: "Image Render Timeout (ms) Mode",
                    type: "number",
                    defaultValue: 30000
                },
				{
                    ref: "isDevelop",
                    label: "Develop Mode",
                    type: "boolean",
                    defaultValue: true
                },
				{
                    ref: "titleFilter",
                    label: "Only objects with a title are filtered.",
                    type: "boolean",
                    defaultValue: true
                },
            ]
        }
    };

    return {
        type: "items",
        component: "accordion",
        items: settings
    };
});
