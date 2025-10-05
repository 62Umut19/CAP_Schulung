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
    article           : Association to Articles   @mandatory;
    quantity          : Decimal                   @mandatory  not null  @assert.range: [
        0,
        10000000
    ];
    status            : InventoryStatus not null  @readonly             @assert.target;
    discrepancyExists : Boolean;
    discrepancyReason : String default '';
}

using {CE_PRODUCT_0002 as external} from '../srv/external/CE_PRODUCT_0002';

entity Articles as projection on external.Product {
    key Product             as number,
        BaseUnit            as unit,
        ProductGroup        as category,
        _ProductDescription : Composition of many external.ProductDescription on _ProductDescription.Product = number
}

entity ArticleTexts as projection on external.ProductDescription {
    key Language,
    key Product,
        ProductDescription
}