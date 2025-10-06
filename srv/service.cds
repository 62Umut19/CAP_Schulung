using {demo as my} from '../db/schema.cds';

service InventoryService {
    @odata.draft.enabled
    entity Inventory as projection on my.Inventory;

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
