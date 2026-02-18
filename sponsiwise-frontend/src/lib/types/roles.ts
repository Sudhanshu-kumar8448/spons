export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    ORGANIZER = 'ORGANIZER',
    SPONSOR = 'SPONSOR',
    USER = 'USER',
}

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    image?: string;
    tenantId?: string;
}
