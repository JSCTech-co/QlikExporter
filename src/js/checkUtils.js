define(["qlik", "./state"], function (qlik, state) {
    var sheetId = qlik.navigation.getCurrentSheetId().sheetId;
	var currentState = state.getState(sheetId);
	var debugConsole = false;

    async function checkColumnFilter(selectedIds){
		sheetId = qlik.navigation.getCurrentSheetId().sheetId;
		currentState = state.getState(sheetId);
		debugConsole = currentState.debugConsole;
		
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

    return {checkColumnFilter};
});
