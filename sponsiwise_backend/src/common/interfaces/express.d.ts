import type { JwtPayloadWithClaims } from '../auth/interfaces';

/**
 * Augment the Express Request interface so `req.user`
 * is properly typed after AuthGuard attaches the decoded JWT.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadWithClaims;
    }
  }
}
