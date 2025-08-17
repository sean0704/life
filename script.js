// 更真實的 VT ETF 歷史月報酬率數據（基於實際歷史數據的模擬）
const historicalReturns = [
    0.0312, -0.0189, 0.0245, -0.0078, 0.0156, -0.0234, 0.0189, 0.0067,
    -0.0145, 0.0298, 0.0087, -0.0056, 0.0223, -0.0112, 0.0345, -0.0423,
    0.0198, 0.0134, -0.0089, 0.0267, -0.0034, 0.0156, 0.0089, -0.0198,
    0.0412, -0.0567, 0.0234, 0.0178, -0.0023, 0.0145, 0.0089, -0.0134
];

// 生命事件系統
const lifeEvents = [];

// 市場事件
const marketEvents = [
    { probability: 0.05, type: 'crash', name: '股市崩盤', impact: -0.30, description: '全球金融危機！' },
    { probability: 0.10, type: 'correction', name: '市場修正', impact: -0.15, description: '市場進入修正階段' },
    { probability: 0.15, type: 'bull', name: '牛市', impact: 0.20, description: '牛市來臨！投資大幅成長' },
    { probability: 0.03, type: 'blackswan', name: '黑天鵝', impact: -0.40, description: '黑天鵝事件發生！' }
];

// 玩家狀態
let player = {
    name: "玩家",
    age: 25,
    month: 1,
    salary: 30000,
    basicExpense: 15000,
    money: 200000,
    investCash: 0,
    monthlyInvest: 0,
    investCost: 0,
    totalMonths: 0,
    lifeStage: '單身',
    retireAge: 65,
    fireTarget: 10000000 // FIRE 目標
};

let history = {
    money: [],
    investHistory: [],
    months: [],
    events: [],
    monthlyReturns: [],
    annualReturns: []
};

let gameSpeed = 1;
let interval = null;
let currentChartType = 'wealth';

// DOM 元素
const logEl = document.getElementById("log");
const statusGrid = document.getElementById("statusGrid");
const eventsSection = document.getElementById("eventsSection");
const speedIndicator = document.getElementById("speedIndicator");
const ctx = document.getElementById("moneyChart").getContext("2d");
const toggleTimeBtn = document.getElementById("toggleTimeBtn");
const salaryInput = document.getElementById("salaryInput");
const expenseInput = document.getElementById("expenseInput");
const investInput = document.getElementById("investInput");
const allInputs = [salaryInput, expenseInput, investInput];
let moneyChart;


// 格式化金額
function formatMoney(amount) {
    return 'NT$' + Math.round(amount).toLocaleString();
}

// 格式化百分比
function formatPercent(value) {
    return (value > 0 ? '+' : '') + (value * 100).toFixed(2) + '%';
}

// 記錄功能
function log(text, type = 'info') {
    const time = player.totalMonths > 0 ? `[${player.age}歲${player.month}月]` : '[開始]';
    const prefix = type === 'event' ? '🎉 ' : type === 'warning' ? '⚠️ ' : '📝 ';
    logEl.innerText = `${time} ${prefix}${text}\n` + logEl.innerText;
}

// 更新狀態顯示
function updateStatus() {
    const netWorth = player.money + player.investCash;
    const investProfit = player.investCash - player.investCost;
    const investProfitRate = player.investCost > 0 ? (investProfit / player.investCost) : 0;
    const monthlyFlow = player.salary - player.basicExpense - player.monthlyInvest;
    const fireProgress = (netWorth / player.fireTarget * 100).toFixed(1);
    const yearsToRetire = player.retireAge - player.age;
    
    statusGrid.innerHTML = `
        <div class="status-card">
            <h4>👤 基本資訊</h4>
            <div class="value">${player.age} 歲 ${player.month} 月</div>
            <small>${player.lifeStage}</small>
        </div>
        <div class="status-card">
            <h4>💰 現金</h4>
            <div class="value">${formatMoney(player.money)}</div>
        </div>
        <div class="status-card">
            <h4>📈 投資資產</h4>
            <div class="value">${formatMoney(player.investCash)}</div>
            <small>成本: ${formatMoney(player.investCost)}</small>
        </div>
        <div class="status-card">
            <h4>💎 總淨值</h4>
            <div class="value">${formatMoney(netWorth)}</div>
        </div>
        <div class="status-card">
            <h4>📊 投資報酬</h4>
            <div class="value ${investProfit >= 0 ? 'profit' : 'loss'}">${formatMoney(investProfit)}</div>
            <small>${formatPercent(investProfitRate)}</small>
        </div>
        <div class="status-card">
            <h4>💸 月現金流</h4>
            <div class="value ${monthlyFlow >= 0 ? 'profit' : 'loss'}">${formatMoney(monthlyFlow)}</div>
        </div>
        <div class="status-card">
            <h4>🔥 FIRE 進度</h4>
            <div class="value">${fireProgress}%</div>
            <small>目標: ${formatMoney(player.fireTarget)}</small>
        </div>
        <div class="status-card">
            <h4>⏰ 距離退休</h4>
            <div class="value">${yearsToRetire} 年</div>
        </div>
    `;
}

