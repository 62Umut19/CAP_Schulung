using InventoryService as service from '../../srv/service';


annotate service.Inventory with {
    article @(Common.Label: 'Article')
            @(Common: {
        Text           : article.text,
        TextArrangement: #TextLast
    })
            @(Common: {ValueList: {
        $Type         : 'Common.ValueListType',
        CollectionPath: 'Articles',
        Parameters    : [
            {
                $Type            : 'Common.ValueListParameterInOut',
                ValueListProperty: 'number',
                LocalDataProperty: 'article_number'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'text'
            },
              {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'category'
            },
            {
                $Type            : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty: 'unit'
            }
        ],
    }, });
    status
            @Common.ValueListWithFixedValues: true
            @Common.Text                    : status.name
            @Common.TextArrangement         : #TextFirst;
}