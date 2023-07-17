let tasks = []; // основной массив
let filteredTasks = []; // "внешний" массив
const mainDiv = document.getElementById('main');
const div = document.getElementById('output');
let sort = "date";
let showTooltipTimeout;
let startSearchTaskTimeout;
filterTasks();

/**
 * Функция, вызывающая функции сортировки в зависимости от основного параметра сортировки
 * @param sortParameter - основной параметр сортировки
 * @param needToConstruct - нужен для отделения сортировки по нажатию кнопки от сортировки в filterTasks
 * Если параметр не задан, то вывод будет построен
 */
function launchSort(sortParameter, needToConstruct = true) {
    const sortComboBoxDate = document.getElementById('sort-date');
    const sortComboBoxDateValue = sortComboBoxDate.value;
    const sortComboBoxPriority = document.getElementById('sort-priority');
    const sortComboBoxPriorityValue = sortComboBoxPriority.value;

    sort = (sortParameter === "date") ? "date" : "priority";
    if (sort === "date") {
        const sortMode = sortComboBoxDateValue === 'fromNew' ? -1 : 1;
        sortTasks('time', sortMode);
    } else {
        if (sortComboBoxPriorityValue === 'none') {
            sort = "date";
            launchSort(sort);
        } else {
            const extraSortMode = (sortComboBoxDateValue === 'fromNew') ?  1 : -1;
            (sortComboBoxPriorityValue === 'fromHigh') ? sortTasks('Приоритет', -1, 'time', extraSortMode) : sortTasks('Приоритет', 1, 'time', extraSortMode); //todo: здесь тоже
        }
    }
    if (needToConstruct) {
        outputConstructor();
    }
}

/**
 * Добавление задачи с проверкой на уже существующую задачу
 */
function addTask() {
    const taskName = document.getElementById("input-task-name");
    const comboBoxPriority = document.getElementById("priority-add-task"); //todo: priorityComboBox
    const comboBoxPriorityValue = comboBoxPriority.value;
    if (!taskName.value.trim()) { //todo: переменная
        alert('Введите название задачи');
    } else if (!tasks.length || !searchDuplicate(taskName.value, comboBoxPriorityValue)) {
        const newTask = {}; // todo: создание объекта с нужными ключами сразу
        const status = 2; //todo: константа сверху
        const dateTime = new Date();
        const outputDateTime = dateTime.toLocaleString('ru-RU');
        newTask['Приоритет'] = comboBoxPriorityValue; //todo: english
        newTask['Название задачи'] = taskName.value;
        newTask['Время для вывода'] = outputDateTime;
        newTask['Статус'] = status;
        newTask['time'] = dateTime;
        request('POST', newTask, null)
            .then(() => {
                filterTasks();
            });
    }
    clearInput();
}

/**
 * Функция проверки на существование задачи
 * @param taskName - название задачи
 * @param priorityName - приоритет задачи
 * @returns {boolean} возвращает true, если дубликат был найден
 */
function searchDuplicate(taskName, priorityName) {
    const duplicateExist = tasks.some((task, j) => {
        return task['Название задачи'].trim() === taskName.trim() && task['Приоритет'] === priorityName;
    });
    if (duplicateExist) {
        alert('Такая задача уже существует');
    }
    return duplicateExist;
}

/**
 * Фильтр подходящих задач
 */
function filterTasks() {
    const textSearch = document.getElementById('search-task-name');
    const filterPriority = document.getElementById("filter-priority");
    const filterPriorityValue = filterPriority.value;
    const checkActive = document.getElementById('checkbox-rejected');
    const checkRejected = document.getElementById('checkbox-active');
    const checkDone = document.getElementById('checkbox-done');
    const checkBoxElements = [checkActive, checkRejected, checkDone];
    request('GET', null, null)
        .then(() => {
            const selectedStatusIds = checkBoxElements
                .filter(checkBox => checkBox.checked)
                .map(checkBox => Number(checkBox.dataset.attr));
            filteredTasks = tasks.filter((task) => {
                return selectedStatusIds.includes(task['Статус']) &&
                    (!textSearch.value.trim() || task['Название задачи'].toLowerCase().indexOf(textSearch.value.toLowerCase()) > -1) &&
                    (filterPriorityValue === 'all' || filterPriorityValue === task['Приоритет']); //todo: all -> -1
            });
            launchSort(sort, false);
            changeElementDisplayStyle('loading', 'none');
            changePageOpacity(1);
            outputConstructor();
        });
}

