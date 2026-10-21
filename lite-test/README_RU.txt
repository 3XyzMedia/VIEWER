3XyzMedia LITE + STUDIO v1 — инструкция

ПОДГОТОВКА
1) Не перезаписывай действующий index.html до теста. Лучше загрузи содержимое этой папки в НОВУЮ папку /VIEWER/lite-test/ в GitHub.
2) Скопируй свой крpano.js из корня VIEWER в папку lite-test/ (файл не прилагается).
3) Загрузить: index.html, studio.html, scene_lite_bell.xml, scene_lite_soy.xml, scene_fx_lab_v56.xml, fire_canvas_v56.html, presets/bell.json, presets/soy.json.
4) Тестовые ссылки (после загрузки):
   https://3xyzmedia.github.io/VIEWER/lite-test/?id=soy
   https://3xyzmedia.github.io/VIEWER/lite-test/?id=bell
   https://3xyzmedia.github.io/VIEWER/lite-test/studio.html
5) Колокол ссылается на https://github.com/3XyzMedia/VIEWER/releases/download/v1.0/zvon.ply — существование/CORS не подтверждены в этой сессии. Если модель не загрузится, это результат теста, а не доказательство работоспособности.

ПУБЛИКАЦИЯ ССЫЛКИ
- В studio.html нажми «Скачать пресет JSON», указав уникальный ID; полученный ID.json загрузи в папку presets рядом с LITE.
- Короткая ссылка ?id=ID заработает после публикации JSON.
- Кнопка «Ссылка LITE с параметрами» выдаёт длинную ссылку без публикации файла (удобно для быстрого теста).
- Обычная STUDIO-ссылка v56 остаётся отдельной и не подменяется.

ВАЖНО
Этот LITE — первоначальное ядро без эффектов/TOUR/VIDEO и без дублирования тяжёлого студийного JS.
Состояния сложных эффектов/TOUR в JSON пока сохраняются, но LITE их НЕ воспроизводит; это этап 2 модульной системы.
Повороты/жесты используют штатное управление krpano, не полный пользовательский код старого Viewer.
Нужен тест на смартфоне, включая жесты одним и двумя пальцами.
Не удалять старый рабочий Viewer.
