/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para resolver problemas de CSP com Google Apps Script
  async headers() {
    return [
      {
        // Aplicar headers para todas as rotas
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://*.googleapis.com",
              "frame-src 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  },
  
  // Configuração para produção
  env: {
    CUSTOM_KEY: 'rotas-cd-pa',
  }
};

module.exports = nextConfig;