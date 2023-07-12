let tasks = []; // основной массив
let filteredTasks = []; // "внешний" массив
const mainDiv = document.getElementById('main');
const div = document.getElementById('output');
let sort = "date";
let showTooltipTimeout;
let startSearchTaskTimeout;
outputConstructor();

/**
 * Функция, вызывающая функции сортировки в зависимости от основного параметра сортировки
 * @param sortParameter - основной параметр сортировки
 * @param needToConstruct - нужен для отделения сортировки по нажатию кнопки от сортировки в filterTasks
 * Если параметр не задан, то вывод будет построен
 */
function launchSort(sortParameter, needToConstruct = true) {
    const sortComboBoxDate = document.getElementById('sort-date');
    const sortComboBoxDateValue = sortComboBoxDate.options[sortComboBoxDate.selectedIndex].value;
    const sortComboBoxPriority = document.getElementById('sort-priority');
    const sortComboBoxPriorityValue = sortComboBoxPriority.options[sortComboBoxPriority.selectedIndex].value;

    sort = (sortParameter === "date") ? "date" : "priority";
    if (sort === "date") {
        (sortComboBoxDateValue === 'fromNew') ? sortTasks('time', -1) : sortTasks('time', 1);
    } else {
        if (sortComboBoxPriorityValue === 'none') {
            sort = "date";
            launchSort(sort);
        } else {
            const extraSortMode = (sortComboBoxDateValue === 'fromNew') ?  1 : -1;
            (sortComboBoxPriorityValue === 'fromHigh') ? sortTasks('Приоритет', -1, 'time', extraSortMode) : sortTasks('Приоритет', 1, 'time', extraSortMode);
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
    const comboBoxPriority = document.getElementById("priority-add-task");
    const comboBoxPriorityValue = comboBoxPriority.options[comboBoxPriority.selectedIndex].value;
    if (!taskName.value.trim()) {
        alert('Введите название задачи');
    } else if (!tasks.length || !searchDuplicate(taskName.value, comboBoxPriorityValue, -1)) {
        const innerObject = {};
        const status = 2;
        const time = new Date();
        const outputTime = time.toLocaleString('ru-RU');
        innerObject['Приоритет'] = comboBoxPriorityValue;
        innerObject['Название задачи'] = taskName.value;
        innerObject['Время для вывода'] = outputTime;
        innerObject['Статус'] = status;
        innerObject['time'] = time;
        request('POST', innerObject, 0)
            .then(() => {
                filterTasks();
            });
    }
    clearInput();
}

/**
 * Функция проверки на существование задачи
 * @param taskName - название задачи
 * @param priority - приоритет задачи
 * @param index - индекс задачи на изменение в filteredTasks
 * @returns {boolean} возвращает true, если дубликат был найден
 */
function searchDuplicate(taskName, priority, index) {
    for (let j = 0; j < tasks.length; j++) {
        if (tasks[j]['Название задачи'].trim() === taskName.trim() && tasks[j]['Приоритет'] === priority && index !== j) {
            alert('Такая задача уже существует');
            return true;
        }
    }
    return false;
}

/**
 * Фильтр подходящих задач
 */
function filterTasks() {
    const textSearch = document.getElementById('search-task-name');
    const filterPriority = document.getElementById("filter-priority");
    const filterPriorityValue = filterPriority.options[filterPriority.selectedIndex].value;
    const checkActive = document.getElementById('checkbox-rejected');
    const checkRejected = document.getElementById('checkbox-active');
    const checkDone = document.getElementById('checkbox-done');
    request('GET', "0", 0)
        .then(() => {
            const a = [];
            if (checkRejected.checked) {
                a.push(1);
            }
            if (checkActive.checked) {
                a.push(2);
            }
            if (checkDone.checked) {
                a.push(3);
            }
            filteredTasks = tasks.filter((task) => {
                return a.includes(task['Статус']) &&
                    (!textSearch.value.trim || task['Название задачи'].toLowerCase().indexOf(textSearch.value.toLowerCase()) > -1) &&
                    (filterPriorityValue === 'all' || filterPriorityValue === task['Приоритет']);
            });
            launchSort(sort, false);
            changeDisplay('loading', 'none');
            changeOpacity(1);
            outputConstructor();
            document.getElementById('search-task-name').disabled = false;
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
        for (let j = 0; j < tasks.length; j++) {
            if (tasks[j].id === filteredTasks[index].id) {
                request('DELETE', 0, tasks[j].id)
                    .then(() => {
                        filterTasks();
                    }); // Спроси про отступ после обработки промиса
            }
        }
    }
}

/**
 * Вывод текста, который уведомляет, что tasks или filteredTasks пусты
 * @param text
 */
function showText(text) {
    div.innerHTML = `<h2 class="output-info">${text}</h2>`;
}

/**
 * Конструтор вывода
 */
function outputConstructor() {
    div.innerHTML = '';
    mainDiv.append(div);
    if (tasks.length === 0) {
        showText('Лист задач пуст');
        return;
    }
    if (filteredTasks.length === 0) {
        showText('Совпадений не найдено');
        return;
    }
    for (let i = 0; i < filteredTasks.length; i++) {
        const task = filteredTasks[i];
        const prior = switchCase (task,'Приоритет');
        const color = switchCase (task,'Статус');
        let textColor;
        if (color === "#FFFFFF") {
            textColor = '#f2db0c';
        } else {
            textColor = color;
        }
        div.innerHTML += `
        <div id = 'output_div_${i}' 
             class="item-of-output">
            <div class="left-side-of-item"> 
                <span id="outputSpanId${i}" 
                      style="color: ${textColor}">
                      ${prior}
                </span>
            </div>
            <div class="center-of-item" 
                 style="background-color: ${color}; ">
                <div class="left-side-of-item-mid" 
                     style="background-color: ${color}">
                    <div id="div_to_change${i}" 
                         onclick="display_input(${i})"
                         style="background-color: ${color}; 
                                font-size: 18px"
                         class="task-name-of-item">
                    </div>
                    <textarea
                            id="textNode${i}" 
                            oninput="auto_grow(this)"
                            onchange="saveChangedTask(${i})" 
                            onblur="display_div(${i})"
                            rows="7"
                            maxlength="100"
                            style="background-color: ${color}"
                            class="task-name-textarea">
                    </textarea>
                    <div class="date-watermark-of-item" 
                         style="background-color: ${color}">
                        <span>
                        ${task['Время для вывода']}
                        </span>
                    </div>
                </div>
                <div class="div-with-status-buttons">
                    <button type="button" 
                            id="tick${i}"
                            onclick='taskDiff(${i}, 1)'
                            onmouseenter="showTooltip(event)"
                            onmouseleave="hideTooltip(event)"
                            data-tooltip="Отметить задачу выполненной"
                            class="status-button for-tooltip">
                    <img src='tickIcon.png' 
                         alt="">
                    </button>
                    <button type="button" 
                            id="cross${i}"
                            onclick='taskDiff(${i}, -1)'
                            onmouseenter="showTooltip(event)"
                            onmouseleave="hideTooltip(event)"
                            data-tooltip="Отметить задачу отмененной"
                            class="status-button for-tooltip">
                    <img src='crossIcon.png' 
                         alt="">
                    </button>
                </div>
            </div>
            <div class="right-side-of-item">
                <button onclick="deleteItem(${i})"
                        onmouseenter="showTooltip(event)"
                        onmouseleave="hideTooltip(event)"
                        data-tooltip="Удалить задачу"
                        class="for-tooltip">
                    <img src="deleteIcon.png" 
                         alt="">
                </button>
            </div>
        </div>    
    `;
        const taskName = task['Название задачи'].trim();
        document.getElementById(`textNode${i}`).textContent = taskName;
        document.getElementById(`div_to_change${i}`).innerText = taskName;
        switchCase(task, 'Статус', i);
    }
}

/**
 * Смена отображения элемента
 * @param element - элемент
 * @param targetStatus - нужный статус
 */
function changeDisplay(element, targetStatus) {
    const elem = document.getElementById(`${element}`);
    elem.style.display = targetStatus;
}

/**
 * Чистка полей ввода названия задачи и комбобокса приоритета задачи
 */
function clearInput() {
    const inputTaskName = document.getElementById('input-task-name');
    inputTaskName.value = "";
    const priorityCombobox = document.getElementById('priority-add-task');
    priorityCombobox.value = '2';
}

/**
 * Сохраненяет правок в названии задачи и проверяет, есть ли другая задача с новым названием и тем же приоритето
 * Передаёт изменённую задачу и её индекс
 * @param i - индекс в filteredTasks объекта для изменения
 */
function saveChangedTask(i) {
    const newValue = document.getElementById(`textNode${i}`).value;
    let priority = document.getElementById(`outputSpanId${i}`).innerText;
    priority = switchCase(0, 0, priority);
    if (!searchDuplicate(newValue, priority, i) && newValue.trim()) {
        const changedTask = filteredTasks[i];
        for (let j = 0; j < tasks.length; j++) {
            if (tasks[j].id === changedTask.id) {
                changedTask['Название задачи'] = newValue;
                request('PUT', changedTask, tasks[j].id)
                    .then();
            }
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
function taskDiff(index,difference) {
    const changedTask = filteredTasks[index];
    changedTask['Статус'] += +(difference);
    for (let j = 0; j < tasks.length; j++) {
        if (tasks[j].id === changedTask.id) {
            request('PUT',changedTask, changedTask.id)
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
function display_input(index) {
    const elem = document.getElementById(`div_to_change${index}`);
    const height = getComputedStyle(elem).height;
    document.getElementById(`textNode${index}`).style.height = (Number(height.slice(0, -2)) - 6).toString() + "px";
    changeDisplay(`div_to_change${index}`, 'none');
    changeDisplay(`textNode${index}`, 'block');
}

/**
 * Показывает <div> с названием задачи, скрывая <input> изменения названия
 * @param index
 */
function display_div(index) {
    changeDisplay(`div_to_change${index}`, 'block');
    changeDisplay(`textNode${index}`, 'none');
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
    if (typeof(object) === 'object'){
        if (value === -1){
            switch (object[key]){
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
            switch (object[key]) {
                case 1:
                    changeDisplay(`tick${value}`, 'block');
                    changeDisplay(`cross${value}`, 'none');
                    document.getElementById(`tick${value}`).dataset.tooltip = "Отметить задачу активной";
                    break;
                case 2:
                    changeDisplay(`tick${value}`, 'block');
                    changeDisplay(`cross${value}`, 'block');
                    document.getElementById(`tick${value}`).dataset.tooltip = "Отметить задачу завершенной";
                    document.getElementById(`cross${value}`).dataset.tooltip = "Отметить задачу отмененной";
                    break;
                case 3:
                    changeDisplay(`tick${value}`, 'none');
                    changeDisplay(`cross${value}`, 'block');
                    document.getElementById(`cross${value}`).dataset.tooltip = "Отметить задачу активной";
                    break;
            }
        }
    } else if (object === 'toNum'){
        switch (value){
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
    const origin = "http://127.0.0.1:3000/items";
    changeDisplay('loading', 'flex');
    changeOpacity(0.4);
    if (method === "GET") {
        let resp = await fetch(origin, {
            method: 'GET'
        });
        tasks = await resp.json();
    } else if (method === 'POST') {
        fetch(origin, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then();
    } else if (method === 'DELETE') {
        fetch(origin+`/${id}`, {
            method: 'DELETE',
        }).then();
    } else if (method === 'PUT') {
        fetch(origin+`/${id}`, {
            method: 'PUT',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then();
    }
}

/**
 * Функция, которая меняет прозрачность страницы
 * @param targetOpacity - нужная прозрачность содержимого страницы
 */
function changeOpacity(targetOpacity) {
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
        document.getElementById('search-task-name').disabled = true;
        filterTasks()
    },1000);
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
