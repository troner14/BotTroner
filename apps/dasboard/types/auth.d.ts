
declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    email: string
  }

  interface UserSession {
    // Añade aquí tus campos personalizados
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