namespace demo;


using {
    cuid,
    managed,
    sap.common.CodeList as CodeList
} from '@sap/cds/common';


entity InventoryStatuses : CodeList {
    key code : String(25)
}

type InventoryStatus : Association to InventoryStatuses;


entity Inventory : cuid, managed {
    article_number    : String                    @mandatory;
    quantity          : Decimal                   @mandatory  not null  @assert.range: [
        0,
        10000000
    ];
    status            : InventoryStatus not null  @readonly             @assert.target;
    discrepancyExists : Boolean;
    discrepancyReason : String default '';
}
