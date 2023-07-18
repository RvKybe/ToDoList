const mainContainer = document.getElementById('main'); // контейнер для страницы
const outputContainer = document.getElementById('output');// контейнер для вывода
const taskNameInput = document.getElementById('input-task-name');
const priorityCombobox = document.getElementById('priority-add-task');
const filterPriorityCombobox = document.getElementById('filter-priority');
const checkboxes = Array.from(document.getElementById('checkboxesParent').children);
const sortByDateCombobox = document.getElementById('sort-date');
const sortByPriorityCombobox = document.getElementById('sort-priority');
const taskSearchInput = document.getElementById('search-task-name');
let tasks = []; // основной массив
let filteredTasks = []; // массив, откуда забираются задачи для вывода
let sort = 'date'; // способ сортировки. По умолчанию стоит по дате
let showTooltipTimeout; // таймер показа подсказки
const HOST = 'http://127.0.0.1:3000/items';
const HEADERS = {
    'accept': 'application/json',
    'Content-Type': 'application/json'
};
const MEDIUM_PRIORITY_ID = 2;
const ACTIVE_STATUS_ID = 2;
sendGetRequest().then(() => {
    filterTasks();
});

/**
 * Функция, которая добавляет задачу
 */
async function addTask() {
    const priorityComboBoxValue = priorityCombobox.value;
    const taskName = taskNameInput.value;
    if (!taskName.trim()) {
        alert('Введите название задачи');
    } else if (!tasks.length || !searchDuplicate(taskName)) {
        const dateTime = new Date();
        const outputDateTime = dateTime.toLocaleString('ru-RU');
        const newTask = {
            priorityId: priorityComboBoxValue,
            name: taskName,
            outputDateTime,
            statusId: ACTIVE_STATUS_ID,
            dateTime,
        };
        await sendPostRequest(newTask);
        await sendGetRequest();
        filterTasks();
    }
    clearInput();
}

/**
 * Функция фильтрации подходящих задач
 */
function filterTasks() {
    const taskSearchValue = taskSearchInput.value;
    const filterPriorityComboboxValue = filterPriorityCombobox.value;
    const selectedStatusIds = checkboxes
        .filter(checkBox => checkBox.checked)
        .map(checkBox => Number(checkBox.dataset.attr));
    filteredTasks = tasks.filter((task) => {
        return selectedStatusIds.includes(task.statusId) &&
            (!taskSearchValue.trim() || task.name.toLowerCase().indexOf(taskSearchValue.toLowerCase()) > -1) &&
            (Number(filterPriorityComboboxValue) === -1 || filterPriorityComboboxValue === task.priority);
    });
    launchSort(null, false);
    outputConstructor();
    switchPreloaderDisplay(false);
}

/**
 * Функция, вызывающая функции сортировки в зависимости от основного параметра сортировки
 * @param sortParameter - основной параметр сортировки
 * @param needToConstruct - нужен для отделения сортировки по нажатию кнопки от сортировки в filterTasks
 */
function launchSort(sortParameter, needToConstruct = true) {
    const sortByDateComboboxValue = sortByDateCombobox.value;
    const sortByPriorityComboBoxValue = sortByPriorityCombobox.value;
    if (sortParameter) {
        sort = sortParameter;
    }
    if (sort === 'date') {
        const sortMode = sortByDateComboboxValue === 'fromNew' ? -1 : 1;
        sortTasks('dateTime', sortMode);
    } else {
        if (sortByPriorityComboBoxValue === 'none') {
            sort = 'date';
            launchSort(null);
            return;
        } else {
            const sortMode = sortByPriorityComboBoxValue === 'fromHigh' ? -1 : 1;
            const alternativeSortMode = sortByDateComboboxValue === 'fromNew' ? -1 : 1;
            sortTasks('priorityId', sortMode, 'dateTime', alternativeSortMode);
        }
    }
    if (needToConstruct) {
        outputConstructor();
    }
    switchComboboxHighlight(sort);
}

/**
 * Функция сортировки
 * @param sortParameter - основной параметр сортировки
 * @param sortMode - вид сортировки (по убывынию или по возрастанию)
 * @param alternativeSortParameter - дополнительный параметр сортировки
 * @param alternativeSortMode - дополнительный вид сортировки
 */
