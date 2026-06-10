export const getMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;

  const apiUrl = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  const cleanPath = String(path).replace(/\\/g, '/').replace(/^\//, '');

  return baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`;
};