/**
 * Функция сортировки
 * @param sortParameter - Основной параметр сортировки
 * @param sortMode - Вид сортировки
 * @param extraSortParameter - Дополнительный параметр сортировки
 * @param extraSortMode
 */
function sortTasks(sortParameter, sortMode, extraSortParameter, extraSortMode) {
    filteredTasks = filteredTasks.sort((a, b) => {
        if (a[sortParameter] === b[sortParameter]) {
            if (a[extraSortParameter] > b[extraSortParameter]) {
                return -1 * extraSortMode;
            }
            if (a[extraSortParameter] < b[extraSortParameter]) {
                return extraSortMode;
            }
        } else if (a[sortParameter] < b[sortParameter]) {
            return -1 * sortMode;
        } else {
            return sortMode;
        }
    });
}

/**
 * Удаление задачи
 * @param index - номер задачи в filteredTasks
 */
function deleteItem(index) {
    if (confirm('Вы уверены?')) {
        const foundTask = tasks.find(task => task.id === filteredTasks[index].id);
        if (foundTask) {
            request('DELETE', null, foundTask.id)
                .then(() => {
                    filterTasks();
                });
        }
    }
}

/**
 * Вывод текста, который уведомляет, что tasks или filteredTasks пусты
 * @param text
 */
function showText(text) {
    div.innerHTML = `<div class="title">
                         <h2 class="title__item">
                             ${text}
                         </h2>
                     </div>`;
}

/**
 * Конструтор вывода
 */
function outputConstructor() {
    div.innerHTML = '';
    mainDiv.append(div);
    if (!tasks.length) {
        showText('Лист задач пуст');
        return;
    }
    if (!filteredTasks.length) {
        showText('Совпадений не найдено');
        return;
    }
    for (let i = 0; i < filteredTasks.length; i++) {
        const task = filteredTasks[i];
        const prior = switchCase(task,'Приоритет');
        const color = switchCase(task,'Статус');
        const taskName = task['Название задачи'].trim();
        let textColor;
        if (color === "#FFFFFF") {
            textColor = '#f2db0c';
        } else {
            textColor = color;
        }
        div.innerHTML += `
        <div id = 'output_div_${i}' 
             class="item output-area__item">
            <div class="item__task-priority-block"> 
                <span id="outputSpanId${i}" 
                      style="color: ${textColor}"
                      class="item__task-priority">
                      ${prior}
                </span>
            </div>
            <div class="main item__main" 
                 style="background-color: ${color};">
                <div class="main__task-info-block">
                    <div id="div_to_change${i}" 
                         onclick="display_input(${i})"  
                         class="item__task-name-div">
                         ${taskName}
                    </div>
                    <textarea id="textNode${i}" 
                             oninput="auto_grow(this)"
                             onchange="saveChangedTask(${i})" 
                             onblur="display_div(${i})"
                             rows="7"
                             maxlength="100"
                             style="background-color: ${color};"
                             class="item__task-name-textarea">
                    </textarea>
                    <div class="task__date-of-add" 
                        <span>${task['Время для вывода']}</span>
                    </div>
                </div>
                <div class="main__status-buttons">
                    <button type="button" 
                            id="tick${i}"
                            onclick='changeTaskStatus(${i}, 1)'
                            onmouseenter="showTooltip(event)"
                            onmouseleave="hideTooltip(event)"
                            data-tooltip="Отметить задачу выполненной"
                            class="status-button">
                    <img src='tickIcon.png' 
                         alt="">
                    </button>
                    <button type="button" 
                            id="cross${i}"
                            onclick='changeTaskStatus(${i}, -1)'
                            onmouseenter="showTooltip(event)"
                            onmouseleave="hideTooltip(event)"
                            data-tooltip="Отметить задачу отмененной"
                            class="status-button">
                    <img src='crossIcon.png' 
                         alt="">
                    </button>
                </div>
            </div>
            <div class="item__delete-button-block">
                <button onclick="deleteItem(${i})"
                        onmouseenter="showTooltip(event)"
                        onmouseleave="hideTooltip(event)"
                        data-tooltip="Удалить задачу"
                        class="item__delete-button">
                    <img src="deleteIcon.png" 
                         alt="">
                </button>
            </div>
        </div>    
    `;
        switchCase(task, 'Статус', i);
    }
}

/**
 * Смена отображения элемента
 * @param elementId - элемент
 * @param targetStatus - нужный статус
 */
