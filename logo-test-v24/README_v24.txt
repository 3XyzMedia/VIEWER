3XyzMedia v24 INTEGRATED · TEST BUILD

BASE: exact working v23 source, no changes to original splatshader and logo_morph handlers.

Desktop: optional 20,000-point real LABEL geometry (XYZ and SH DC RGB), rendered through krpano ThreeJS plugin using integratedrendering=true. One WebGL context, no overlay canvas. Gaussian-like soft point sprites, not original anisotropic Gaussian kernels. v23 morph is still fully functional even without plugin.

DEPENDENCY (important): plugin must exist in VIEWER/plugins/threejs_krpanoplugin.js (official krpano 1.24 distribution). This ZIP does not contain the proprietary krpano plugin. If absent, new density layer is disabled with a status in MORPH window, while v23 continues normally.

The 20K layer adds detail to the original v23 morph. The original 4096 destination positions from v23 are still used, alongside this additional layer. 20K layer is desktop-only. The user-selected source model still morphs through v23 GLSL. Mobile v23 unchanged.

Live sliders X/Y/Z, offsets, scale, size: JS observer updates added geometry every frame without intercepting or replacing live krpano handlers. SHARE continues to use v23 controls; no new link parameters. 

Known uncertainty: 3D spatial alignment and official plugin installation require live browser checking. Plugin optional by design; true per-Gaussian covariance/color rasterization is not yet included.

Install entire logo-test-v24 folder in /VIEWER. Also install official krpano 1.24 plugins/threejs_krpanoplugin.js in /VIEWER/plugins/ if missing. DO NOT overwrite working v23.
Test URL: https://3xyzmedia.github.io/VIEWER/logo-test-v24/studio.html
