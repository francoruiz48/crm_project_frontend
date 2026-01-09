export const API_BASE_URL = 'http://localhost:8000';

export const getFieldType = (fieldType : string, 
    value: string | boolean | number) => {
        if (typeof value !== "string") return value
        
    switch (fieldType){
        case "INT":
        case "NUMBER":
            return parseInt(value)
        case "BOOL":
            return Boolean(value)
    }
    return value
}