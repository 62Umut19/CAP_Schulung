using InventoryService as service from '../../srv/service';

annotate service.Inventory with @(
    UI.DeleteHidden: {$edmJson: {$Ne: [
        {$Path: 'status_code'},
        'O',
    ]}},
    UI.UpdateHidden: {$edmJson:  {$Eq: [
        {$Path: 'status_code'}, 'S'
    ]}},
);