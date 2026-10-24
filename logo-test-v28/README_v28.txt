3XyzMedia LABEL MORPH v28 — TWO MODES

Что сделано:
1. Убран выбор BASE/DENSE как отдельного дублирующего MORPH.
2. Оставлен единый блок LOGO MORPH с двумя режимами:
   - ETHER · из эфира (20K integrated через ThreeJS plugin)
   - MODEL · из модели (штатный krpano shader morph)
3. Один общий слайдер MORPH, одна кнопка MORPH, общие вращения/смещения/масштаб.
4. SHARE передаёт:
   - morphsource
   - morphpoint
   - morphsize
   - morphscale
   - rotation/offset параметры

Файлы:
- studio.html
- logo_morph_v28.js
- logo_integrated_v28.js
- scene_logo_v28.xml
- scene_logo_v28_mobile.xml

Важно:
- Для режима ETHER нужен файл /VIEWER/plugins/threejs_krpanoplugin.js
- Без плагина режим MODEL продолжает работать как безопасный fallback.
