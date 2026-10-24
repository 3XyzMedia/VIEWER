3XyzMedia — LOGO MORPH v6, единый комплект

НОВАЯ ПАПКА: VIEWER/logo-test-v6/
Скопируй ВСЕ файлы этого архива в эту папку. Старую logo-test-v5 не трогай.

Содержимое:
studio.html, scene_logo_v6.xml, scene_logo_v6_mobile.xml,
logo_morph_v6.js, fire_canvas_v56.html, fire_3d_v40.png,
smoke_3d_v40.png, README_v6.txt.

Ссылка после публикации:
https://3xyzmedia.github.io/VIEWER/logo-test-v6/studio.html

v6:
* Ползунки поворота LOGO MORPH вокруг X, Y и Z, 0..360 с шагом 1 градус.
* Углы применяются к целевым координатам перед морфом, а не к исходной модели.
* Порядок вращений X -> Y -> Z; координаты относятся к локальным осям шейдера,
  не к селектору направления взгляда в правой панели.
* По умолчанию X=0, Y=0, Z=180 (старый исходный ракурс v5.5).
* SHARE переносит morphx, morphy, morphz, плюс прежнюю галочку morph.
* Кнопки LAB / MORPH остаются на месте при открытии окон.
* LABEL сохраняет раскрытие/свечение и запускает MORPH только когда разрешено.
* Крpano берём из /VIEWER/krpano.js; mp3/video — из существующих /VIEWER/music и /VIEWER/video.
* Не изменял исходные BURST, TOUR, FIRE, музыку, видео, основной krpano.js.

ВАЖНО: shader v6 ещё не проверен настоящим WebGL на смартфоне. Большой
desktop-шейдер на 2048 точек по-прежнему может быть тяжёлым для слабых GPU.
Не удаляй v5 до проверки v6.
