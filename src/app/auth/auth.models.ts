export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface UserStats {
  totalUsers: number;
  totalAdmins: number;
}

export interface UserFormInput {
  name: string;
  email: string;
  role: UserRole;
  password?: string;
}
