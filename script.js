let tasks = []; // основной массив
let filteredTasks = []; // 'внешний' массив
const mainDiv = document.getElementById('main');
const div = document.getElementById('output');
let sort = 'date';
let showTooltipTimeout;
requestGet().then( () => filterTasks());

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

    sort = sortParameter === 'date' ? 'date' : 'priority';
    const notSort = sort === 'date' ? 'priority' : 'date';
    if (sort === 'date') {
        const sortMode = sortComboBoxDateValue === 'fromNew' ? -1 : 1;
        sortTasks('dateTime', sortMode);
    } else {
        if (sortComboBoxPriorityValue === 'none') {
            sort = 'date';
            launchSort(sort);
            return;
        } else {
            const sortMode = (sortComboBoxPriorityValue === 'fromHigh') ? -1 : 1;
            const extraSortMode = (sortComboBoxDateValue === 'fromNew') ? -1 : 1;
            sortTasks('priority', sortMode, 'dateTime', extraSortMode);
        }
    }
    if (needToConstruct) {
        outputConstructor();
    }
    highlight(sort);
    removeHighlight(notSort);
}

/**
 * Добавление задачи
 */
function addTask() {
    const taskNameInput = document.getElementById('input-task-name');
    const priorityCombobox = document.getElementById('priority-add-task');
    const comboBoxPriorityValue = priorityCombobox.value;
    const taskName = taskNameInput.value;
    const midStatusIndex = 2;
    if (!taskName.trim()) {
        alert('Введите название задачи');
    } else if (!tasks.length || !searchDuplicate(taskName)) {
        const status = midStatusIndex;
        const dateTime = new Date();
        const outputDateTime = dateTime.toLocaleString('ru-RU');
        const newTask = {
            'priority' : comboBoxPriorityValue,
            'name' : taskNameInput.value,
            'outputDateTime' : outputDateTime,
            'status' : status,
            'dateTime' : dateTime,
        };
        requestPost(newTask)
            .then(() => {
                requestGet()
                    .then(() => filterTasks());
            });
    }
    clearInput();
}

/**
 * Функция проверки на существование задачи
 * @param taskName - название задачи
 * @returns {boolean} возвращает true, если дубликат был найден
 */
