export function chaveJwt() {
  const jwtSecret = process.env.JWT_SECRET;
  const chave = typeof jwtSecret === 'string' ? new TextEncoder().encode(jwtSecret) : null;

  if (!chave || chave.length < 32) {
    throw new Error('JWT_SECRET deve conter pelo menos 32 bytes');
  }

  return chave;
}
