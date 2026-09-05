import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLoading } from 'src/hooks/useLoading'
import { getDictionaries } from 'src/services/generalService'
import type { Dictionary } from 'src/types/shared'
import { showCommonErrorToast } from 'src/utils/feedback'

type DictTypes = keyof Dictionary

interface DictionaryContextItems {
    dictionaries: Dictionary,
    loading: boolean,
    // Permite forzar un fetch adicional de keys específicas (ej. si un componente
    // necesita una key que no estaba en el fetch inicial).
    fetchDictionaries: (keys: DictTypes[]) => Promise<Dictionary>,
}

const DictionaryContext = createContext<DictionaryContextItems | undefined>(undefined)

// Todas las keys disponibles. Se traen todas en el fetch inicial para que ningún
// consumer necesite pedir nada aparte salvo casos excepcionales.
const ALL_DICT_KEYS: DictTypes[] = [
    "entities",
    "lead_search_operators",
    "routing_condition_types",
    "team_roles",
    "lead_states_categories",
    "lead_view_visibilities",
    "automation_compatibility_matrix",
    "system_audit_log_actions",
]

export const DictionaryProvider = ({ children }: { children?: ReactNode }) => {
    const [dictionaries, setDictionaries] = useState<Dictionary>({})
    const fetchedRef = useRef(false)

    const fetchDict = async () => {
        if (fetchedRef.current) return
        fetchedRef.current = true
        getDictionaries(ALL_DICT_KEYS)
            .then(setDictionaries)
            .catch(e => showCommonErrorToast(e, "Error obteniendo diccionarios"))
    }

    const { loading, fnWithLoading } = useLoading(fetchDict)

    useEffect(() => {
        fnWithLoading()
    }, [fnWithLoading])

    const fetchDictionaries = useCallback(async (keys: DictTypes[]) => {
        const result = await getDictionaries(keys)
        setDictionaries(prev => ({ ...prev, ...result }))
        return result
    }, [])

    return (
        <DictionaryContext.Provider value={{ dictionaries, loading, fetchDictionaries }}>
            {children}
        </DictionaryContext.Provider>
    )
}

export const useDictionaryContext = () => {
    const ctx = useContext(DictionaryContext)
    if (!ctx) throw new Error("useDictionaryContext debe usarse dentro de un DictionaryProvider")
    return ctx
}
