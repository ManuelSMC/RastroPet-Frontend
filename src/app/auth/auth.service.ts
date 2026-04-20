import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppUser, AuthSession, UserFormInput, UserStats } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly usersKey = 'rastropet.users';
  private readonly sessionKey = 'rastropet.session';
  private readonly apiRoot = environment.apiUrl.replace(/\/reports$/, '');
  private readonly authUrl = `${this.apiRoot}/auth`;
  private readonly usersUrl = `${this.apiRoot}/users`;
  private readonly usersSubject = new BehaviorSubject<AppUser[]>([]);
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  private readonly readyPromise: Promise<void>;

  readonly users$ = this.usersSubject.asObservable();
  readonly session$ = this.sessionSubject.asObservable();

  constructor() {
    this.readyPromise = this.bootstrap();
  }

  get currentUser(): AuthSession | null {
    return this.sessionSubject.value;
  }

  isAuthenticated(): boolean {
    return Boolean(this.currentUser);
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  async login(email: string, password: string): Promise<AuthSession> {
    await this.readyPromise;
    const response = await firstValueFrom(
      this.http.post<{ session: AuthSession }>(`${this.authUrl}/login`, {
        email: email.trim(),
        password
      })
    );

    const session = response.session;
    this.sessionSubject.next(session);
    this.saveSession(session);

    if (session.role === 'admin') {
      await this.fetchUsers();
    }

    return session;
  }

  async register(input: UserFormInput): Promise<AuthSession> {
    await this.readyPromise;
    const response = await firstValueFrom(
      this.http.post<{ session: AuthSession }>(`${this.authUrl}/register`, {
        name: input.name.trim(),
        email: input.email.trim(),
        password: input.password || ''
      })
    );

    const session = response.session;
    this.sessionSubject.next(session);
    this.saveSession(session);
    return session;
  }

  async createUser(input: UserFormInput): Promise<AppUser> {
    await this.readyPromise;
    const session = this.requireSession();
    const user = await firstValueFrom(
      this.http.post<AppUser>(
        this.usersUrl,
        {
          name: input.name.trim(),
          email: input.email.trim(),
          role: input.role,
          password: input.password || ''
        },
        { headers: this.authHeaders(session.token) }
      )
    );

    this.usersSubject.next([user, ...this.usersSubject.value]);
    this.persistUsers(this.usersSubject.value);
    return user;
  }

  async updateUser(userId: string, input: UserFormInput): Promise<AppUser> {
    await this.readyPromise;
    const session = this.requireSession();
    const updatedUser = await firstValueFrom(
      this.http.put<AppUser>(
        `${this.usersUrl}/${userId}`,
        {
          name: input.name.trim(),
          email: input.email.trim(),
          role: input.role,
          password: input.password || ''
        },
        { headers: this.authHeaders(session.token) }
      )
    );

    const users = this.usersSubject.value.map((user) => (user.id === userId ? updatedUser : user));
    this.usersSubject.next(users);
    this.persistUsers(users);

    if (this.currentUser?.id === userId) {
      const nextSession: AuthSession = {
        ...session,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      };
      this.sessionSubject.next(nextSession);
      this.saveSession(nextSession);
    }

    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.readyPromise;
    const session = this.requireSession();
    await firstValueFrom(
      this.http.delete<void>(`${this.usersUrl}/${userId}`, {
        headers: this.authHeaders(session.token)
      })
    );

    const users = this.usersSubject.value.filter((item) => item.id !== userId);
    this.usersSubject.next(users);
    this.persistUsers(users);

    if (this.currentUser?.id === userId) {
      this.logout();
    }
  }

  logout(): void {
    this.sessionSubject.next(null);
    localStorage.removeItem(this.sessionKey);
    this.usersSubject.next([]);
    localStorage.removeItem(this.usersKey);
  }

  listUsers(): AppUser[] {
    return [...this.usersSubject.value];
  }

  async fetchUsers(): Promise<AppUser[]> {
    await this.readyPromise;
    const session = this.requireSession();
    const users = await firstValueFrom(
      this.http.get<AppUser[]>(this.usersUrl, {
        headers: this.authHeaders(session.token)
      })
    );

    this.usersSubject.next(users);
    this.persistUsers(users);
    return users;
  }

  async getUserStats(): Promise<UserStats> {
    await this.readyPromise;
    const session = this.requireSession();
    return firstValueFrom(
      this.http.get<UserStats>(`${this.usersUrl}/stats`, {
        headers: this.authHeaders(session.token)
      })
    );
  }

  async ensureReady(): Promise<void> {
    await this.readyPromise;
  }

  private async bootstrap(): Promise<void> {
    const persistedUsers = this.readUsers();
    if (persistedUsers.length) {
      this.usersSubject.next(persistedUsers);
    }

    const storedSession = this.readSession();
    if (!storedSession?.token) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ session: AuthSession }>(`${this.authUrl}/me`, {
          headers: this.authHeaders(storedSession.token)
        })
      );

      const session = response.session;
      this.sessionSubject.next(session);
      this.saveSession(session);

      if (session.role === 'admin') {
        await this.fetchUsers();
      }
    } catch {
      this.logout();
    }
  }

  private persistUsers(users: AppUser[]): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  private readUsers(): AppUser[] {
    const raw = localStorage.getItem(this.usersKey);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as AppUser[];
    } catch {
      return [];
    }
  }

  private saveSession(session: AuthSession): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private readSession(): AuthSession | null {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }

  private requireSession(): AuthSession {
    const session = this.sessionSubject.value;
    if (!session?.token) {
      throw new Error('Tu sesion expiro. Inicia sesion nuevamente.');
    }

    return session;
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }
}
