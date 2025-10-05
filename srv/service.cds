using {demo as my} from '../db/schema.cds';
service InventoryService {
    entity Inventory as projection on my.Inventory;
}