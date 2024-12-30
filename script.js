
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, get, update, push, set, onChildAdded } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
import { off } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";
// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyA2GwJ4rH-_iLnk5edGC3vYRBKt1LILCs0",
    authDomain: "finaldatabase-27e57.firebaseapp.com",
    databaseURL: "https://finaldatabase-27e57-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "finaldatabase-27e57",
    storageBucket: "finaldatabase-27e57.appspot.com",
    messagingSenderId: "965520226790",
    appId: "1:965520226790:web:b5584430d510f8b30c3e27"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 多語系資料
const languages = {
    en: {
        title: "RFID Management System",
        scanCard: "Scan Card",
        deposit: "Deposit",
        checkBalance: "Check Balance",
        pay: "Pay",
        enter: "Enter",
        exit: "Exit",
        createCard: "Create Card",
        success: "Success",
        error: "Error",
        cardID: "Card ID",
        cardName: "Card Holder Name",
        amount: "Amount",
        balance: "Balance",
        transactionHistory: "Transaction History",
    },
    zh: {
        title: "RFID 管理系統",
        scanCard: "門禁驗票",
        deposit: "儲值功能",
        checkBalance: "查詢餘額",
        pay: "消費支付",
        enter: "進場",
        exit: "出場",
        createCard: "創建卡片",
        success: "成功",
        error: "錯誤",
        cardID: "卡號",
        cardName: "持卡人姓名",
        amount: "金額",
        balance: "餘額",
        transactionHistory: "交易紀錄",
    }
};

let currentLang = "zh"; // 預設為中文



// 頁面載入時初始化語言
window.onload = () => {
    changeLanguage(currentLang);
    loadTransactionHistory(); // 載入交易紀錄
};
// 語音播報功能
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
}
// 儲值功能
async function depositAmount(cardID, amount) {
    if (amount <= 0 || isNaN(amount)) {
        document.getElementById("deposit-status").innerText = languages[currentLang].error + ": 請輸入有效的金額！";
        speak(languages[currentLang].error + ": 請輸入有效的金額！");
        return;
    }

    const cardRef = ref(database, `rfid_cards/${cardID}`);
    const snapshot = await get(cardRef);

    if (snapshot.exists()) {
        const cardData = snapshot.val();
        const newBalance = (cardData.balance || 0) + amount;

        // 更新卡片的餘額
        await update(cardRef, {
            balance: newBalance
        });
        // 記錄儲值交易
        const transactionsRef = ref(database, `transactions/${cardID}`);
        const newTransactionRef = push(transactionsRef);
        await set(newTransactionRef, {
            type: 'Deposit',
            amount: amount,
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log("Transaction successfully added!");
        }).catch((error) => {
            console.error("Error adding transaction: ", error);
        });

        document.getElementById("deposit-status").innerText = `${languages[currentLang].success}！新的餘額為：${newBalance} 元`;
        speak("儲值" + `${languages[currentLang].success}！新的餘額為：${newBalance} 元`);
    } else {
        document.getElementById("deposit-status").innerText = languages[currentLang].error + ": 無效的 RFID 卡片！";
        speak(`${languages[currentLang].error}：餘額不足，無法完成消費！`);
    }
}

// 門禁驗票功能
async function handleRFIDScan(cardID) {
    const cardRef = ref(database, `rfid_cards/${cardID}`);
    const snapshot = await get(cardRef);

    if (snapshot.exists()) {
        const cardData = snapshot.val();
        const currentTime = new Date().toISOString();

        if (cardData.status === "in") {
            // 更新狀態為 "out"
            await update(cardRef, {
                status: "out",
                entry_time: null
            });
            document.getElementById("scan-status").innerText = `${languages[currentLang].exit} 成功，${cardData.name}`;
            speak(languages[currentLang].exit + ": 成功" + cardData.name);
        } else {
            // 更新狀態為 "in"
            await update(cardRef, {
                status: "in",
                entry_time: currentTime
            });
            document.getElementById("scan-status").innerText = `${languages[currentLang].enter} 成功，${cardData.name}`;
            speak(languages[currentLang].enter + ": 成功" + cardData.name);
        }
    } else {
        document.getElementById("scan-status").innerText = languages[currentLang].error + ": 無效的 RFID 卡片！";
        speak(languages[currentLang].error + ": 無效的 RFID 卡片！");
    }
}

// 查詢餘額功能
async function checkBalance(cardID) {
    const cardRef = ref(database, `rfid_cards/${cardID}`);
    const snapshot = await get(cardRef);

    if (snapshot.exists()) {
        const cardData = snapshot.val();
        const balance = cardData.balance || 0;
        document.getElementById("balance-status").innerText = `${languages[currentLang].balance}：${balance} 元`;
        speak(`餘額為：${balance} 元`);
    } else {
        document.getElementById("balance-status").innerText = languages[currentLang].error + ": 無效的 RFID 卡片！";
        speak(languages[currentLang].error + ": 無效的 RFID 卡片！");
    }
}