function sortTasks(sortParameter, sortMode, alternativeSortParameter, alternativeSortMode) {
    filteredTasks = filteredTasks.sort((a, b) => {
        if (a[sortParameter] === b[sortParameter]) {
            if (a[alternativeSortParameter] > b[alternativeSortParameter]) {
                return alternativeSortMode;
            }
            if (a[alternativeSortParameter] < b[alternativeSortParameter]) {
                return -1 * alternativeSortMode;
            }
        } else if (a[sortParameter] < b[sortParameter]) {
            return -1 * sortMode;
        } else {
            return sortMode;
        }
    });
}

/**
 * Функция выделения комбобокса сортировки
 */
function switchComboboxHighlight() {
    const sortByDateComboboxClassList = sortByDateCombobox.classList;
    const sortByPriorityComboboxClassList = sortByPriorityCombobox.classList;
    if (sort === 'date') {
        sortByDateComboboxClassList.add('combobox-highlight');
        sortByPriorityComboboxClassList.remove('combobox-highlight');
    } else {
        sortByDateComboboxClassList.remove('combobox-highlight');
        sortByPriorityComboboxClassList.add('combobox-highlight');
    }
}

/**
 * Функция-конструктор вывода
 */
function outputConstructor() {
    outputContainer.innerHTML = '';
    mainContainer.append(outputContainer);
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
        const priorityName = getPriorityNameById(task.priorityId);
        const backgroundColor = getStatusColorById(task.statusId);
        const taskName = task.name.trim();
        let textColor;
        if (backgroundColor === '#FFFFFF') {
            textColor = '#f2db0c';
        } else {
            textColor = backgroundColor;
        }
        outputContainer.innerHTML += `
        <div id="output-div-${i}" 
             class="item output-area__item">
            <div class="item__task-priority-block"> 
                <span style="color: ${textColor}"
                      class="item__task-priority">
                      ${priorityName}
                </span>
            </div>
            <div class="main item__main" 
                 style="background-color: ${backgroundColor};">
                <div class="main__task-info-block">
                    <div id="task-name-div${i}" 
                         onclick="displayInput(${i})"  
                         class="item__task-name-div">
                    </div>
                    <textarea id="textNode${i}" 
                              oninput="extendTextarea(this)"
                              onchange="saveChangedTask(${i})" 
                              onblur="displayDiv(${i})"
                              rows="7"
                              maxlength="100"
                              style="background-color: ${backgroundColor};"
                              class="item__task-name-textarea">
                    </textarea>
                    <div class="task__date-of-add" 
                        <span>${task.outputDateTime}</span>
                    </div>
                </div>
                <div class="main__status-buttons">
                    <button type="button" 
                            id="status-up-button${i}"
                            onclick="changeTaskStatus(${i}, 1)"
                            onmouseenter="showTooltip(event)"
                            onmouseleave="hideTooltip(event)"
                            data-tooltip="Отметить задачу выполненной"
                            class="status-button">
                    <img src="tick-icon.png" 
                         alt="">
                    </button>
                    <button type="button" 
                            id="status-down-button${i}"
                            onclick="changeTaskStatus(${i}, -1)"
                            onmouseenter="showTooltip(event)"
                            onmouseleave="hideTooltip(event)"
                            data-tooltip="Отметить задачу отмененной"
                            class="status-button">
                    <img src="cross-icon.png" 
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
                    <img src="delete-icon.png" 
                         alt="">
                </button>
            </div>
        </div>    
    `;
        document.getElementById(`task-name-div${i}`).innerText = taskName;
        changeStatusButtonsDisplay(task.statusId, i);
    }
}

/**
 * Функция переключения режима отображения прелоадер
 * @param visible - целевое состояние видимости прелоадера
 */
function switchPreloaderDisplay(visible) {
    if (visible) {
        changeElementDisplay('loading', 'flex');
        changePageOpacity(0.4);
    } else {
        changeElementDisplay('loading', 'none');
        changePageOpacity(1);
    }
}

/**
 * Функция, которая проверяет задачу на существование
 * @param taskName - название задачи
 * @returns {boolean} возвращает true, если дубликат был найден
 */
function searchDuplicate(taskName) {
    const duplicateExist = tasks.some(task => {
        return task.name.trim() === taskName.trim();
    });
    if (duplicateExist) {
        alert('Такая задача уже существует');
    }
    return duplicateExist;
}

/**
 * Функция, которая удаляет задачу
 * @param index - порядковый номер задачи в filteredTasks
 */
async function deleteItem(index) {
    if (confirm('Вы уверены?')) {
        await sendDeleteRequest(filteredTasks[index].id);
        await sendGetRequest();
        filterTasks();
    }
}

