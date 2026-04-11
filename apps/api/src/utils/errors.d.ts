export declare class AppError extends Error {
    statusCode: number;
    details?: any;
    constructor(message: string, statusCode: number, details?: any);
}
