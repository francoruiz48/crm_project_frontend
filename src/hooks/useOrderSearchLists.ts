import { useCallback, useMemo, useState } from "react"
import type { OrderParams, OrderSearchParams, SearchParams } from "src/types/shared"
import { useUserContext } from "src/stores/UserContext"

export const useOrderSeachList = (
    entityName: string,
    // id Solo para instancias de listas dentro de otras listas, 
    //donde se puede abrir múltiples listas con diferentes filtros (Nomenclator_Items)
    id?: string,
    defaultValues?: OrderSearchParams,
) => {

    const {
        order_by: defOrderBy,
        ascending: defAsc,
        search: defSearch,
        search_fields: defFields,
    } = defaultValues ?? {}

    // Los filtros se persisten por organización activa, entidad e instancia, para que
    // los filtros aplicados en una org no se arrastren a otra al cambiar de organización.
    const { activeOrg } = useUserContext()

    const entityFilterName = useMemo(() =>
        `${entityName}${id ? "_" + id : ""}_${activeOrg?.id ?? "no-org"}_filters`,
        [entityName, id, activeOrg?.id])

    const [orderParams, setOrderParams] = useState<OrderParams>({ order_by: defOrderBy, ascending: defAsc })
    const [searchParams, setSearchParams] = useState<SearchParams>({ search: defSearch, search_fields: defFields })
    const [filterParams, setFilterParams] = useState<Record<string, string>>(() => {
        try {
            return JSON.parse(sessionStorage.getItem(entityFilterName) ?? "{}")
        } catch {
            // Clave corrupta o sessionStorage no disponible: se arranca sin filtros persistidos
            return {}
        }
    })

    const handleOrderChange = useCallback((orderBy?: string, asc: boolean = false) => {
        if (!orderBy) setOrderParams({})
        else setOrderParams({ order_by: orderBy, ascending: asc })
    }, [])

    const handleSearchChange = useCallback((search?: string, searchField?: string) => {
        if (!search) setSearchParams({})
        else setSearchParams({ search, search_fields: searchField })
    }, [])

    const handleFilterChange = useCallback((newFilters: Record<string, string>) => {
        setFilterParams(newFilters)
        // Guard contra sessionStorage no disponible (modo privado, cuota llena): los filtros
        // se mantienen igual en memoria, solo no quedan persistidos entre recargas.
        try {
            sessionStorage.setItem(entityFilterName, JSON.stringify(newFilters))
        } catch {
            // sin persistencia
        }
    }, [entityFilterName])

    const fetchParams = useMemo(() => (
        {
            ...orderParams,
            ...searchParams,
            ...filterParams,
        }), [orderParams, searchParams, filterParams])

    // Memoizado para que changeHandlers sea una referencia estable (los handlers internos
    // ya lo son vía useCallback) y el React Compiler pueda preservar la memoización manual
    // en los consumidores que envuelven estos handlers.
    const changeHandlers = useMemo(() => ({
        handleOrderChange, handleSearchChange, handleFilterChange, filterParams
    }), [handleOrderChange, handleSearchChange, handleFilterChange, filterParams])

    return ({
        fetchParams, handleOrderChange, handleSearchChange, handleFilterChange, filterParams,
        changeHandlers
    })
}