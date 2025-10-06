using {demo as my} from '../db/schema.cds';

service InventoryService {
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
    } actions {
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
