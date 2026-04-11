export declare const generateTokens: (userId: string) => {
    accessToken: string;
    refreshToken: string;
};
export declare const verifyAccessToken: (token: string) => {
    sub: string;
};
export declare const verifyRefreshToken: (token: string) => {
    sub: string;
};
