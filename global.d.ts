export {};

declare global {
    namespace Express {
        export interface Request {
            uid?: number;
            user?: { id: number; email: string };
        }
    }
}
