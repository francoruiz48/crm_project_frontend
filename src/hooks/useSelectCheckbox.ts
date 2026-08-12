import { useCallback, useMemo, useState } from "react"

export const useSelectCheckbox = <T extends { id: string, active?: boolean }>() => {
    const [checkedItems, setCheckedItems] = useState<Map<string, T>>(new Map())

    const checkedItemsArray = useMemo(() => Array.from(checkedItems.values()), [checkedItems])

    const addItem = useCallback((item: T | T[]) => {
        const addSingleItem = (item: T) => {
            if (checkedItems.has(item.id)) return
            setCheckedItems(prev => new Map(prev).set(item.id, item))
        }
        if (Array.isArray(item)) item.map(i => addSingleItem(i))
        else addSingleItem(item)
    }, [checkedItems])

    const removeItem = useCallback((item: T | T[]) => {
        setCheckedItems(prev => {
            const newMap = new Map(prev)
            if (Array.isArray(item)) {
                item.forEach(i => newMap.delete(i.id))
            }
            else newMap.delete(item.id)
            return newMap
        })
    }, [])

    const removeAllItems = useCallback(() => {
        setCheckedItems(new Map())
    }, [])

    const areThereActiveItems = useMemo(() => {
        const valuesArray = checkedItemsArray
        if (valuesArray.length > 0 && valuesArray[0].active === undefined) return false
        return valuesArray.some(checked => checked.active)
    }, [checkedItemsArray])

    const areThereInactiveItems = useMemo(() => {
        const valuesArray = checkedItemsArray
        if (valuesArray.length > 0 && valuesArray[0].active === undefined) return false
        return valuesArray.some(checked => !checked.active)
    }, [checkedItemsArray])

    return ({
        checkedItems, addItem, removeItem, removeAllItems,
        checkedItemsArray, areThereActiveItems, areThereInactiveItems
    })
}
