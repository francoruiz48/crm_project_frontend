import axios from 'axios';
import { API_BASE_URL } from '../../generalService';

export const getLead = async (id : number) : Promise<object> => {
    //const lead = await axios.get(`${API_BASE_URL}/leads/${id}`)
    //return lead.data
    return leadMock[id-1]
}

const leadMock = [
    {
        "id": 1,
        "created_at": "2025-12-30T19:13:35.601139Z",
        "updated_at": "2025-12-30T19:13:35.601139Z",
        "active": true,
        "campaign_id": 1,
        "field_values": [
            {
                "id": 1,
                "created_at": "2025-12-30T19:13:35.601139Z",
                "updated_at": "2025-12-30T19:13:35.601139Z",
                "active": true,
                "field_id": 1,
                "value": "Franco Ruiz",
                "nomenclator_item_id": null,
                "lead_id": 1,
                "field": {
                    "id": 1,
                    "created_at": "2025-12-30T16:51:21.491743Z",
                    "updated_at": "2025-12-30T16:51:21.491743Z",
                    "active": true,
                    "name": "Nombre",
                    "field_type_code": "STRING",
                    "required": true,
                    "default_value": null,
                    "is_primary": false,
                    "input_mask": null,
                    "validation_rules": [],
                    "nomenclator": null,
                    "campaign": {
                        "id": 1,
                        "created_at": "2025-12-30T16:50:20.891927Z",
                        "updated_at": "2025-12-30T16:50:20.891927Z",
                        "active": true,
                        "name": "Campaña 1",
                        "description": "Campaña 1"
                    }
                },
                "nomenclator_item": null
            },
            {
                "id": 2,
                "created_at": "2025-12-30T19:13:35.601139Z",
                "updated_at": "2025-12-30T19:13:35.601139Z",
                "active": true,
                "field_id": 2,
                "value": "31",
                "nomenclator_item_id": null,
                "lead_id": 1,
                "field": {
                    "id": 2,
                    "created_at": "2025-12-30T19:13:27.016080Z",
                    "updated_at": "2025-12-30T19:13:27.016080Z",
                    "active": true,
                    "name": "Edad",
                    "field_type_code": "INT",
                    "required": true,
                    "default_value": null,
                    "is_primary": false,
                    "input_mask": null,
                    "validation_rules": [],
                    "nomenclator": null,
                    "campaign": {
                        "id": 1,
                        "created_at": "2025-12-30T16:50:20.891927Z",
                        "updated_at": "2025-12-30T16:50:20.891927Z",
                        "active": true,
                        "name": "Campaña 1",
                        "description": "Campaña 1"
                    }
                },
                "nomenclator_item": null
            }
        ]
    } ,
    {
        "id": 2,
        "created_at": "2025-12-30T19:13:35.601139Z",
        "updated_at": "2025-12-30T19:13:35.601139Z",
        "active": false,
        "campaign_id": 1,
        "field_values": [
            {
                "id": 1,
                "created_at": "2025-12-30T19:13:35.601139Z",
                "updated_at": "2025-12-30T19:13:35.601139Z",
                "active": true,
                "field_id": 1,
                "value": "Lucas",
                "nomenclator_item_id": null,
                "lead_id": 1,
                "field": {
                    "id": 1,
                    "created_at": "2025-12-30T16:51:21.491743Z",
                    "updated_at": "2025-12-30T16:51:21.491743Z",
                    "active": true,
                    "name": "Nombre",
                    "field_type_code": "STRING",
                    "required": true,
                    "default_value": null,
                    "is_primary": false,
                    "input_mask": null,
                    "validation_rules": [],
                    "nomenclator": null,
                    "campaign": {
                        "id": 1,
                        "created_at": "2025-12-30T16:50:20.891927Z",
                        "updated_at": "2025-12-30T16:50:20.891927Z",
                        "active": true,
                        "name": "Campaña 1",
                        "description": "Campaña 1"
                    }
                },
                "nomenclator_item": null
            },
            {
                "id": 2,
                "created_at": "2025-12-30T19:13:35.601139Z",
                "updated_at": "2025-12-30T19:13:35.601139Z",
                "active": true,
                "field_id": 2,
                "value": "26",
                "nomenclator_item_id": null,
                "lead_id": 1,
                "field": {
                    "id": 2,
                    "created_at": "2025-12-30T19:13:27.016080Z",
                    "updated_at": "2025-12-30T19:13:27.016080Z",
                    "active": true,
                    "name": "Edad",
                    "field_type_code": "INT",
                    "required": true,
                    "default_value": null,
                    "is_primary": false,
                    "input_mask": null,
                    "validation_rules": [],
                    "nomenclator": null,
                    "campaign": {
                        "id": 1,
                        "created_at": "2025-12-30T16:50:20.891927Z",
                        "updated_at": "2025-12-30T16:50:20.891927Z",
                        "active": true,
                        "name": "Campaña 1",
                        "description": "Campaña 1"
                    }
                },
                "nomenclator_item": null
            }
        ]
    }
]