// app.js
document.addEventListener('DOMContentLoaded', function() {
    // 初始化日历
    initCalendar();
    loadEvents();
    updateTodayEvents();
    
    // 设置默认日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('event-date').value = today;
    
    // 初始化分享链接
    generateShareLink();
});

// 全局变量
let calendar;
let events = [];
let currentUser = 'user1'; // 当前登录用户

// 初始化FullCalendar
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'zh-cn',
        slotMinTime: '08:00:00',
        slotMaxTime: '22:00:00',
        slotDuration: '00:30:00',
        allDaySlot: false,
        editable: true,
        selectable: true,
        select: function(info) {
            // 点击空白处添加事件
            showEventForm();
            document.getElementById('event-date').value = info.startStr.split('T')[0];
            document.getElementById('start-time').value = formatTime(info.start);
            document.getElementById('end-time').value = formatTime(info.end);
        },
        eventClick: function(info) {
            // 点击事件编辑
            editEvent(info.event);
        },
        eventDrop: function(info) {
            // 拖拽更新事件
            updateEventInStorage(info.event);
        },
        eventResize: function(info) {
            // 调整大小更新事件
            updateEventInStorage(info.event);
        },
        events: function(fetchInfo, successCallback, failureCallback) {
            // 根据当前视图过滤事件
            const filteredEvents = filterEventsByView(fetchInfo.start, fetchInfo.end);
            successCallback(filteredEvents);
        },
        eventDidMount: function(info) {
            // 根据用户设置颜色
            const user = info.event.extendedProps.user;
            if (user === 'user1') {
                info.el.style.backgroundColor = '#4a6fa5';
            } else if (user === 'user2') {
                info.el.style.backgroundColor = '#e85d75';
            } else if (user === 'both') {
                info.el.style.backgroundColor = '#6c5ce7';
            }
        }
    });
    
    calendar.render();
}

