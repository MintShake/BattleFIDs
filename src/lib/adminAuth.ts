const ADMIN_ADDRESSES = new Set([
  '0x15872d49d90638ae8cedd41ba12e52e6f4f26d84',
  '0x5ad87e617e83f5611a72186f947d376740144144',
  '0xa8361a6857a8af7b06a11b417cd1617c0465e9c5',
]);

export function isAdminAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return ADMIN_ADDRESSES.has(address.toLowerCase());
}
