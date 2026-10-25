3XyzMedia STUDIO v50 — IN-PAGE GPU MORPH 20K (TEST BUILD)

CHANGED
- MORPH 20K button opens the GPU effect without location.assign / page reload.
- GPU overlay is lazy loaded; Gaussian scene and STUDIO settings remain in the same page.
- Full 20K source/target animation stays from v49, LABEL_REAL_20000.xyz.bin unchanged.
- After the 20K animation cycle the overlay closes and STUDIO is shown again.
- Manual close releases GPU overlay via iframe about:blank.
- SHARE uses the same STUDIO URL with scene/model/encoded state and MORPH enable flag; gpu=1 no longer automatically replaces STUDIO.

LIMITATIONS
- This is an in-page graphics layer, NOT a single shared WebGL render or identical camera/geometry morph of visible Gaussian splats.
- At effect start Gaussian scene is hidden, then sampled 20K representation is shown; camera alignment is approximate/not implemented.
- While running, krpano WebGL context remains alive underneath the GPU layer; may be too heavy on low memory GPUs.
- No actual hardware browser validation performed; needs browser smoke test before calling production-ready.

Deploy the whole logo-test-v50 folder alongside v49 (do not overwrite v49).
URL: https://3xyzmedia.github.io/VIEWER/logo-test-v50/studio.html
