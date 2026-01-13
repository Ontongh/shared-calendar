// sync.js - 使用ShareDB或类似技术进行数据同步
// 或者使用简单的轮询+localStorage同步

// 方法1: 使用WebSocket进行实时同步
function initWebSocketSync() {
    const ws = new WebSocket('wss://your-websocket-server.com');
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'events_update') {
            events = data.events;
            calendar.refetchEvents();
            updateTodayEvents();
        }
    };
    
    // 发送本地更新
    function sendUpdate() {
        ws.send(JSON.stringify({
            type: 'events_update',
            events: events,
            userId: currentUser
        }));
    }
    
    // 监听本地存储变化
    window.addEventListener('storage', function(e) {
        if (e.key === 'sharedCalendarEvents') {
            events = JSON.parse(e.newValue);
            calendar.refetchEvents();
        }
    });
}

// 方法2: 简单轮询（对小型应用足够）
function initPollingSync() {
    setInterval(() => {
        const lastUpdate = localStorage.getItem('lastUpdate');
        const lastLocalUpdate = localStorage.getItem('localLastUpdate');
        
        if (lastUpdate && lastLocalUpdate !== lastUpdate) {
            // 数据有更新，重新加载
            loadEvents();
            calendar.refetchEvents();
            localStorage.setItem('localLastUpdate', lastUpdate);
        }
    }, 3000); // 每3秒检查一次
}

// 启动同步
if (window.location.search.includes('share')) {
    initPollingSync();
}