function searchDuplicate(taskName) {
    const duplicateExist = tasks.some((task, j) => {
        return task['name'].trim() === taskName.trim();
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
    const taskSearchInput = document.getElementById('search-task-name');
    const taskSearchValue = taskSearchInput.value;
    const filterPriority = document.getElementById('filter-priority');
    const filterPriorityValue = filterPriority.value;
    const checkBoxElements = Array.from(document.getElementById('checkboxesParent').children);
    const selectedStatusIds = checkBoxElements
        .filter(checkBox => checkBox.checked)
        .map(checkBox => Number(checkBox.dataset.attr));
    filteredTasks = tasks.filter((task) => {
        return selectedStatusIds.includes(task['status']) &&
            (!taskSearchValue.trim() || task['name'].toLowerCase().indexOf(taskSearchInput.value.toLowerCase()) > -1) &&
            (filterPriorityValue === '-1' || filterPriorityValue === task['priority']);
    });
    launchSort(sort, false);
    outputConstructor();
    changeElementDisplayStyle('loading', 'none');
    changePageOpacity(1);

}

/**
 * Функция сортировки
 * @param sortParameter - Основной параметр сортировки
 * @param sortMode - Вид сортировки
 * @param extraSortParameter - Дополнительный параметр сортировки
 * @param extraSortMode - дополнительный параметр сортировки
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
 * Удаляет задачу
 * @param index - номер задачи в filteredTasks
 */
function deleteItem(index) {
    if (confirm('Вы уверены?')) {
            requestDelete( filteredTasks[index].id)
                .then(() => {
                    requestGet()
                        .then(() => filterTasks())
                });
    }
}

/**
 * Вывод текста, который уведомляет, что tasks или filteredTasks пусты
 * @param text
 */
function showText(text) {
    div.innerHTML = `<div class='title'>
                         <h2 class='title__item'>
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
        const prior = getPriorityNameById(task['priority']);
        const color = getColorByStatusId(task['status']);
        const taskName = task['name'].trim();
        let textColor;
        if (color === '#FFFFFF') {
            textColor = '#f2db0c';
        } else {
            textColor = color;
        }
        div.innerHTML += `
        <div id = 'output_div_${i}' 
             class='item output-area__item'>
            <div class='item__task-priority-block'> 
                <span id='outputSpanId${i}' 
                      style='color: ${textColor}'
                      class='item__task-priority'>
                      ${prior}
                </span>
            </div>
            <div class='main item__main' 
                 style='background-color: ${color};'>
                <div class='main__task-info-block'>
                    <div id='div-change${i}' 
                         onclick='displayInput(${i})'  
                         class='item__task-name-div'>
                    </div>
                    <textarea id='textNode${i}' 
                              oninput='expansionTextarea(this)'
                              onchange='saveChangedTask(${i})' 
                              onblur='displayDiv(${i})'
                              rows='7'
                              maxlength='100'
                              style='background-color: ${color};'
                              class='item__task-name-textarea'>
                    </textarea>
                    <div class='task__date-of-add' 
                        <span>${task['outputDateTime']}</span>
                    </div>
                </div>
                <div class='main__status-buttons'>
                    <button type='button' 
                            id='statusUpButton${i}'
                            onclick='changeTaskStatus(${i}, 1)'
                            onmouseenter='showTooltip(event)'
                            onmouseleave='hideTooltip(event)'
                            data-tooltip='Отметить задачу выполненной'
                            class='status-button'>
                    <img src='tick-icon.png' 
                         alt=''>
                    </button>
                    <button type='button' 
                            id='statusDownButton${i}'
                            onclick='changeTaskStatus(${i}, -1)'
                            onmouseenter='showTooltip(event)'
                            onmouseleave='hideTooltip(event)'
                            data-tooltip='Отметить задачу отмененной'
                            class='status-button'>
                    <img src='cross-icon.png' 
                         alt=''>
                    </button>
                </div>
            </div>
            <div class='item__delete-button-block'>
                <button onclick='deleteItem(${i})'
                        onmouseenter='showTooltip(event)'
                        onmouseleave='hideTooltip(event)'
                        data-tooltip='Удалить задачу'
                        class='item__delete-button'>
                    <img src='delete-icon.png' 
                         alt=''>
                </button>
            </div>
        </div>    
    `;
        document.getElementById(`div-change${i}`).innerText = taskName;
        changeStatusButtons(task['status'], i);
    }
}

/**
 * Смена отображения элемента
 * @param elementId - id элемента
 * @param targetStatus - нужный статус
 */
function changeElementDisplayStyle(elementId, targetStatus) {
    document.getElementById(`${elementId}`).style.display = targetStatus;
}

/**
 * Чистка полей ввода названия задачи и комбобокса приоритета задачи
 */
function clearInput() {
    const midPriorityValue = '2';
    const inputTaskName = document.getElementById('input-task-name');
    inputTaskName.value = '';
    const priorityCombobox = document.getElementById('priority-add-task');
    priorityCombobox.value = midPriorityValue;
}

/**
 * Сохраняет правки в названии задачи и проверяет, есть ли другая задача с новым названием и тем же приоритето
 * Передаёт изменённую задачу и её индекс
 * @param i - индекс в filteredTasks объекта для изменения
 */
function saveChangedTask(i) {
    const changedTask = filteredTasks[i];
    const newValue = document.getElementById(`textNode${i}`).value;
    if (!searchDuplicate(newValue) && newValue.trim()) {
        changedTask['name'] = newValue;
        requestPut( changedTask, changedTask.id)
            .then ( () => {
                requestGet()
                    .then(() => filterTasks());
            })
    } else {
        document.getElementById(`textNode${i}`).value = filteredTasks[i]['name'];
    }
    if (!newValue.trim()) {
        alert('Вы не можете оставить название поле пустым');
    }
}

/**
 * Изменяет статус задачи
 * @param index - номер задачи в filteredTasks
 * @param difference - разница между старым и новым статусом задачи
 */
function changeTaskStatus(index, difference) {
    const changedTask = filteredTasks[index];
    changedTask['status'] += +difference;
    requestPut( changedTask, changedTask.id)
        .then(() => {
            requestGet().
                then(() => {
                    filterTasks();
                });
        });
}

/**
 * Показывает <input> изменения названия, скрывая <div> с названием задачи
 * Сохраняет высоту <div> и назначает её же textarea
 * @param index - id задачи в filteredTasks
 */
function displayInput(index) {
    const divHeight = getComputedStyle(document.getElementById(`div-change${index}`)).height;
    document.getElementById(`textNode${index}`).style.height = (Number(divHeight.slice(0, -2)) - 6).toString() + 'px';
    document.getElementById(`textNode${index}`).textContent = filteredTasks[index]['name'];
    changeElementDisplayStyle(`div-change${index}`, 'none');
    changeElementDisplayStyle(`textNode${index}`, 'block');
    document.getElementById(`textNode${index}`).focus();
}

/**
 * Показывает <div> с названием задачи, скрывая <input> изменения названия
 * @param index - индекс задачи в filteredTasks
 */
function displayDiv(index) {
    changeElementDisplayStyle(`div-change${index}`, 'block');
    changeElementDisplayStyle(`textNode${index}`, 'none');
}

/**
 * Функия, которая контролирует видимость кнопок и текст на подсказках
 * @param statusId - id статуса у задачи
 * @param index - индекс задачи в filteredTasks
 */
function changeStatusButtons(statusId, index) {
    let statusUpButtonTargetDisplay = '';
    let statusDownButtonTargetDisplay = '';
    let statusUpButtonTooltip = '';
    let statusDownButtonTooltip = '';
    switch (statusId) {
        case 1:
            statusUpButtonTargetDisplay = 'block';
            statusDownButtonTargetDisplay = 'none';
            statusUpButtonTooltip = 'Отметить задачу активной';
            break;
        case 2:
            statusUpButtonTargetDisplay = 'block';
            statusDownButtonTargetDisplay = 'block';
            statusUpButtonTooltip = 'Отметить задачу решенной';
            statusDownButtonTooltip = 'Отметить задачу отменной';
            break;
        case 3:
            statusUpButtonTargetDisplay = 'none';
            statusDownButtonTargetDisplay = 'block';
            statusDownButtonTooltip = 'Отметить задачу активной';
            break;
    }
    changeElementDisplayStyle(`statusUpButton${index}`, statusUpButtonTargetDisplay);
    changeElementDisplayStyle(`statusDownButton${index}`, statusDownButtonTargetDisplay);
    document.getElementById(`statusUpButton${index}`).dataset.tooltip = statusUpButtonTooltip;
    document.getElementById(`statusDownButton${index}`).dataset.tooltip = statusDownButtonTooltip;
}

/**
 * Функция, которая возвращает название приоритета по его id
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
 * Функция, которая возвращает цвет по id статуса
 * @param colorId - id статуса у задачи
 * @returns {*}
 */
function getColorByStatusId(colorId) {
    const colorDictionary = {
        1: '#ff6161',
        2: '#FFFFFF',
        3: '#80ff80'
    };
    return colorDictionary[colorId];
}

/**
 *Функция, посылающая запрос GET
 * @returns {Promise<void>}
 */
async function requestGet() {
    const host = 'http://127.0.0.1:3000/items';
    changeElementDisplayStyle('loading', 'flex');
    changePageOpacity(0.4);
    const response = await fetch(host, {
        method : 'GET'
    });
    tasks = await response.json();
}

/**
 * Функция, посылающая запрос POST
 * @param body
 * @returns {Promise<void>}
 */
async function requestPost(body) {
    const host = 'http://127.0.0.1:3000/items';
    const headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };
    body = JSON.stringify(body);
    changeElementDisplayStyle('loading', 'flex');
    changePageOpacity(0.4);
    await fetch(host, {
        method : 'POST',
        headers,
        body
    });
}

/**
 * Функция, посылающая запрос DELETE
 * @param id - id элемента на бэке
 * @returns {Promise<void>}
 */
async function requestDelete(id) {
    const host = 'http://127.0.0.1:3000/items';
    changeElementDisplayStyle('loading', 'flex');
    changePageOpacity(0.4);
    await fetch(`${host}/${id}`, {
        method : 'DELETE'
    });
}

/**
 * Функция, посылающая запрос PUT
 * @param body - посылаемая задача
 * @param id - id задачи на бэке
 * @returns {Promise<void>}
 */
async function requestPut(body, id) {
    const host = 'http://127.0.0.1:3000/items';
    const headers = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
    };
    body = JSON.stringify(body);
    changeElementDisplayStyle('loading', 'flex');
    changePageOpacity(0.4);
    await fetch(`${host}/${id}`, {
        method : 'PUT',
        headers,
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
function expansionTextarea(element) {
    element.style.height = '5px';
    if (element.scrollHeight <= 150) {
        element.style.height = (element.scrollHeight) + 'px';
    } else {
        element.style.height = '150px';
    }
}

/**
 * Функция поиска задачи
 */
function startSearch() {
    const searchTaskInput = document.getElementById('search-task-name');
    const searchTaskTextLength = searchTaskInput.value.length;
    if (searchTaskTextLength  !== 1) {
            filterTasks();
    }
}

/**
 * Функция, запускающая стандартную фильтрацию
 */
function defaultSort() {
    document.getElementById('sort-priority').value = 'none';
    document.getElementById('sort-date').value = 'fromNew';
    document.getElementById('search-task-name').value = '';
    document.getElementById('filter-priority').value = '-1';
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
        div.className = 'tooltip';
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
    document.querySelectorAll('.tooltip').forEach(item => item.remove())
}

/**
 * Функция выделения комбобокса сортировки
 * id комбобокса сортировки состоит из sort- и параметра сортировки
 * @param idPiece - параметр сортировки как составная часть id комбобокса
 */
function highlight(idPiece) {
    document.getElementById(`sort-${idPiece}`).classList.add('combobox-highlight');
}

/**
 * Функция выделения комбобокса сортировки
 * id комбобокса сортировки состоит из sort- и параметра сортировки
 * @param idPiece - параметр сортировки как составная часть id комбобокса
 */
function removeHighlight(idPiece) {
    document.getElementById(`sort-${idPiece}`).classList.remove('combobox-highlight');
}