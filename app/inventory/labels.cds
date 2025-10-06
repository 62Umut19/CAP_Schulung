using InventoryService as service from '../../srv/service';

annotate service.Inventory with @(
    UI.HeaderInfo    : {
        TypeName      : 'Inventory Reconcilliation',
        TypeNamePlural: 'Inventory Reconcilliation',
        Title         : {Value: article_number}
    },
    UI.LineItem      : [
        {
            $Type : 'UI.DataFieldForAction',
            Action: 'InventoryService.sendInventoryInformation',
            Label : 'Send',
        },
        {
            $Type: 'UI.DataField',
            Value: article_number,
        },
        {
            $Type: 'UI.DataField',
            Label: '{@i18n>quantity}',
            Value: quantity,
        },
        {
            $Type: 'UI.DataField',
            Label: 'Unit',
            Value: article.unit,
        },
        {
            $Type                    : 'UI.DataField',
            Label                    : 'Status',
            Value                    : status.name,
            Criticality              : criticality,
            CriticalityRepresentation: #WithIcon
        }
    ],
    UI.Identification: [{
        $Type        : 'UI.DataFieldForAction',
        Action       : 'InventoryService.sendInventoryInformation',
        Label        : 'Send',
        ![@UI.Hidden]: {$edmJson: {$Ne: [
            {$Path: 'uiSettings_isSendButtonVisible'},
            true
        ]}}
    }]
);

annotate service.Inventory with @(
    UI.FieldGroup #InventoryInfoGroup  : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Article',
                Value: article_number
            },
            {
                $Type: 'UI.DataField',
                Label: 'quantity',
                Value: quantity,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Unit',
                Value: article.unit,
            },
            {
                $Type                    : 'UI.DataField',
                Label                    : 'Status',
                Value                    : status_code,
                Criticality              : criticality,
                CriticalityRepresentation: #WithIcon
            }
        ],
    },
    UI.FieldGroup #DiscrepancyInfoGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [{
            $Type                  : 'UI.DataField',
            Label                  : 'Reason',
            Value                  : discrepancyReason,
            ![@Common.FieldControl]: #Mandatory
        }],
    },
    UI.Facets                          : [
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'InventoryInfo',
            Label : 'Inventory Information',
            Target: '@UI.FieldGroup#InventoryInfoGroup',
        },
        {
            $Type        : 'UI.ReferenceFacet',
            ID           : 'DiscrepancyInfo',
            Label        : 'Discrepancy Reason',
            Target       : '@UI.FieldGroup#DiscrepancyInfoGroup',
        }
    ]
);

annotate service.Inventory with {
    discrepancyReason @UI.MultiLineText: true
}