function changeElementDisplayStyle(elementId, targetStatus) {
    document.getElementById(`${elementId}`).style.display = targetStatus;
}

/**
 * Чистка полей ввода названия задачи и комбобокса приоритета задачи
 */
function clearInput() {
    const inputTaskName = document.getElementById('input-task-name');
    inputTaskName.value = "";
    const priorityCombobox = document.getElementById('priority-add-task');
    priorityCombobox.value = '2'; //todo: const
}

/**
 * Сохраняет правки в названии задачи и проверяет, есть ли другая задача с новым названием и тем же приоритето
 * Передаёт изменённую задачу и её индекс
 * @param i - индекс в filteredTasks объекта для изменения
 */
function saveChangedTask(i) {
    const newValue = document.getElementById(`textNode${i}`).value;
    let priority = document.getElementById(`outputSpanId${i}`).innerText;
    priority = switchCase(0, 0, priority);
    if (!searchDuplicate(newValue, priority) && newValue.trim()) {
        const foundTask = tasks.find(task => task.id === filteredTasks[i].id);
        if (foundTask) {
            foundTask['Название задачи'] = newValue;
            request('PUT', foundTask, foundTask.id);
        }
        filterTasks();
    } else {
        document.getElementById(`textNode${i}`).value = filteredTasks[i]['Название задачи'];
    }
    if (!newValue.trim()) {
        alert('Вы не можете оставить название поле пустым')
    }
}

/**
 * Изменяет статус задачи
 * @param index - номер задачи в filteredTasks
 * @param difference
 */
function changeTaskStatus(index, difference) {
    const changedTask = filteredTasks[index];
    changedTask['Статус'] += +difference;
    for (let j = 0; j < tasks.length; j++) {
        if (tasks[j].id === changedTask.id) {
            request('PUT', changedTask, changedTask.id)
                .then(() => {
                    filterTasks();
                });
        }
    }
}

/**
 * Показывает <input> изменения названия, скрывая <div> с названием задачи
 * Сохраняет высоту <div> и назначает её же textarea
 * @param index
 */
function display_input(index) { //todo: camelCase
    const elem = document.getElementById(`div_to_change${index}`);
    const height = getComputedStyle(elem).height;
    document.getElementById(`textNode${index}`).style.height = (Number(height.slice(0, -2)) - 6).toString() + "px";
    document.getElementById(`textNode${index}`).textContent = filteredTasks[index]['Название задачи'];
    changeElementDisplayStyle(`div_to_change${index}`, 'none');
    changeElementDisplayStyle(`textNode${index}`, 'block');
    document.getElementById(`textNode${index}`).focus();
}

/**
 * Показывает <div> с названием задачи, скрывая <input> изменения названия
 * @param index
 */
function display_div(index) {
    changeElementDisplayStyle(`div_to_change${index}`, 'block');
    changeElementDisplayStyle(`textNode${index}`, 'none');
}

/**
 * блок задачи - конкретная задача в блоке вывода задач
 * Функция,которая:
 * при передаче в object объекта, в value остаётся пустым: возвращает нужную строку приоритета для вывода или возвращает цвет блока
 * при передаче в object объекта, в value передаётся индекс: прячет или показывает кнопки изменения статуса блока задачи и изменяет надпись подсказки
 * при передаче в object нуля: возвращает возможное значение для объекта с ключом "Статус" по строке приоритета в блоке задачи
 * @param object
 * @param key
 * @param value может быть как индексом в filteredTasks, так и значением приоритета в блоке вывода задачи
 * @returns {string}
 */
