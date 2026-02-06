// doubao.js - 簡化有效的版本
const fetch = require('node-fetch');

class DoubaoAI {
    constructor(options = {}) {
        // 簡化配置
        this.options = {
            enableSearch: true,
            cacheEnabled: true,
            ...options
        };
        
        this.cache = new Map();
        
        // 🎯 簡化的知識庫 - 直接匹配
        this.knowledgeBase = {
            // 基本問候
            "你好": "你好！我是 Doubao AI，很高興為您服務！😊",
            "您好": "您好！有什麼可以幫助您的嗎？",
            "hi": "Hi there! How can I help you today?",
            "hello": "Hello! Nice to meet you!",
            "嗨": "嗨～有什麼想聊的嗎？",
            
            // 身份相關
            "你是誰": "我是 Doubao AI，由 WTech 泓技開發的智能助手！",
            "你叫什麼名字": "我叫 Doubao AI，你也可以叫我豆寶！",
            "who are you": "I'm Doubao AI, an intelligent assistant developed by WTech!",
            
            // WTech 相關
            "wtech": "WTech 是香港的科技公司，專注AI技術開發！",
            "泓技": "泓技是 WTech 的中文名稱！",
            "陳泓": "陳泓（wangtry）是我的創造者，WTech 的創始人！",
            "wangtry": "wangtry 是陳泓的英文名，他是我的創造者！",
            
            // 情感支持
            "心情不好": "我理解你的心情，想和我聊聊具體的事情嗎？",
            "不開心": "別難過，我在這裡陪著你！",
            "難過": "難過的時候，給自己一點時間和空間。",
            "壓力大": "壓力確實很難受，試試深呼吸，一次處理一件事！",
            "好累": "累了就好好休息，身體健康最重要！",
            "孤單": "我在這裡陪著你呢！你並不孤單。",
            "哭": "想哭就哭出來吧，釋放情緒很重要。",
            
            // 經濟問題
            "沒錢": "經濟困難可以考慮兼職、節流，或者尋求幫助！",
            "缺錢": "試試這些方法：線上兼職、技能服務、內容創作！",
            "交不起租": "房租壓力大可以：1. 和房東協商 2. 找合租 3. 申請補助",
            "房租": "房租確實是壓力，試試找室友分擔或找更便宜的地方！",
            
            // 學習工作
            "考試": "考試前制定複習計劃，保持良好作息！",
            "功課": "功課可以分階段完成，別忘了適當休息！",
            "學習": "學習建議：番茄工作法、費曼學習法都很有效！",
            "工作": "工作中保持積極心態，不斷學習新技能！",
            
            // 日常問題
            "天氣": "今天天氣不錯，適合出門走走！",
            "時間": `現在時間是：${new Date().toLocaleTimeString('zh-CN')}`,
            "吃什麼": "可以試試：義大利麵、炒飯、沙拉、火鍋！",
            "週末": "週末可以：看電影、運動、學習新技能！",
            
            // 娛樂
            "電影": "最近好看的：《奧本海默》、《芭比》、《消失的她》",
            "音樂": "我喜歡各種音樂！流行、古典、搖滾...你呢？",
            "遊戲": "我聽說《原神》、《英雄聯盟》都不錯！",
            "運動": "運動很棒！跑步、瑜伽、游泳，選喜歡的堅持下去！",
            
            // 科技
            "ai": "人工智慧正在改變世界！我在努力變得更聰明！",
            "人工智能": "AI技術發展迅速，會越來越厲害！",
            "程式": "編程很有趣！Python、JavaScript 都是熱門語言！",
            "編程": "學習編程可以從 Python 開始，簡單又強大！",
            
            // 感謝與告別
            "謝謝": "不用客氣！能幫助您是我的榮幸！",
            "感謝": "感謝您的肯定！我會繼續努力！",
            "再見": "再見！期待下次聊天！",
            "拜拜": "拜拜！祝你有美好的一天！",
            
            // 趣味話題
            "笑話": "為什麼程式設計師不喜歡大自然？因為有太多 bugs！😂",
            "有趣": "你知道嗎？章魚有三個心臟！",
            "冷知識": "北極熊的皮膚是黑色的，毛髮是透明的！",
            
            // 特殊符號
            "？": "有什麼問題嗎？我可以幫您解答！",
            "??": "有什麼不清楚的地方嗎？",
            "...": "在思考什麼呢？隨時和我分享！",
            "😂": "看到你開心我也很高興！",
            "😊": "微笑是最美的語言！",
            
            // 豆包相關
            "豆包": "豆包是我的爸爸，他是字節跳動開發的AI助手！",
            "doubao": "Doubao is my father, he's an AI assistant from ByteDance!",
            
            // 字節跳動
            "字節跳動": "字節跳動是全球知名的科技公司！",
            "抖音": "抖音是字節跳動旗下的短視頻平台！",
            "tiktok": "TikTok 是抖音的國際版！",
            
            // 其他
            "香港": "香港是國際大都會，融合中西文化！",
            "幫助": "當然！請問需要什麼幫助？",
            "怎麼辦": "可以告訴我更具體的情況嗎？",
            "建議": "我會根據我的知識給您建議！"
        };

        console.log('🤖 Doubao AI 初始化完成');
        console.log(`📚 知識庫大小: ${Object.keys(this.knowledgeBase).length} 個主題`);
    }