/**
 * Функция вывода текста, который уведомляет, что tasks или filteredTasks пусты
 * @param text - текст-затычка для outputContainer при пустых массивах
 */
function showText(text) {
    outputContainer.innerHTML = `<div class='title'>
                                     <h2 class='title__item'>
                                         ${text}
                                     </h2>
                                 </div>`;
}

/**
 * Функция смены режима отображения элемента
 * @param elementId - id элемента
 * @param targetStatus - нужный статус
 */
function changeElementDisplay(elementId, targetStatus) {
    document.getElementById(`${elementId}`).style.display = targetStatus;
}

/**
 * Функция чистки полей ввода названия задачи и комбобокса приоритета задачи
 */
function clearInput() {
    taskNameInput.value = '';
    priorityCombobox.value = MEDIUM_PRIORITY_ID;
}

/**
 * Сохраняет правки в названии задачи, если не существует задачи с таким же названием
 * @param index - порядковый номер задачи в filteredTasks
 */
async function saveChangedTask(index) {
    const changedTask = filteredTasks[index];
    let newNameValue = document.getElementById(`textNode${index}`).value;
    if (!searchDuplicate(newNameValue) && newNameValue.trim()) {
        changedTask.name = newNameValue;
        await sendPutRequest( changedTask, changedTask.id);
        await sendGetRequest();
        filterTasks();
    } else {
        newNameValue = changedTask.name;
    }
    if (!newNameValue.trim()) {
        alert('Вы не можете оставить название поле пустым');
    }
}

/**
 * Изменяет статус задачи
 * @param index - порядковый номер задачи в filteredTasks
 * @param difference - разница между старым и новым статусом задачи
 */
async function changeTaskStatus(index, difference) {
    const changedTask = filteredTasks[index];
    changedTask.statusId += +difference;
    await sendPutRequest( changedTask, changedTask.id);
    await sendGetRequest();
    filterTasks();
}

/**
 * Показывает элемент изменения названия после щелчка по блоку вывода названия задачи
 * Скрывает блок с названием задачи
 * Сохраняет высоту блок названия задачи и назначает её же элементу изменения названия задачи
 * @param index - порядковый номер задачи в filteredTasks
 */
function displayInput(index) {
    const textNode = document.getElementById(`textNode${index}`);
    const divHeight = getComputedStyle(document.getElementById(`task-name-div${index}`)).height;
    textNode.style.height = (Number(divHeight.slice(0, -2)) - 6).toString() + 'px';
    textNode.textContent = filteredTasks[index].name;
    changeElementDisplay(`task-name-div${index}`, 'none');
    changeElementDisplay(`textNode${index}`, 'block');
    textNode.focus();
}

/**
 * Показывает блок вывода с названием задачи, скрывая элемента изменения названия задачи
 * @param index - порядковый номер задачи в filteredTasks
 */
function displayDiv(index) {
    changeElementDisplay(`task-name-div${index}`, 'block');
    changeElementDisplay(`textNode${index}`, 'none');
}

/**
 * Функия, которая контролирует видимость кнопок и текст на подсказках
 * @param statusId - id статуса у задачи
 * @param index - порядковый номер задачи в filteredTasks
 */
function changeStatusButtonsDisplay(statusId, index) {
    const statusUpButtonId = `status-up-button${index}`;
    const statusUpButton = document.getElementById(statusUpButtonId);
    let statusUpButtonTargetDisplay = '';
    let statusUpButtonTooltip = '';
    const statusDownButtonId = `status-down-button${index}`;
    const statusDownButton = document.getElementById(statusDownButtonId);
    let statusDownButtonTargetDisplay = '';
    let statusDownButtonTooltip = '';
    switch(statusId) {
        case 1:
            statusUpButtonTargetDisplay = 'block';
            statusUpButtonTooltip = 'Отметить задачу активной';
            statusDownButtonTargetDisplay = 'none';
            break;
        case 2:
            statusUpButtonTargetDisplay = 'block';
            statusUpButtonTooltip = 'Отметить задачу решенной';
            statusDownButtonTargetDisplay = 'block';
            statusDownButtonTooltip = 'Отметить задачу отменной';
            break;
        case 3:
            statusUpButtonTargetDisplay = 'none';
            statusDownButtonTargetDisplay = 'block';
            statusDownButtonTooltip = 'Отметить задачу активной';
            break;
    }
    changeElementDisplay(statusUpButtonId, statusUpButtonTargetDisplay);
    statusUpButton.dataset.tooltip = statusUpButtonTooltip;
    changeElementDisplay(statusDownButtonId, statusDownButtonTargetDisplay);
    statusDownButton.dataset.tooltip = statusDownButtonTooltip;
}

