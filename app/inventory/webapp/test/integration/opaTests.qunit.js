sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'inventory/test/integration/FirstJourney',
		'inventory/test/integration/pages/InventoryList',
		'inventory/test/integration/pages/InventoryObjectPage'
    ],
    function(JourneyRunner, opaJourney, InventoryList, InventoryObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('inventory') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheInventoryList: InventoryList,
					onTheInventoryObjectPage: InventoryObjectPage
                }
            },
            opaJourney.run
        );
    }
);