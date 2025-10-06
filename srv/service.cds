using {demo as my} from '../db/schema.cds';

service InventoryService {
    type UISettings {
        isDiscrepancyFacetVisible : Boolean;
        isSendButtonVisible       : Boolean;
    }

    @odata.draft.enabled
    @(restrict: [
        {grant: [
            'READ',
            'CREATE'
        ]},
        {
            grant: ['UPDATE'],
            where: 'status_code = `W` or status_code = `O`'
        },
        {
            grant: ['DELETE'],
            where: 'status_code = `O`'
        },
        {
            grant: 'sendInventoryInformation',
            where: 'status_code = `O` or status_code = `W`'
        },
    ])
    entity Inventory as projection on my.Inventory {
        *,
        virtual null as criticality : Integer,
        virtual null as uiSettings  : UISettings
    } actions {
        @(
            cds.odata.bindingparameter.name: '_it',
            Common.SideEffects             : {TargetProperties: [
                '_it/status_code',
                '_it/criticality',
                '_it/uiSettings_isSendButtonVisible'
            ]}
        )
        action sendInventoryInformation();
    };

    @readonly
    entity Articles  as
        projection on my.Articles {
            *,
            null as text : String
        };

    @cds.persistence.skip
    @odata.singleton
    entity ExcelUpload {
        @Core.MediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        excel : LargeBinary;
    }
}