// 消费支付功能
async function payAmount(cardID, amount) {
    if (amount <= 0 || isNaN(amount)) {
        document.getElementById("status").innerText = languages[currentLang].error + ": 請輸入有效的消費金額！";
        speak(languages[currentLang].error + ": 請輸入有效的消費金額！");
        return;
    }

    const cardRef = ref(database, `rfid_cards/${cardID}`);
    const snapshot = await get(cardRef);

    if (snapshot.exists()) {
        const cardData = snapshot.val();
        const currentBalance = cardData.balance || 0;

        // 檢查餘額是否足夠
        if (currentBalance >= amount) {
            const newBalance = currentBalance - amount;

            // 更新卡片餘額
            await update(cardRef, {
                balance: newBalance
            });

            // 記錄消費交易
            const transactionsRef = ref(database, `transactions/${cardID}`);
            const newTransactionRef = push(transactionsRef);
            await set(newTransactionRef, {
                type: 'Payment',
                amount: amount,
                timestamp: new Date().toISOString()
            });

            document.getElementById("pay-status").innerText = `${languages[currentLang].success}！新的餘額為：${newBalance} 元`;
            speak("消費" + `${languages[currentLang].success}！新的餘額為：${newBalance} 元`);
        } else {
            document.getElementById("pay-status").innerText = `${languages[currentLang].error}：餘額不足，無法完成消費！`;
            speak(`${languages[currentLang].error}：餘額不足，無法完成消費！`);
        }
    } else {
        document.getElementById("pay-status").innerText = languages[currentLang].error + ": 無效的 RFID 卡片！";
        speak(`${languages[currentLang].error}：無效的 RFID 卡片！`);
    }
}
// 顯示交易紀錄（使用表格格式）
function loadTransactionHistory(cardID, selectedDate = null) {
    const transactionTable = document.querySelector("#transaction-history tbody");
    transactionTable.innerHTML = ''; // 清空表格內容

    const transactionsRef = ref(database, `transactions/${cardID}`);
    off(transactionsRef); // 確保事件不重複綁定

    onChildAdded(transactionsRef, (snapshot) => {
        const transaction = snapshot.val();
        const timestamp = transaction.timestamp
            ? new Date(transaction.timestamp).toLocaleString('zh-TW', {
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false  // 使用 24 小時制，去除上午/下午
            })
            : "未知時間";

        // 格式化 Firebase 儲存的時間戳為 YYYY/MM/DD 格式
        const transactionDate = new Date(transaction.timestamp);
        const formattedTransactionDate = transactionDate.toLocaleDateString('zh-TW'); // 取得 YYYY/MM/DD 格式

        // 格式化選擇的日期為 YYYY/MM/DD
        const formattedSelectedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('zh-TW') : null;

        // 如果有選擇日期，根據日期篩選交易紀錄
        if (formattedSelectedDate && formattedTransactionDate !== formattedSelectedDate) {
            return; // 若日期不符合，跳過此筆交易
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${transaction.type}</td>
            <td>${transaction.amount}$</td>
            <td>${timestamp}</td>
        `;
        transactionTable.appendChild(row);
    });
}

// 當進行掃描或其他功能時，重新載入該卡片的交易紀錄
document.getElementById("scan-button").addEventListener("click", () => {
    const cardID = document.getElementById("scan-card-id").value.trim();
    if (cardID) {
        handleRFIDScan(cardID);
        loadTransactionHistory(cardID); // 重新載入該卡片的交易紀錄
    } else {
        document.getElementById("scan-status").innerText = "請輸入有效的卡號！";
        speak("請輸入有效的卡號！");
    }
});

// 按下篩選日期按鈕時，載入選擇日期的交易紀錄
document.getElementById("filter-date-button").addEventListener("click", () => {
    const cardID = document.getElementById("scan-card-id").value.trim();
    const selectedDate = document.getElementById("transaction-date-picker").value; // 取得選擇的日期（YYYY-MM-DD 格式）

    if (cardID) {
        loadTransactionHistory(cardID, selectedDate); // 根據選擇的日期過濾交易紀錄
    } else {
        document.getElementById("scan-status").innerText = "請輸入有效的卡號！";
        speak("請輸入有效的卡號！");
    }
});

// 儲值按鈕事件
document.getElementById("deposit-button").addEventListener("click", () => {
    const cardID = document.getElementById("deposit-card-id").value.trim();
    const amount = parseFloat(document.getElementById("deposit-amount").value.trim());

    if (cardID && amount) {
        depositAmount(cardID, amount);
        loadTransactionHistory(cardID); // 重新載入該卡片的交易紀錄
    } else {
        document.getElementById("deposit-status").innerText = "請輸入有效的卡號和金額！";
    }
});


// 查詢餘額事件監聽
document.getElementById("check-balance-button").addEventListener("click", () => {
    const cardID = document.getElementById("check-balance-card-id").value.trim();
    if (cardID) {
        checkBalance(cardID);
    } else {
        document.getElementById("balance-status").innerText = "請輸入有效的卡號！";
    }
});

document.getElementById("pay-button").addEventListener("click", () => {
    const cardID = document.getElementById("pay-card-id").value.trim();
    const amount = parseFloat(document.getElementById("pay-amount").value.trim());
    if (cardID && amount) {
        payAmount(cardID, amount);
        loadTransactionHistory(cardID); // 重新載入該卡片的交易紀錄
    } else {
        document.getElementById("pay-status").innerText = "請輸入有效的卡號和消費金額！";
    }
});


// 切換語言
document.getElementById("lang-en").addEventListener("click", () => changeLanguage("en"));
document.getElementById("lang-zh").addEventListener("click", () => changeLanguage("zh"));