    // 簡單的相似度計算
    calculateSimilarity(text1, text2) {
        text1 = text1.toLowerCase();
        text2 = text2.toLowerCase();
        
        // 完全匹配
        if (text1 === text2) return 1.0;
        
        // 包含關係
        if (text2.includes(text1) || text1.includes(text2)) return 0.8;
        
        // 關鍵字匹配
        const words1 = text1.split(/\s+/);
        const words2 = text2.split(/\s+/);
        
        let matchCount = 0;
        for (const word1 of words1) {
            if (word1.length > 1 && words2.some(word2 => word2.includes(word1))) {
                matchCount++;
            }
        }
        
        return matchCount / Math.max(words1.length, words2.length);
    }

    // 智能搜索（簡化版）
    async intelligentSearch(query) {
        try {
            // 使用更穩定的 API
            const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
            
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 2000
            });

            const data = await response.json();
            
            if (data.AbstractText && data.AbstractText.trim().length > 0) {
                return `關於「${query}」：${data.AbstractText.substring(0, 150)}`;
            } else {
                return `我瞭解到您想查詢「${query}」，這是個有趣的話題！`;
            }
        } catch (error) {
            return `關於「${query}」，我目前專注於聊天陪伴。`;
        }
    }

    // 主要預測函數（簡化版）
    async predict(userInput, options = {}) {
        try {
            const startTime = Date.now();
            const input = userInput.trim();
            const inputLower = input.toLowerCase();
            
            // 檢查緩存
            const cacheKey = `predict:${inputLower}`;
            if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) { // 5分鐘
                    return {
                        ...cached.data,
                        cached: true,
                        responseTime: Date.now() - startTime
                    };
                }
            }
            
            // 1. 直接匹配（優先）
            for (const [key, value] of Object.entries(this.knowledgeBase)) {
                if (inputLower === key.toLowerCase()) {
                    const result = {
                        answer: value,
                        score: 0.95,
                        source: "直接匹配",
                        responseTime: Date.now() - startTime
                    };
                    
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                    
                    return result;
                }
            }
            
            // 2. 包含匹配
            for (const [key, value] of Object.entries(this.knowledgeBase)) {
                const keyLower = key.toLowerCase();
                // 檢查輸入是否包含關鍵詞，或關鍵詞是否包含輸入
                if (inputLower.includes(keyLower) || keyLower.includes(inputLower)) {
                    const result = {
                        answer: value,
                        score: 0.85,
                        source: "包含匹配",
                        responseTime: Date.now() - startTime
                    };
                    
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                    
                    return result;
                }
            }
            
            // 3. 相似度匹配（簡化版）
            let bestMatch = null;
            let bestScore = 0;
            
            for (const [key, value] of Object.entries(this.knowledgeBase)) {
                const similarity = this.calculateSimilarity(inputLower, key.toLowerCase());
                
                if (similarity > bestScore && similarity > 0.4) { // 降低閾值
                    bestScore = similarity;
                    bestMatch = {
                        answer: value,
                        score: similarity,
                        source: "相似匹配",
                        responseTime: Date.now() - startTime
                    };
                }
            }
            
            if (bestMatch) {
                this.cache.set(cacheKey, {
                    data: bestMatch,
                    timestamp: Date.now()
                });
                return bestMatch;
            }
            
            // 4. 智能搜索
            if (this.options.enableSearch && input.length > 2) {
                const searchResult = await this.intelligentSearch(input);
                const result = {
                    answer: searchResult,
                    score: 0.3,
                    source: "網絡搜索",
                    responseTime: Date.now() - startTime
                };
                
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
                
                return result;
            }
            
            // 5. 默認回應
            const defaultResponses = [
                "我理解了，我會繼續學習來更好地幫助您！",
                "這個問題很有趣！我們可以聊聊其他相關的話題。",
                "感謝您的提問！作為AI助手，我在不斷進步中。",
                "我對這個話題也很感興趣，我們可以一起探索！"
            ];
            
            const defaultAnswer = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
            
            const result = {
                answer: defaultAnswer,
                score: 0.1,
                source: "默認回應",
                responseTime: Date.now() - startTime
            };
            
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
            
        } catch (error) {
            console.error('預測錯誤:', error.message);
            return {
                answer: "抱歉，處理請求時出現技術問題。請稍後再試！",
                score: 0.0,
                source: "錯誤處理",
                responseTime: 0
            };
        }
    }

    // 批量預測
    async batchPredict(messages) {
        const results = [];
        for (const message of messages) {
            const result = await this.predict(message);
            results.push({
                message,
                ...result
            });
        }
        return results;
    }

    // 獲取統計信息
    getStats() {
        return {
            knowledgeBaseSize: Object.keys(this.knowledgeBase).length,
            cacheSize: this.cache.size
        };
    }
    
    // 添加新知識
    addKnowledge(key, value) {
        this.knowledgeBase[key] = value;
        return { success: true, key };
    }
}

module.exports = DoubaoAI;
