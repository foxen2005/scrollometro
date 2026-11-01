// Aplica la política de red de la app (res/xml/scrollometro_network_security.xml, en el módulo scroll-tracker):
// HTTPS obligatorio en todo, excepto dreamlo.com (ranking), que en su plan gratis solo responde por HTTP.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withNetworkSecurity(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$['android:networkSecurityConfig'] = '@xml/scrollometro_network_security';
      delete app.$['android:usesCleartextTraffic']; // la política de arriba manda
    }
    return cfg;
  });
};
