export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface TokenCache {
  token: string;
  expiresAt: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}