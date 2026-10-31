// Fuerza una versión nueva de CMake para el código nativo de la app.
// Por qué: CMake 3.22.1 (el default) trae ninja 1.10, que en Windows no soporta rutas de más de 260
// caracteres y falla compilando react-native-safe-area-context. CMake 3.31.6 trae ninja 1.12, que sí.
// Requiere: sdkmanager --install "cmake;3.31.6"
const { withAppBuildGradle } = require('expo/config-plugins');

const CMAKE_VERSION = '3.31.6';

module.exports = function withCmakeVersion(config) {
  return withAppBuildGradle(config, (cfg) => {
    const marker = 'externalNativeBuild { cmake { version';
    if (!cfg.modResults.contents.includes(marker)) {
      // \r?\n: el build.gradle puede venir con saltos de línea de Windows
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /^android \{(\r?\n)/m,
        (_m, nl) => `android {${nl}    ${marker} "${CMAKE_VERSION}" } }${nl}`
      );
    }
    return cfg;
  });
};
