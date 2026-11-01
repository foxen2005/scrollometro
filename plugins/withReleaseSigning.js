// Firma el build release con la llave propia de Scrollómetro en vez del debug.keystore de la plantilla
// (que es igual en todos los proyectos Expo y tiene clave pública "android").
// La llave y sus claves NO están en el repo: se leen de ~/.gradle/gradle.properties
//   SCROLLOMETRO_STORE_FILE, SCROLLOMETRO_KEY_ALIAS, SCROLLOMETRO_STORE_PASSWORD, SCROLLOMETRO_KEY_PASSWORD
// Si no están (otro PC, CI), el release cae a la llave debug para que el build no se rompa.
// Las actualizaciones dentro de la app SOLO funcionan si todos los releases se firman con la misma llave.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            if (project.hasProperty('SCROLLOMETRO_STORE_FILE')) {
                storeFile file(SCROLLOMETRO_STORE_FILE)
                storePassword SCROLLOMETRO_STORE_PASSWORD
                keyAlias SCROLLOMETRO_KEY_ALIAS
                keyPassword SCROLLOMETRO_KEY_PASSWORD
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('SCROLLOMETRO_STORE_FILE')) return cfg;

    // 1) signingConfigs.release
    src = src.replace(/signingConfigs \{(\r?\n)/, (_m, nl) => `signingConfigs {${RELEASE_CONFIG.replace(/\n/g, nl)}${nl}`);

    // 2) el buildType release usa la llave propia si está configurada
    src = src.replace(
      /(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('SCROLLOMETRO_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
    );

    cfg.modResults.contents = src;
    return cfg;
  });
};
