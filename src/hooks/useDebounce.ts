import { useCallback, useEffect, useRef, useState } from "react"
import { showCommonErrorToast } from "src/utils/feedback"
/**Asegura un tiempo de "timeout" milisegundos antes de realizar la función.
 * Evita mandar una petición cuando el valor cambia rápidamente, por ejemplo, ante un onChange en un input.
 */
export const useDebounce = (timeout = 1000) => {

    const idTimeout = useRef<number | undefined>(undefined)
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        return () => clearTimeout(idTimeout.current)
    }, [])

    const debouncedFunction = useCallback((callback: () => void) => {
        clearTimeout(idTimeout.current)
        setLoading(true)
        idTimeout.current = setTimeout(() => {
            try {
                callback()
            }
            catch (e) {
                showCommonErrorToast(e)
            }
            finally {
                setLoading(false)
            }
        }, timeout)
    }, [timeout])

    return ({ debouncedFunction, loading })
}
