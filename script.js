let tasks = []; // основной массив
let filteredTasks = []; // "внешний" массив
const mainDiv = document.getElementById('main');
const div = document.getElementById('output');
let sort = "date";

/**
 * Функция, запускающая фильтрацию и сортировку
 * @param sortParameter
 */
function launchSort(sortParameter){
    (sortParameter === "date") ? sort = "date" : sort = "priority";
    filterTasks();
}

/**
 * добавление задачи с проверкой на существующую задачу
 */
function addTask() {
    const taskName = document.getElementById("input-task-name");
    const comboBoxPriority = document.getElementById("priority-add-task");
    const comboBoxPriorityValue = comboBoxPriority.options[comboBoxPriority.selectedIndex].value;
    if (taskName.value.trim() === '') {
        alert('Введите название задачи');
    } else if (tasks.length === 0 || searchDuplicate(taskName.value, comboBoxPriorityValue, -1)) {
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
                changeDisplay('loading','none');
                changeOpacity(1);
                filterTasks();
            });
    }
    clearInput();
}

/**
 * функция проверки на существование задачи
 * @param taskName - название задачи
 * @param priority - приоритет задачи
 * @param index - индекс задачи на изменение в filteredTasks
 * @returns {boolean}
 */
function searchDuplicate(taskName, priority, index){
    for (let j = 0; j<tasks.length; j++) {
        if (tasks[j]['Название задачи'].trim() === taskName.trim() && tasks[j]['Приоритет'] === priority && index !== j){
            alert('Такая задача уже существует');
            return false;
        }
    }
    return true;
}

/**
 * Сортировка по дате
 */
function sortByDate() {
    const sortComboBoxDate = document.getElementById('sort-date');
    const sortComboBoxDateValue = sortComboBoxDate.options[sortComboBoxDate.selectedIndex].value;
    const sortComboBoxPriority = document.getElementById('sort-priority');
    const sortComboBoxPriorityValue = sortComboBoxPriority.options[sortComboBoxPriority.selectedIndex].value;
    let extraSortMode;
    (sortComboBoxPriorityValue === 'fromHigh') ? extraSortMode = 1 : extraSortMode = -1;
    (sortComboBoxDateValue === 'fromNew') ? sortTasks('time', -1,'Приоритет',extraSortMode) : sortTasks('time', 1,'Приоритет', extraSortMode);
}

/**
 * Сортировка по приоритету
 */
function sortByPriority() {
    const sortComboBoxPriority = document.getElementById('sort-priority');
    const sortComboBoxPriorityValue = sortComboBoxPriority.options[sortComboBoxPriority.selectedIndex].value;
    const sortComboBoxDate = document.getElementById('sort-date');
    const sortComboBoxDateValue = sortComboBoxDate.options[sortComboBoxDate.selectedIndex].value;
    let extraSortMode;
    (sortComboBoxDateValue === 'fromNew') ? extraSortMode = 1 : extraSortMode = -1;
    (sortComboBoxPriorityValue === 'fromHigh') ? sortTasks('Приоритет', -1,'time', extraSortMode) : sortTasks('Приоритет', 1,'time', extraSortMode);
}

/**
 *Фильтр подходящих задач
 */
function filterTasks() {
    const textSearch = document.getElementById('search-task-name');
    const filterPriority = document.getElementById("filterPriority")
    const filterPriorityValue = filterPriority.options[filterPriority.selectedIndex].value;
    const checkActive = document.getElementById('checkboxRejected');
    const checkRejected = document.getElementById('checkboxActive');
    const checkDone = document.getElementById('checkboxDone');

    request('GET',"0",0)
        .then(() => {
            filteredTasks = tasks.filter((task) => {
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
                return a.includes(task['Статус']) &&
                    (textSearch.value.trim === '' || task['Название задачи'].toLowerCase().indexOf(textSearch.value.toLowerCase()) > -1) &&
                    (filterPriorityValue === 'all' || filterPriorityValue === task['Приоритет']);
            })
            if (sort === "date"){
                sortByDate();
            } else {
                sortByPriority();
            }
            changeOpacity(1);
            changeDisplay('loading','none');
            outputConstructor();
        });
}

/**
 *
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
 * @param index
 */
function del_item(index){
    if (confirm('Вы уверены?')) {
        for (let j = 0; j < tasks.length; j++) {
            if (tasks[j].id === filteredTasks[index].id) {
                request('DELETE', 0, tasks[j].id)
                    .then(() => {
                        filterTasks();
                    });
            }
        }
    }
}

/**
 * Вывод текста, который уведомляет, что массив пуст
 * @param text
 */
