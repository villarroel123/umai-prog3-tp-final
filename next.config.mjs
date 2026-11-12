const nextConfig = {
  headers() {
    return ['/login', '/crear-cuenta'].map(source => ({
      source,
      headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
    }));
  },
};
export default nextConfig;