/**
 * Функция, которая возвращает название приоритета по id приоритета у задачи
 * @param priorityId - id приоритета у задачи
 * @returns {*}
 */
function getPriorityNameById(priorityId) {
    const priorityDictionary = {
        '1': 'низкий',
        '2': 'средний',
        '3': 'высокий'
    };
    return priorityDictionary[priorityId];
}

/**
 * Функция, которая возвращает цвет фона элементов по id статуса задачи
 * @param statusId - id статуса у задачи
 * @returns {*}
 */
function getStatusColorById(statusId) {
    const colorDictionary = {
        1: '#ff6161',
        2: '#FFFFFF',
        3: '#80ff80'
    };
    return colorDictionary[statusId];
}

/**
 *Функция, посылающая запрос GET
 * @returns {Promise<void>}
 */
async function sendGetRequest() {
    switchPreloaderDisplay(true);
    const response = await fetch(`${HOST}`, {
        method: 'GET'
    });
    tasks = await response.json();
}

/**
 * Функция, посылающая запрос POST
 * @param body - посылаемая задача
 * @returns {Promise<void>}
 */
async function sendPostRequest(body) {
    switchPreloaderDisplay(true);
    body = JSON.stringify(body);
    await fetch(`${HOST}`, {
        method: 'POST',
        headers: HEADERS,
        body
    });
}

/**
 * Функция, посылающая запрос DELETE
 * @param id - id задачи
 * @returns {Promise<void>}
 */
async function sendDeleteRequest(id) {
    switchPreloaderDisplay(true);
    await fetch(`${HOST}/${id}`, {
        method: 'DELETE'
    });
}

/**
 * Функция, посылающая запрос PUT
 * @param body - посылаемая задача
 * @param id - id задачи
 * @returns {Promise<void>}
 */
async function sendPutRequest(body, id) {
    switchPreloaderDisplay(true);
    body = JSON.stringify(body);
    await fetch(`${HOST}/${id}`, {
        method: 'PUT',
        headers: HEADERS,
        body
    });
}

/**
 * Функция, которая меняет прозрачность страницы
 * @param targetOpacity - нужная прозрачность содержимого страницы
 */
function changePageOpacity(targetOpacity) {
   document.querySelectorAll('.page-center')
       .forEach(element => element.style.opacity = `${targetOpacity}`);
}

/**
 * Функция автоматического роста textarea при вводе enter
 * @param element - textarea, в которой меняется высота
 */
function extendTextarea(element) {
    element.style.height = '5px';
    if (element.scrollHeight <= 150) {
        element.style.height = element.scrollHeight + 'px';
    } else {
        element.style.height = '150px';
    }
}

/**
 * Функция поиска задачи
 */
function startSearch() {
    const searchTaskTextLength = taskSearchInput.value.length;
    if (searchTaskTextLength > 1) {
            filterTasks();
    }
}

/**
 * Функция, запускающая стандартную фильтрацию
 */
function defaultSort() {
    sortByPriorityCombobox.value = 'none';
    sortByDateCombobox.value = 'fromNew';
    taskSearchInput.value = '';
    filterPriorityCombobox.value = '-1';
    checkboxes.map(checkbox => checkbox.checked = true);
    filterTasks();
}

/**
 * Функция, которая отрисовывает подсказку спустя секунду после наведения на элемент курсора
 * @param event - onmouseenter
 */
function showTooltip(event) {
     showTooltipTimeout = setTimeout(() => {
        const target = event.target;
        const tooltipDiv = document.createElement('div');
        tooltipDiv.className = 'tooltip';
        document.body.append(tooltipDiv);
        if (target.dataset.tooltip) {
            const coords = target.getBoundingClientRect();
            tooltipDiv.innerHTML = target.dataset.tooltip;
            tooltipDiv.style.top = coords.top - tooltipDiv.offsetHeight - 5 + 'px';
            tooltipDiv.style.left = coords.left + (coords.width - tooltipDiv.offsetWidth) / 2 + 'px';
        }
    }, 1000);
}

/**
 * Функция, которая убирает подсказку
 * @param event - onmouseleave
 */
function hideTooltip(event) {
    clearTimeout(showTooltipTimeout);   
    document.querySelectorAll('.tooltip')
        .forEach(item => item.remove());
}