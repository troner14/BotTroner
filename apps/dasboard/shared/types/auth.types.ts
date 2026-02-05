import '#auth-utils'

declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    email: string
  }

  interface SecureSessionData {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token: string
    scope: string
    // Añade aquí tus campos personalizados
  }
}