// 完整建立圖表函式
function buildChart(type) {
    if (moneyChart) {
        moneyChart.destroy();
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 0 // 關閉動畫以提升效能
        }
    };

    if (type === 'allocation') {
        moneyChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['現金', '投資'],
                datasets: [{
                    data: [player.money, player.investCash],
                    backgroundColor: ['#ff9800', '#4caf50']
                }]
            },
            options: chartOptions
        });
    } else if (type === 'performance') {
        const perfLabels = history.annualReturns.map(item => `${item.year}歲`);
        const perfData = history.annualReturns.map(item => item.returnValue);

        moneyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: perfLabels,
                datasets: [{
                    label: '年度總報酬率',
                    data: perfData,
                    backgroundColor: perfData.map(r => r >= 0 ? '#4caf50' : '#f44336')
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    y: {
                        ticks: {
                            callback: value => formatPercent(value)
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += formatPercent(context.raw);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } else { // 'wealth'
        const wealthLabels = history.months.map(m => {
            if (m === 0) return '開始';
            const age = 25 + Math.floor((m - 1) / 12);
            const month = (m - 1) % 12 + 1;
            return `${age}歲${month}月`;
        });

        moneyChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: wealthLabels,
                datasets: [{
                    label: "總淨值",
                    data: history.money,
                    borderColor: "#667eea",
                    backgroundColor: "rgba(102, 126, 234, 0.1)",
                    fill: true,
                    tension: 0.3
                }, {
                    label: "投資資產",
                    data: history.investHistory,
                    borderColor: "#4caf50",
                    backgroundColor: "rgba(76, 175, 80, 0.1)",
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    legend: { display: true, position: 'top' },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: value => formatMoney(value) }
                    }
                }
            }
        });
    }
}

// 切換圖表
function switchChart(type, element) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    element.classList.add('active');
    currentChartType = type;
    buildChart(type);
}

// 設定輸入欄位是否可編輯
function setInputsDisabled(disabled) {
    allInputs.forEach(input => input.disabled = disabled);
}

// 安全地更新禁用中的輸入框數值
function updateDisabledInputValue(inputElement, newValue) {
    const wasDisabled = inputElement.disabled;
    if (wasDisabled) {
        inputElement.disabled = false;
    }
    inputElement.value = newValue;
    if (wasDisabled) {
        inputElement.disabled = true;
    }
}

// 贖回投資
document.getElementById("withdrawBtn").addEventListener("click", function() {
    if (interval) { // 如果時間正在跑，先暫停
        pauseTimeFlow();
    }
    const amount = prompt(`請輸入贖回金額 (可贖回: ${formatMoney(player.investCash)})`);
    if (amount && !isNaN(amount)) {
        const withdrawAmount = Math.min(parseFloat(amount), player.investCash);
        if (withdrawAmount > 0) {
            player.investCash -= withdrawAmount;
            player.money += withdrawAmount;
            player.investCost = Math.max(0, player.investCost - withdrawAmount);
            log(`贖回投資 ${formatMoney(withdrawAmount)}`, 'event');
            updateStatus();
            buildChart(currentChartType); // 重建圖表以更新贖回後的狀態
        }
    }
});

// 檢查市場事件
function checkMarketEvents() {
    marketEvents.forEach(event => {
        if (Math.random() < event.probability / 12) {
            handleMarketEvent(event);
        }
    });
}

// 處理市場事件
function handleMarketEvent(event) {
    const impact = Math.floor(player.investCash * event.impact);
    player.investCash += impact;
    
    let eventHtml = `<div class="event-notice" style="border-color: ${event.impact > 0 ? '#4caf50' : '#f44336'}">
        📈 ${event.description} 投資 ${event.impact > 0 ? '增值' : '虧損'} ${formatMoney(Math.abs(impact))}
    </div>`;
    eventsSection.innerHTML = eventHtml;
    setTimeout(() => eventsSection.innerHTML = '', 5000);
    
    log(`${event.name}: 投資${event.impact > 0 ? '獲利' : '虧損'} ${formatMoney(Math.abs(impact))}`, 'event');
}