// 保存事件
function saveEvent() {
    const title = document.getElementById('event-title').value.trim();
    const date = document.getElementById('event-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const location = document.getElementById('event-location').value;
    const user = document.getElementById('event-user').value;
    const repeat = document.getElementById('event-repeat').value;
    
    if (!title || !date || !startTime || !endTime) {
        alert('请填写完整信息');
        return;
    }
    
    const event = {
        id: Date.now().toString(),
        title: title,
        start: `${date}T${startTime}`,
        end: `${date}T${endTime}`,
        location: location || '',
        user: user,
        repeat: repeat,
        createdAt: new Date().toISOString()
    };
    
    // 如果是重复事件，生成系列事件
    if (repeat !== 'none') {
        const seriesEvents = generateRecurringEvents(event);
        events.push(...seriesEvents);
    } else {
        events.push(event);
    }
    
    // 保存到本地存储
    saveEventsToStorage();
    
    // 更新日历显示
    calendar.refetchEvents();
    updateTodayEvents();
    
    // 隐藏表单
    hideEventForm();
    
    // 重置表单
    document.getElementById('eventForm').reset();
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
}

// 编辑事件
function editEvent(eventObj) {
    const event = events.find(e => e.id === eventObj.id);
    if (!event) return;
    
    // 填充表单
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-date').value = event.start.split('T')[0];
    document.getElementById('start-time').value = event.start.split('T')[1].substring(0, 5);
    document.getElementById('end-time').value = event.end.split('T')[1].substring(0, 5);
    document.getElementById('event-location').value = event.location || '';
    document.getElementById('event-user').value = event.user;
    document.getElementById('event-repeat').value = event.repeat || 'none';
    
    // 显示编辑表单
    showEventForm();
    
    // 修改保存逻辑（临时）
    const saveBtn = document.querySelector('#event-form .btn-primary');
    const originalClick = saveBtn.onclick;
    saveBtn.onclick = function() {
        // 更新事件
        event.title = document.getElementById('event-title').value;
        event.start = `${document.getElementById('event-date').value}T${document.getElementById('start-time').value}`;
        event.end = `${document.getElementById('event-date').value}T${document.getElementById('end-time').value}`;
        event.location = document.getElementById('event-location').value;
        event.user = document.getElementById('event-user').value;
        event.repeat = document.getElementById('event-repeat').value;
        
        saveEventsToStorage();
        calendar.refetchEvents();
        hideEventForm();
        
        // 恢复原点击事件
        saveBtn.onclick = originalClick;
    };
}

// 切换视图
function switchView(viewType) {
    // 更新标签状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // 显示/隐藏空闲时间
    const freeTimeContainer = document.getElementById('free-time-container');
    if (viewType === 'availability') {
        freeTimeContainer.style.display = 'block';
        findCommonAvailability();
    } else {
        freeTimeContainer.style.display = 'none';
    }
    
    // 重新渲染事件（根据视图过滤）
    calendar.refetchEvents();
}

// 查找共同空闲时间
function findCommonAvailability() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);
    
    // 获取今日事件
    const todayEvents = events.filter(event => {
        const eventDate = new Date(event.start).toDateString();
        return eventDate === today.toDateString();
    });
    
    // 分离用户事件
    const user1Events = todayEvents.filter(e => e.user === 'user1' || e.user === 'both');
    const user2Events = todayEvents.filter(e => e.user === 'user2' || e.user === 'both');
    
    // 转换为时间段
    const user1Busy = user1Events.map(e => ({ 
        start: new Date(e.start).getTime(), 
        end: new Date(e.end).getTime() 
    }));
    
    const user2Busy = user2Events.map(e => ({ 
        start: new Date(e.start).getTime(), 
        end: new Date(e.end).getTime() 
    }));
    
    // 合并忙碌时间
    const allBusy = [...user1Busy, ...user2Busy].sort((a, b) => a.start - b.start);
    
    // 找出空闲时间段
    let currentTime = startOfDay.getTime();
    const freeSlots = [];
    
    allBusy.forEach(busy => {
        if (busy.start > currentTime) {
            const duration = (busy.start - currentTime) / (1000 * 60); // 分钟
            if (duration >= 30) { // 至少30分钟
                freeSlots.push({
                    start: new Date(currentTime),
                    end: new Date(busy.start),
                    duration: Math.round(duration)
                });
            }
        }
        currentTime = Math.max(currentTime, busy.end);
    });
    
    // 检查最后的时间段
    if (endOfDay.getTime() - currentTime >= 30 * 60 * 1000) {
        freeSlots.push({
            start: new Date(currentTime),
            end: endOfDay,
            duration: Math.round((endOfDay.getTime() - currentTime) / (1000 * 60))
        });
    }
    
    // 显示空闲时间
    displayFreeSlots(freeSlots);
}

// 显示空闲时间段
function displayFreeSlots(slots) {
    const container = document.getElementById('free-time-slots');
    container.innerHTML = '';
    
    if (slots.length === 0) {
        container.innerHTML = '<p>今日没有共同空闲时间</p>';
        return;
    }
    
    slots.forEach(slot => {
        const startTime = formatTime(slot.start);
        const endTime = formatTime(slot.end);
        
        const slotEl = document.createElement('div');
        slotEl.className = 'slot-item';
        slotEl.innerHTML = `
            <div>
                <strong>${startTime} - ${endTime}</strong>
                <br>
                <small>${slot.duration} 分钟</small>
            </div>
            <button class="btn btn-success" onclick="bookSlot('${slot.start.toISOString()}', '${slot.end.toISOString()}')">
                预定
            </button>
        `;
        container.appendChild(slotEl);
    });
}

// 预定空闲时间段
function bookSlot(start, end) {
    document.getElementById('event-date').value = new Date(start).toISOString().split('T')[0];
    document.getElementById('start-time').value = formatTime(new Date(start));
    document.getElementById('end-time').value = formatTime(new Date(end));
    document.getElementById('event-user').value = 'both';
    showEventForm();
}