function switchCase(object, key, value = -1 ) {
    if (typeof object === 'object') {
        if (value === -1) {
            switch (object[key]) {
                case '1':
                    return "низкий";
                case '2':
                    return "средний";
                case '3':
                    return "высокий";
                case 1:
                    return '#ff6161';
                case 2:
                    return '#FFFFFF';
                case 3:
                    return '#80ff80';
            }
        } else {
            let tickTargetStatus = '';
            let crossTargetStatus = '';
            let tickTooltip = '';
            let crossTooltip = '';
            switch (object[key]) {
                case 1:
                    tickTargetStatus = 'block';
                    crossTargetStatus = 'none';
                    tickTooltip = 'Отметить задачу активной';
                    break;
                case 2:
                    changeElementDisplayStyle(`tick${value}`, 'block');
                    changeElementDisplayStyle(`cross${value}`, 'block');
                    document.getElementById(`tick${value}`).dataset.tooltip = "Отметить задачу завершенной";
                    document.getElementById(`cross${value}`).dataset.tooltip = "Отметить задачу отмененной";
                    break;
                case 3:
                    changeElementDisplayStyle(`tick${value}`, 'none');
                    changeElementDisplayStyle(`cross${value}`, 'block');
                    document.getElementById(`cross${value}`).dataset.tooltip = "Отметить задачу активной";
                    break;
            }
            changeElementDisplayStyle(`tick${value}`, tickTargetStatus);
            changeElementDisplayStyle(`cross${value}`, crossTargetStatus);
            document.getElementById(`tick${value}`).dataset.tooltip = tickTooltip;
            document.getElementById(`cross${value}`).dataset.tooltip = crossTooltip;
        }
    } else if (object === 'toNum'){
        switch (value) {
            case "низкий":
                return '1';
            case "средний":
                return '2';
            case "высокий":
                return '3';
        }
    }
}

/**
 *Функция, посылающая запросы
 * @param method - метод запроса
 * @param body - тело запроса
 * @param id - уникальный номер элемента на бэке
 * @returns {Promise<void>}
 */
async function request(method, body, id) {
    const host = "http://127.0.0.1:3000/items";
    const headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };
    body = JSON.stringify(body);
    changeElementDisplayStyle('loading', 'flex');
    changePageOpacity(0.4);
    if (method === 'GET') {
        const response = await fetch(host, {
            method
        });
        tasks = await response.json();
    } else if (method === 'POST') {
        fetch(host, {
            method,
            headers,
            body
        }).then();
    } else if (method === 'DELETE') {
        fetch(`${host}/${id}`, {
            method,
        }).then();
    } else if (method === 'PUT') {
        fetch(`${host}/${id}`, {
            method,
            headers,
            body
        }).then();
    }
}

/**
 * Функция, которая меняет прозрачность страницы
 * @param targetOpacity - нужная прозрачность содержимого страницы
 */
function changePageOpacity(targetOpacity) {
    const elements = document.querySelectorAll('.center-of-page');
    for (let i = 0; i < elements.length; i++) {
        elements[i].style.opacity = `${targetOpacity}`;
    }
}

/**
 * Функция автоматического роста textarea при вводе enter
 * @param element - textarea, в которой меняется высота
 */
function auto_grow(element) {
    element.style.height = '5px';
    if (element.scrollHeight <= 150) {
        element.style.height = (element.scrollHeight) + "px";
    } else {
        element.style.height = '150px';
    }
}

/**
 * Функция, запускающая поиск задач спустя секунду после начала ввода названия
 */
function startSearch() {
    clearTimeout(startSearchTaskTimeout);
    startSearchTaskTimeout = setTimeout(() => {
        document.getElementById('search-task-name').blur();
        filterTasks()
    },1000); //todo: length > 2
}

/**
 * Функция, запускающая стандартную фильтрацию
 */
function defaultSort() {
    document.getElementById('sort-priority').value = "none";
    document.getElementById('sort-date').value = "fromNew";
    document.getElementById('search-task-name').value = "";
    document.getElementById("filter-priority").value = "all";
    document.getElementById('checkbox-rejected').checked = true;
    document.getElementById('checkbox-active').checked = true;
    document.getElementById('checkbox-done').checked = true;
    filterTasks();
}

/**
 * Функция, которая отрисовывает подсказку спустя секунду после наведения на элемент курсора
 * @param event - onmouseenter
 */
function showTooltip(event) {
     showTooltipTimeout = setTimeout( () => {
        const target = event.target;
        const div = document.createElement('div');
        div.className = "tooltip";
        document.body.append(div);
        if (target.dataset.tooltip) {
            const coords = target.getBoundingClientRect();
            div.innerHTML = target.dataset.tooltip;
            div.style.top = coords.top - div.offsetHeight - 5 + 'px';
            div.style.left = coords.left + (coords.width - div.offsetWidth) / 2 + 'px';
        }
    }, 1000);
}

/**
 * Функция, которая убирает подсказку
 * @param event - onmouseleave
 */
function hideTooltip(event) {
    clearTimeout(showTooltipTimeout)
    for (let item of document.querySelectorAll('.tooltip')) {
        item.remove();
    }
}

function getPriorityNameById(priorityId) {
    const priorityDictionary = {
      1: 'низкий',
      2: 'средний',
      3: 'высокий'
    };
    return priorityDictionary[priorityId];
}