// 每月計算
function nextMonth() {
    player.totalMonths++;
    
    if (player.month === 1 && player.age > 25) {
        // 通貨膨脹
        player.basicExpense = Math.floor(player.basicExpense * 1.03);
        log(`通膨影響：固定支出增加 3% 至 ${formatMoney(player.basicExpense)}`, 'warning');
        updateDisabledInputValue(expenseInput, player.basicExpense);

        // 年度調薪
        const raise = 0.03;
        player.salary = Math.floor(player.salary * (1 + raise));
        log(`年度調薪 ${formatPercent(raise)} 至 ${formatMoney(player.salary)}`);
        updateDisabledInputValue(salaryInput, player.salary);
    }
    
    if (player.month === 12) {
        const yearBonus = player.salary * (1 + Math.random());
        player.money += yearBonus;
        log(`年終獎金 ${formatMoney(yearBonus)}`, 'event');
    }
    
    const totalIncome = player.salary;
    const totalExpense = player.basicExpense;
    const investThisMonth = Math.min(player.monthlyInvest, player.money + totalIncome - totalExpense);
    
    const returnIndex = Math.floor(Math.random() * historicalReturns.length);
    const monthlyReturn = historicalReturns[returnIndex];
    const investReturn = Math.floor(player.investCash * monthlyReturn);
    
    const dividends = Math.floor(player.investCash * 0.002);
    
    player.money += totalIncome - totalExpense - investThisMonth;
    player.investCash += investThisMonth + investReturn + dividends;
    player.investCost += investThisMonth;
    
    if (player.totalMonths % 3 === 0) checkMarketEvents();
    
    if (player.month === 12) {
        player.age++;
        player.month = 1;
    } else {
        player.month++;
    }
    
    const netWorth = player.money + player.investCash;
    history.money.push(netWorth);
    history.investHistory.push(player.investCash);
    history.months.push(player.totalMonths);
    history.monthlyReturns.push(monthlyReturn);

    // 每年結束時計算年度報酬率
    if (player.month === 1 && player.totalMonths > 0 && player.totalMonths % 12 === 0) {
        const last12Returns = history.monthlyReturns.slice(-12);
        const annualReturn = last12Returns.reduce((acc, r) => acc * (1 + r), 1) - 1;
        history.annualReturns.push({
            year: player.age - 1, // 剛結束的那一年
            returnValue: annualReturn
        });

        if (currentChartType === 'performance') {
            buildChart('performance');
        }
    }
    
    updateStatus();
    buildChart(currentChartType);
    
    const returnStr = formatPercent(monthlyReturn);
    log(`投資 ${formatMoney(investThisMonth)}, 報酬 ${returnStr}, 淨值 ${formatMoney(netWorth)}`);
    
    if (netWorth >= player.fireTarget) {
        log(`🎉 恭喜達成 FIRE 目標！總資產 ${formatMoney(netWorth)}`, 'event');
        pauseTimeFlow();
        alert(`恭喜！您在 ${player.age} 歲達成財務自由目標！`);
    }
    
    if (player.money < 0 && player.investCash <= 0) {
        log(`⚠️ 破產警告！請調整財務策略`, 'warning');
        pauseTimeFlow();
    }
}

// 時間控制
function startTimeFlow() {
    if (interval) return;
    const speed = gameSpeed === 1 ? 1000 : gameSpeed === 2 ? 500 : 200;
    interval = setInterval(nextMonth, speed);
    toggleTimeBtn.innerHTML = "⏸️ 暫停時間";
    setInputsDisabled(true);
}

function pauseTimeFlow() {
    clearInterval(interval);
    interval = null;
    toggleTimeBtn.innerHTML = "▶️ 繼續時間";
    setInputsDisabled(false);
}

// 事件監聽
toggleTimeBtn.addEventListener("click", () => {
    if (interval) {
        pauseTimeFlow();
    } else {
        startTimeFlow();
    }
});

document.getElementById("speedControl").addEventListener("click", function() {
    gameSpeed = gameSpeed === 1 ? 2 : gameSpeed === 2 ? 4 : 1;
    speedIndicator.textContent = `速度: ${gameSpeed}x`;
    if (interval) { // 如果正在運行，則重設間隔以更新速度
        pauseTimeFlow();
        startTimeFlow();
    }
});

salaryInput.addEventListener("change", (e) => {
    player.salary = parseFloat(e.target.value) || 0;
    log(`薪水更新為: ${formatMoney(player.salary)}`);
    updateStatus();
});

expenseInput.addEventListener("change", (e) => {
    player.basicExpense = parseFloat(e.target.value) || 0;
    log(`固定支出更新為: ${formatMoney(player.basicExpense)}`);
    updateStatus();
});

investInput.addEventListener("change", (e) => {
    const newInvest = parseFloat(e.target.value) || 0;
    if (newInvest < 0) {
        alert("投資金額不能為負數");
        e.target.value = player.monthlyInvest; // 還原為舊值
        return;
    }
    player.monthlyInvest = newInvest;
    log(`每月投資更新為: ${formatMoney(player.monthlyInvest)}`);
    updateStatus();
});


// 初始化
function init() {
    // 重置為初始狀態
    history.money = [player.money + player.investCash];
    history.investHistory = [player.investCash];
    history.months = [0];
    history.monthlyReturns = [];
    history.annualReturns = [];
    log("遊戲開始！25歲的你開始投資理財之旅");
    
    updateStatus();
    buildChart(currentChartType);
    startTimeFlow();
}

init();