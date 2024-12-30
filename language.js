document.addEventListener('DOMContentLoaded', () => {
    const langButtons = document.querySelectorAll('.lang-button');
    let currentLang = 'zh';  // 預設語言

    // 設定語言切換事件
    langButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            currentLang = event.target.id === 'lang-en' ? 'en' : 'zh';
            loadLanguage(currentLang);
        });
    });

    // 載入語言資料
    function loadLanguage(lang) {
        fetch(`lang-${lang}.json`)
            .then(response => response.json())
            .then(data => {
                // 更新所有有 data-lang 屬性的元素
                document.querySelectorAll('[data-lang]').forEach(element => {
                    const key = element.getAttribute('data-lang');
                    if (data[key]) {
                        // 如果元素有 textContent，更新其文本
                        if (element.textContent !== undefined) {
                            element.textContent = data[key];
                        }
                        // 如果元素有 placeholder 屬性，更新其 placeholder
                        if (element.hasAttribute('placeholder')) {
                            element.setAttribute('placeholder', data[key]);
                        }
                    }
                });
            })
            .catch(error => console.error('Error loading language file:', error));
    }

    // 頁面載入時初始化語言
    loadLanguage(currentLang);
});