function showText(text) {
    div.innerHTML = `<h2>${text}</h2>`;
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
        const task = filteredTasks[i]
        const prior = switchCase (task,'Приоритет');
        const color = switchCase (task,'Статус');
        div.innerHTML += `
        <div id = 'output_div_${i}' class="item-of-output">
            <div class="left-side-of-item"> 
                <span style="color: ${color}" id="outputSpanId${i}">${prior}</span>
            </div>
            <div class="center-of-item" 
                 style="background-color: ${color}; ">
                <div class="left-side-of-item-mid" 
                     style="background-color: ${color}">
                    <div class="task-name-of-item" 
                         id="div_to_change${i}" 
                         style="background-color: ${color}; font-size: 18px" 
                         onclick="display_input(${i})">
                    </div>
                    <textarea
                            rows="7"
                            maxlength="100"
                            class="task-name-textarea" 
                            style="background-color: ${color}" 
                            id="textNode${i}" 
                            oninput="auto_grow(this)"
                            onchange="saveChangedTask(${i})" 
                            onblur="display_div(${i})">
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
                    class="status-button"
                            onclick='taskDiff(${i},1)'
                            id="tick${i}">
                    <img src='tickIcon.png' 
                         alt="">
                    </button>
                    <button type="button" 
                            class="status-button"
                            onclick='taskDiff(${i},-1)' 
                            id="cross${i}">
                    <img src='crossIcon.png' 
                         alt="">
                    </button>
                </div>
            </div>
            <div class="right-side-of-item">
                <button onclick="del_item(${i})">
                    <img src="deleteIcon.png" 
                         alt="">
                </button>
            </div>
        </div>    
    `;
        const taskName = task['Название задачи'].trim();
        document.getElementById(`textNode${i}`).textContent = taskName;
        document.getElementById(`div_to_change${i}`).innerText = taskName;
        switchCase(task,'Статус',i);
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
function clearInput(){
    const element = document.getElementById('input-task-name');
    element.value = "";
    const element1 = document.getElementById('priority-add-task');
    element1.value = '2';
}

/**
 * Сохраненяет правок в названии задачи и проверяет, есть ли другая задача с новым названием и тем же приоритето
 * Передаёт изменённую задачу и её индекс
 * @param i - индекс в filteredTasks объекта для изменения
 */
function saveChangedTask(i) {
    const newValue = document.getElementById(`textNode${i}`).value;
    let priority = document.getElementById(`outputSpanId${i}`).innerText;
    priority = switchCase(0,0,priority);
    if (searchDuplicate(newValue, priority, i) && newValue.trim() !== ''){
        const changedTask = filteredTasks[i];
        for (let j = 0; j < tasks.length; j++) {
            if (tasks[j].id === changedTask.id) {
                changedTask['Название задачи'] = newValue;
                request('PUT',changedTask, tasks[j].id)
                    .then();
            }
        }
        changeOpacity(1);
        changeDisplay('loading','none');
        filterTasks();
    } else {
        document.getElementById(`textNode${i}`).value = filteredTasks[i]['Название задачи'];
    }
    if (newValue.trim() === ''){
        alert('Вы не можете оставить название поле пустым')
    }
}

/**
 * Изменяет статус задачи
 * @param index
 * @param difference
 */
function taskDiff(index,difference){
    const changedTask = filteredTasks[index];
    changedTask['Статус'] += +(difference);
    for (let j = 0; j < tasks.length; j++) {
        if (tasks[j].id === changedTask.id) {
            request('PUT',changedTask, changedTask.id)
                .then(() => {
                    changeOpacity(1);
                    changeDisplay('loading','none');
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
function display_input(index){
    const elem = document.getElementById(`div_to_change${index}`);
    const height = getComputedStyle(elem).height;
    document.getElementById(`textNode${index}`).style.height = (Number(height.slice(0, -2)) - 6).toString() + "px";
    changeDisplay(`div_to_change${index}`,'none');
    changeDisplay(`textNode${index}`,'block');
}

/**
 * Показывает <div> с названием задачи, скрывая <input> изменения названия
 * @param index
 */
function display_div(index){
    changeDisplay(`div_to_change${index}`,'block');
    changeDisplay(`textNode${index}`,'none');
}

/**
 * блок задачи - конкретная задача в блоке вывода задач
 * Функция,которая:
 * при передаче в object объекта, в value остаётся пустым: возвращает нужную строку приоритета для вывода или возвращает цвет блока
 * при передаче в object объекта, в value передаётся индекс: прячет или показывает кнопки изменения статуса блока задачи
 * при передаче в object нуля: возвращает возможное значение для объекта с ключом "Статус" по строке приоритета в блоке задачи
 * @param object
 * @param key
 * @param value может быть как индексом в filteredTasks, так и значением приоритета в блоке вывода задачи
 * @returns {string}
 */
function switchCase(object, key, value = -1 ){
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
                    break;
                case 2:
                    changeDisplay(`tick${value}`, 'block');
                    changeDisplay(`cross${value}`, 'block');
                    break;
                case 3:
                    changeDisplay(`tick${value}`, 'none');
                    changeDisplay(`cross${value}`, 'block');
                    break;
            }
        }
    } else {
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
 * @param method
 * @param body
 * @param id
 * @returns {Promise<void>}
 */
async function request(method, body,id){
    const origin = "http://127.0.0.1:3000/items";
    changeDisplay('loading','flex');
    changeOpacity(0.4);
    if (method === "GET") {
        let resp = await fetch(origin,{
            method: 'GET'
        });
        tasks = await resp.json();
    } else if (method === 'POST'){
        fetch(origin,{
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        }).then();
    } else if (method === 'DELETE'){
        fetch(origin+`/${id}`,{
            method: 'DELETE',
        }).then();
    } else if (method === 'PUT'){
        fetch(origin+`/${id}`,{
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
function changeOpacity(targetOpacity){
    const elements = document.querySelectorAll('.center-of-page');
    for (let i = 0; i < elements.length; i++){
        elements[i].style.opacity = `${targetOpacity}`;
    }
}

/**
 * Функция автоматического роста textarea
 * @param element
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
 * Функция, запускающая поиск задач спустя полсекунды после начала ввода названия
 */
function startSearch(){
    setTimeout(() => filterTasks(),500)
}
