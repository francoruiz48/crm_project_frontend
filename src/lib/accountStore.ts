const ACCOUNTS_KEY = "saved_accounts"

export interface SavedAccount {
    userId: string, // public_uuid del usuario desde Fase 3 (coincide con UserData.id)
    name: string,
    last_name: string | null,
    email: string,
    //Se rota en cada uso (login, restauración de sesión, cambio de cuenta) - ver docs/autenticacion.md
    //("Rota el refresh token"). Siempre se guarda acá el último válido conocido para esta cuenta.
    refreshToken: string,
}

const readAll = (): SavedAccount[] => {
    try {
        const raw = localStorage.getItem(ACCOUNTS_KEY)
        return raw ? JSON.parse(raw) as SavedAccount[] : []
    } catch {
        return []
    }
}

const writeAll = (accounts: SavedAccount[]) => {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

/**
 * Cuentas con las que se inició sesión alguna vez en este navegador, para poder cambiar entre ellas sin
 * volver a loguearse (ver src/stores/UserContext.tsx: login/signup/restauración de sesión las agregan acá,
 * switchAccount las usa para pasar de una a otra).
 *
 * Nota de seguridad: esto multiplica el riesgo ya aceptado hoy por "Mantener sesión iniciada" (refresh
 * token persistido en localStorage) a N cuentas en vez de una sola. Es una decisión de producto explícita,
 * no un descuido.
 */
export const accountStore = {
    getAll(): SavedAccount[] {
        return readAll()
    },

    //Agrega la cuenta si es nueva, o actualiza sus datos/token si ya estaba guardada (nombre/email pueden
    //cambiar, y el refresh token se rota en cada uso)
    upsert(account: SavedAccount) {
        const accounts = readAll()
        const idx = accounts.findIndex(a => a.userId === account.userId)
        if (idx === -1) accounts.push(account)
        else accounts[idx] = account
        writeAll(accounts)
    },

    remove(userId: string) {
        writeAll(readAll().filter(a => a.userId !== userId))
    },
}
