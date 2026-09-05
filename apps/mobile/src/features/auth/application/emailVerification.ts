import type {User} from '@aqualino/contracts';

export function requiresEmailVerification(user: User | null): boolean {
  return user?.email_verification_required === true && !user.email_verified_at;
}