// 工具函数
function formatTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toTimeString().substring(0, 5);
}

function showEventForm() {
    document.getElementById('event-form').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function hideEventForm() {
    document.getElementById('event-form').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function filterEventsByView(start, end) {
    const viewType = document.querySelector('.tab-btn.active').textContent;
    
    return events.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        // 时间范围过滤
        if (eventEnd < start || eventStart > end) return false;
        
        // 视图过滤
        if (viewType.includes('我的')) {
            return event.user === 'user1' || event.user === 'both';
        } else if (viewType.includes('伙伴')) {
            return event.user === 'user2' || event.user === 'both';
        }
        
        return true;
    }).map(event => ({
        id: event.id,
        title: event.title + (event.location ? ` (${event.location})` : ''),
        start: event.start,
        end: event.end,
        extendedProps: {
            user: event.user,
            location: event.location
        }
    }));
}

function updateTodayEvents() {
    const today = new Date().toDateString();
    const todayEvents = events.filter(event => 
        new Date(event.start).toDateString() === today
    );
    
    const container = document.getElementById('today-events');
    if (todayEvents.length === 0) {
        container.innerHTML = '<p>今天没有安排</p>';
        return;
    }
    
    let html = '';
    todayEvents.forEach(event => {
        const startTime = formatTime(event.start);
        const endTime = formatTime(event.end);
        html += `
            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>${startTime}-${endTime}</strong>
                <div>${event.title}</div>
                <small>${event.location || ''}</small>
            </div>
        `;
    });
    container.innerHTML = html;
}

// 本地存储函数
function saveEventsToStorage() {
    localStorage.setItem('sharedCalendarEvents', JSON.stringify(events));
    localStorage.setItem('lastUpdate', Date.now().toString());
}

function loadEvents() {
    const saved = localStorage.getItem('sharedCalendarEvents');
    if (saved) {
        events = JSON.parse(saved);
    }
}

function generateShareLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareId = localStorage.getItem('calendarShareId') || 
                    'share_' + Math.random().toString(36).substr(2, 9);
    
    localStorage.setItem('calendarShareId', shareId);
    document.getElementById('share-link').value = `${baseUrl}?share=${shareId}`;
}

function copyShareLink() {
    const input = document.getElementById('share-link');
    input.select();
    document.execCommand('copy');
    alert('链接已复制！发送给伙伴即可共享日历。');
}

// 检查分享参数
function checkShareParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    
    if (shareId) {
        // 如果是通过分享链接访问，设置为用户2
        currentUser = 'user2';
        document.querySelector('.user-badge:nth-child(1) span').textContent = '伙伴';
        document.querySelector('.user-badge:nth-child(2) span').textContent = '我';
        
        // 尝试加载共享数据
        loadSharedData(shareId);
    }
}

// 生成重复事件系列
function generateRecurringEvents(baseEvent) {
    const events = [];
    const startDate = new Date(baseEvent.start);
    const endDate = new Date(baseEvent.end);
    const duration = endDate - startDate;
    
    let count = 0;
    const maxCount = 30; // 最多生成30个重复事件
    
    while (count < maxCount) {
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        
        events.push({
            ...baseEvent,
            id: baseEvent.id + '_' + count,
            start: newStart.toISOString(),
            end: newEnd.toISOString()
        });
        
        // 根据重复规则增加日期
        switch (baseEvent.repeat) {
            case 'daily':
                startDate.setDate(startDate.getDate() + 1);
                endDate.setDate(endDate.getDate() + 1);
                break;
            case 'weekly':
                startDate.setDate(startDate.getDate() + 7);
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'monthly':
                startDate.setMonth(startDate.getMonth() + 1);
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            default:
                return events;
        }
        
        count++;
    }
    
    return events;
}

// 初始化检查分享参数
checkShareParams();