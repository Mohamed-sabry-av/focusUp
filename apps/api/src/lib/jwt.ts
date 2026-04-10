import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: '15m',
  });
  
  const refreshToken = jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });
  
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as { sub: string };
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string };
};
