export type Language = "en" | "ru";
export const LANGUAGE_STORAGE_KEY = "ad-automator-studio:language";

const russian = {
  "by amount": "по количеству",
  "after time": "через время",
  "× highest reward": "× максимальной награды",
  "▶  Script start": "▶  Начало скрипта",
  "Connect all commands in a single chain below this block.":
    "Соедините все команды в одну цепочку под этим блоком.",
  "Wait  %1 %2 %3": "Ждать  %1 %2 %3",
  "Wait until the comparison is true. WAIT":
    "Ждать, пока сравнение станет истинным. WAIT",
  If: "Если",
  While: "Пока",
  Until: "До выполнения",
  "do %1": "выполнять %1",
  "Run nested commands once if the condition is true.":
    "Выполнить вложенные команды один раз, если условие истинно.",
  "Repeat nested commands while the condition is true.":
    "Повторять вложенные команды, пока условие истинно.",
  "Repeat nested commands until the condition becomes true.":
    "Повторять вложенные команды, пока условие не станет истинным.",
  "Auto prestige  %1 %2": "Автосброс  %1 %2",
  on: "включить",
  off: "выключить",
  "AUTO ON/OFF. Enable or disable auto prestige without changing its current threshold.":
    "AUTO ON/OFF. Включить или выключить автосброс, не меняя текущий порог.",
  "Auto prestige  %1  %2 %3 %4": "Автосброс  %1  %2 %3 %4",
  sec: "сек",
  ms: "мс",
  min: "мин",
  "AUTO: IP/EP/RM amount, time, or a multiplier of the highest reward. Time and multiplier modes require in-game unlocks for Infinity and Eternity.":
    "AUTO: количество IP/EP/RM, время или множитель максимальной награды. Время и множитель доступны для Infinity и Eternity после игровых разблокировок.",
  "Pause  %1 %2": "Пауза  %1 %2",
  "Pause for a real-time duration. PAUSE": "Пауза по реальному времени. PAUSE",
  "Prestige  %1": "Сброс  %1",
  "nowait %1  %2 %3": "не ждать %1  %2 %3",
  "Waits for prestige to become available by default. RESPEC resets studies for Eternity or glyphs for Reality; unavailable for Infinity.":
    "По умолчанию ждёт доступности сброса. RESPEC: исследования для Eternity, глифы для Reality; недоступен для Infinity.",
  "Buy studies  %1": "Купить исследования  %1",
  "nowait %1": "не ждать %1",
  "STUDIES PURCHASE. Comma-separated IDs; waits until all studies are bought unless NOWAIT is enabled.":
    "STUDIES PURCHASE. Номера через запятую; без NOWAIT ждёт покупки всех исследований.",
  "Load study preset  %1": "Загрузить пресет исследований  %1",
  "STUDIES LOAD ID. Uses a preset saved in the game.":
    "STUDIES LOAD ID. Использует пресет, сохранённый в игре, а не в конструкторе.",
  "Respec studies on Eternity": "Сбросить исследования при Eternity",
  "STUDIES RESPEC: marks studies for respec on the next Eternity.":
    "STUDIES RESPEC: отмечает исследования для сброса при следующей Eternity.",
  "Unlock  %1  nowait %2": "Открыть  %1  не ждать %2",
  "UNLOCK: purchase a challenge or Dilation unlock.":
    "UNLOCK: купить открытие испытания или Dilation.",
  "Start Eternity Challenge  %1": "Начать испытание Eternity  %1",
  "START EC. The challenge must already be unlocked.":
    "START EC. Испытание должно быть открыто.",
  "Start Dilation": "Начать Dilation",
  "Dilation run": "Запуск Dilation",
  "Black Hole  %1": "Чёрная дыра  %1",
  "BLACK HOLE ON/OFF. Requires the Black Hole to be unlocked in the game.":
    "BLACK HOLE ON/OFF. Требует открытия чёрной дыры в игре.",
  "Comment  %1": "Комментарий  %1",
  "My script": "Мой сценарий",
  "A note in the code; not executed.": "Пояснение в коде, не выполняется.",
  "Custom code  %1": "Свой код  %1",
  "One line of Automator code. Syntax is not checked.":
    "Одна строка кода Automator. Синтаксис не проверяется.",
  "Notification  %1": "Уведомление  %1",
  Done: "Готово",
  "NOTIFY: show an in-game notification.":
    "NOTIFY: показать уведомление в игре.",
  "■  Stop script": "■  Остановить скрипт",
  "STOP: stop Automator execution.": "STOP: остановить выполнение Automator.",
  "Wait, conditions & loops": "Ожидание, условия и циклы",
  Prestige: "Сбросы",
  Other: "Другое",
  "The project must contain exactly one “Script start” block.":
    "В проекте должен быть ровно один блок «Начало скрипта».",
  "This block is disconnected from the script start. Connect it to the main chain.":
    "Блок не подключён к началу скрипта. Соедините его с основной цепочкой.",
  "Add commands below the “Script start” block.":
    "Добавьте команды под блок «Начало скрипта».",
  "Enter a non-negative number, such as 100 or 1e1000.":
    "Укажите неотрицательное число, например 100 или 1e1000.",
  "Add at least one command inside the condition or loop.":
    "Добавьте хотя бы одну команду внутрь условия или цикла.",
  "Reality does not support time or multiplier auto prestige modes.":
    "Reality не поддерживает автосброс по времени или множителю.",
  "The auto prestige duration is too large.":
    "Длительность автосброса слишком велика.",
  "The pause duration is too large.": "Длительность паузы слишком велика.",
  "Infinity has no RESPEC. Disable study respec.":
    "У Infinity нет RESPEC. Отключите сброс исследований.",
  "Enter comma-separated study IDs, such as 11,21,31.":
    "Перечислите номера исследований через запятую, например 11,21,31.",
  "The list contains an invalid Time Study ID.":
    "В списке есть несуществующий номер Time Study.",
  "Notifications cannot contain double quotes or line breaks.":
    "В уведомлении нельзя использовать двойные кавычки или перенос строки.",
  "Enter a command in the “Custom code” block.":
    "Введите текст команды в блоке «Свой код».",
  "“Custom code” is unchecked. Validate it in the game’s Automator.":
    "«Свой код» не проверяется. Проверьте его в Automator игры.",
  "Unknown command.": "Неизвестная команда.",
  "New script": "Новый скрипт",
  "● Saved in this browser": "● Сохранено в этом браузере",
  "Autosave unavailable — download JSON":
    "Автосохранение недоступно — скачайте JSON",
  "Saving…": "Сохраняем…",
  "Connect the first command to “Script start” to see the code here.":
    "Соедини первую команду с блоком «Начало скрипта» — здесь появится код.",
  "✓ Structure looks good": "✓ Структура в порядке",
  "Fix the block errors first": "Сначала исправьте ошибки блоков",
  "Project sent to your browser’s downloads":
    "Проект отправлен в загрузки браузера",
  "Code copied. Paste it into the Automator text editor.":
    "Код скопирован. Вставьте его в текстовый редактор Automator.",
  "Code copied": "Код скопирован",
  "Your browser blocked copying. Download .txt or select the code on the right.":
    "Браузер запретил копирование. Скачайте .txt или выделите код справа.",
  "Fix the errors listed below the code.":
    "Исправьте ошибки, перечисленные под кодом.",
  "Block validation complete. In-game conditions are checked by Automator.":
    "Проверка блоков завершена. Игровые условия проверяются в Automator.",
  "Replace the current project? To keep a separate copy, click “Save project” first.":
    "Заменить текущий проект? Если нужна отдельная копия, сначала нажмите «Сохранить проект».",
  "The file is too large: the limit is 2 MB.":
    "Файл слишком большой: максимум 2 МБ.",
  "Project opened": "Проект открыт",
  "invalid JSON": "неверный JSON",
  "Project changed in another tab — save JSON and reload":
    "Проект изменён в другой вкладке — сохраните JSON и обновите страницу",
  "Autosave paused to avoid overwriting changes from another tab.":
    "Автосохранение приостановлено, чтобы не затереть изменения другой вкладки.",
  "Autosave is unavailable or damaged. Download JSON backups.":
    "Автосохранение недоступно или повреждено. Скачивайте JSON.",
  "Existing data was preserved. Create a new project or open JSON to resume autosave.":
    "Старые данные не перезаписаны. Новый проект или открытие JSON возобновит автосохранение.",
  "This is not an Automator Studio version 1 project. Open a project JSON file rather than script text.":
    "Это не проект Automator Studio версии 1. Откройте JSON проекта, а не текст скрипта.",
  "Invalid project name.": "Некорректное название проекта.",
  "The file contains no workspace.": "В файле нет рабочей области.",
  "The project has too many blocks or too much nesting.":
    "В проекте слишком много блоков или слишком глубокая вложенность.",
  "The project contains an unknown block type.":
    "Проект содержит неизвестный тип блока.",
  "The project contains duplicate block IDs.":
    "В проекте повторяются идентификаторы блоков.",
  "Invalid block parameters.": "Некорректные параметры блока.",
  "The block chain is damaged.": "Повреждена цепочка блоков.",
  "Invalid block nesting.": "Некорректная вложенность блоков.",
  "Invalid condition or loop body.": "Некорректное тело условия или цикла.",
  "The project needs one root “Script start” block.":
    "В проекте нужен один корневой блок «Начало скрипта».",
  "First Eternity": "Первый Eternity",
  "Example: wait for the reward and perform Eternity":
    "Пример: дождаться награды и выполнить Eternity",
  "Eternity complete": "Eternity завершена",
  "Eternity loop": "Цикл Eternity",
  "Repeat Eternity to accumulate EP; adjust thresholds to your save":
    "Повторять Eternity до накопления EP; пороги настройте под своё сохранение",
  "Target reached": "Цель достигнута",
  "Preset 1 must contain the studies required for Dilation":
    "Пресет 1 должен содержать необходимые исследования для Dilation",
  "Invalid value: {key}.": "Недопустимое значение: {key}.",
  "Invalid value for field {name}.": "Недопустимое значение поля {name}.",
  "{count} blocks": "{count} блоков",
  "{count} lines": "{count} строк",
  "● Errors: {count}": "● Ошибок: {count}",
  "◐ Warnings: {count}": "◐ Замечаний: {count}",
  "Could not open: {message}": "Не удалось открыть: {message}",
  "Visual Automator script builder for Antimatter Dimensions. Blocks, validation, and projects saved on your device.":
    "Визуальный конструктор скриптов Automator для Antimatter Dimensions. Блоки, проверка и сохранение проектов на устройстве.",
  "VISUAL SCRIPT EDITOR": "ВИЗУАЛЬНЫЙ РЕДАКТОР СКРИПТОВ",
  Project: "Проект",
  "Project name": "Название проекта",
  "Stored in this browser": "Хранится в этом браузере",
  "＋ New": "＋ Новый",
  "↓ Save project": "↓ Сохранить проект",
  Editor: "Конструктор",
  "0 blocks": "0 блоков",
  "Undo (Ctrl+Z)": "Отменить (Ctrl+Z)",
  Undo: "Отменить",
  "Redo (Ctrl+Shift+Z)": "Повторить (Ctrl+Shift+Z)",
  Redo: "Повторить",
  Examples: "Примеры",
  "Block workspace": "Рабочая область блоков",
  "Generated code": "Сгенерированный код",
  "Automator code": "Код Automator",
  "0 lines": "0 строк",
  "Script text": "Текст скрипта",
  "Copy code": "Копировать код",
  "Download script.txt": "Скачать script.txt",
  "Download script text": "Скачать текст скрипта",
  Validation: "Проверка",
  "Validate ↻": "Проверить ↻",
  "Checks block structure and parameters. Command and study availability depends on your in-game save.":
    "Проверяем структуру и параметры блоков. Доступность команд и исследований зависит от сохранения в игре.",
  "Open Antimatter Dimensions ↗": "Открыть Antimatter Dimensions ↗",
  "QUICK START": "БЫСТРЫЙ СТАРТ",
  "Start with an example": "Начни с примера",
  Close: "Закрыть",
  "Learning examples. Adjust thresholds to your save. Replacing the current project requires confirmation.":
    "Учебные сценарии. Подстрой пороги под своё сохранение. Текущий проект можно будет заменить после подтверждения.",
  "Auto prestige → wait → Eternity": "Автосброс → ожидание → Eternity",
  "Repeat commands until the target is reached":
    "Повторение команд до достижения цели",
  "Study preset → Dilation → reward":
    "Пресет исследований → Dilation → награда",
  Language: "Язык",
  "Imported script": "Импортированный скрипт",
  "Code converted to blocks. Review the warnings below the code.":
    "Код преобразован в блоки. Проверьте замечания под кодом.",
  "Could not read the script": "Не удалось прочитать скрипт",
  "The maximum size is 2 MB.": "Максимальный размер — 2 МБ.",
  "The limit is 499 commands plus the start block.":
    "Максимум 499 команд плюс блок начала.",
  "A parameter exceeds 10000 characters.": "Параметр длиннее 10000 символов.",
  "Expected an opening brace { on its own line.":
    "Ожидалась открывающая скобка { на отдельной строке.",
  "Unexpected closing brace }.": "Лишняя закрывающая скобка }.",
  "This condition requires the format “resource operator number”.":
    "Для этого условия нужен формат «ресурс оператор число».",
  "The limit is 80 nesting levels.": "Максимум 80 уровней вложенности.",
  "The resource does not match the auto prestige layer.":
    "Ресурс не соответствует слою автосброса.",
  "Unsupported structure. Place braces and commands on separate lines.":
    "Неподдерживаемая структура. Разместите скобки и команды на отдельных строках.",
  "Missing opening brace {.": "Не найдена открывающая скобка {.",
  "Missing closing brace }.": "Не найдена закрывающая скобка }.",
  "Line {line}: {message}": "Строка {line}: {message}",
  "Paste code": "Вставить код",
  "Open TXT / JSON": "Открыть TXT / JSON",
  "Code → blocks": "Код → блоки",
  "Paste Automator text. Supported commands become blocks; unknown lines become “Custom code” blocks with a warning. Block positions will be rebuilt.":
    "Вставь текст Automator. Поддерживаемые команды станут блоками, неизвестные строки — блоками «Свой код» с предупреждением. Расположение блоков будет построено заново.",
  "Convert to blocks": "Преобразовать в блоки",
} as const;
export type Message = keyof typeof russian;

export function readLanguage(
  storage: Pick<Storage, "getItem"> | undefined,
): Language {
  try {
    return storage?.getItem(LANGUAGE_STORAGE_KEY) === "ru" ? "ru" : "en";
  } catch {
    return "en";
  }
}

// English is the default regardless of the browser's preferred language.
let language: Language = (() => {
  try {
    return readLanguage(globalThis.localStorage);
  } catch {
    return "en";
  }
})();
export const getLanguage = () => language;
export function setLanguage(value: Language) {
  language = value;
}
export function t(
  message: Message,
  values: Record<string, string | number> = {},
): string {
  const text = language === "ru" ? russian[message] : message;
  return text.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  );
}

export function translatePage() {
  document.documentElement.lang = language;
  for (const attribute of ["text", "aria-label", "title", "content"]) {
    const dataAttribute =
      attribute === "text" ? "data-i18n" : `data-i18n-${attribute}`;
    document
      .querySelectorAll<HTMLElement>(`[${dataAttribute}]`)
      .forEach((node) => {
        const message = node.getAttribute(dataAttribute) as Message;
        if (attribute === "text") node.textContent = t(message);
        else node.setAttribute(attribute, t(message));
      });
  }
}
