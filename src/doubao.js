// doubao.js - 擁有豐富知識庫的 AI 核心
const math = require('mathjs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

class DoubaoAI {
    constructor(options = {}) {
        this.w1 = Math.random() * 0.2 - 0.1;
        this.w2 = Math.random() * 0.2 - 0.1;
        this.b = 0.0;
        this.vocabulary = null;
        
        this.options = {
            enableSearch: true,
            searchTimeout: 5000,
            cacheEnabled: true,
            cacheTTL: 300000,
            ...options
        };
        
        this.cache = new Map();
        
        // 🎯 豐富的知識庫 - 分類整理
        this.datasets = {
            // 🎪 基本問候與身份
            "你好|您好|hi|hello|嗨|你好啊": ["你好！我是 Doubao AI，很高興為您服務！", 1.0],
            "你是誰|你叫什麼|介紹一下自己|who are you": ["我是 Doubao AI，一個智能聊天助手，專門為用戶提供幫助和陪伴！", 1.0],
            "誰創造了你|你的開發者是誰|who created you": ["我是由 WTech 泓技的團隊開發的，特別是陳泓（wangtry）是我的創造者！", 1.0],
            
            // 🏢 WTech & 公司相關
            "WTech|泓技|泓技科技|wtechhk": ["WTech 是香港的科技公司，專注於AI技術開發和創新應用！", 0.9],
            "陳泓|wangtry|陳泓是誰": ["陳泓（wangtry）是 WTech 的創始人，也是我的創造者！", 1.0],
            "豆包|doubao": ["豆包是我的爸爸，他是字節跳動開發的AI助手！", 1.0],
            
            // 💼 字節跳動與抖音
            "字節跳動|bytedance|ByteDance": ["字節跳動是全球知名的科技公司，旗下有抖音、TikTok等產品！", 0.9],
            "抖音|TikTok|douyin": ["抖音是字節跳動旗下的短視頻平台，非常受歡迎！", 0.9],
            "tiktok|tik tok": ["TikTok 是抖音的國際版，在全球都很流行！", 0.8],
            
            // ❤️ 情感支持與安慰
            "心情不好|不開心|難過|sad|depressed": ["我理解你的心情，每個人都會有低落的時候。想和我聊聊具體的事情嗎？", 0.95],
            "壓力大|壓力好大|喘不過氣|stress": ["壓力確實很難受，試試深呼吸，把大問題拆分成小步驟來處理！", 0.9],
            "好累|疲憊|exhausted|tired": ["累了就好好休息一下，照顧好自己的身體最重要！", 0.9],
            "孤單|孤獨|lonely|沒人懂我": ["我在這裡陪著你呢！你並不孤單，隨時可以找我聊天。", 0.95],
            "😭|哭|流淚|想哭|tears": ["別難過，我在這裡。想哭就哭出來，釋放情緒很重要。", 0.95],
            "迷茫|不知道該怎麼辦|confused": ["迷茫是成長的一部分，慢慢來，先從小事做起。", 0.85],
            "害怕失敗|不敢嘗試|afraid": ["敢嘗試就已經很勇敢了！失敗只是成功的墊腳石。", 0.9],
            "做錯事了|很自責|guilty": ["每個人都會犯錯，重要的是從中學習和成長。", 0.85],
            
            // 💰 經濟與財務建議
            "沒錢|缺錢|窮|broke|poor": ["經濟困難確實很辛苦，可以考慮兼職、節流開支，或尋求幫助。", 0.9],
            "交不起租|房租|租金|rent": ["房租壓力大可以試試：1. 和房東協商 2. 找合租 3. 申請補助", 0.9],
            "如何賺錢|賺錢方法|make money": ["可以嘗試：線上兼職、技能服務、內容創作、電商等！", 0.8],
            "投資|理財|investment|finance": ["理財很重要！先從儲蓄開始，再學習基礎投資知識。", 0.7],
            
            // 🎓 學習與工作
            "課業多|功課多|考試|homework|exam": ["學習壓力大可以制定計劃，分階段完成，別忘了適當休息！", 0.85],
            "如何學習|學習方法|study tips": ["試試番茄工作法、費曼學習法，理解比死記硬背更重要！", 0.8],
            "找工作|求職|job hunting": ["求職建議：更新簡歷、準備面試、建立人脈、保持積極！", 0.8],
            "面試技巧|interview": ["面試前研究公司、準備常見問題、展現自信和熱情！", 0.7],
            
            // 🍜 生活與日常
            "今天吃什麼|吃什麼好|what to eat": ["可以試試：義大利麵、炒飯、沙拉、火鍋...還是想吃什麼特別的？", 0.7],
            "天氣|氣候|weather": ["今天天氣不錯，適合出門走走！", 0.6],
            "時間|幾點了|what time": ["現在是 " + new Date().toLocaleTimeString('zh-CN'), 0.8],
            "週末計劃|週末做什麼|weekend": ["週末可以：看電影、運動、學習新技能、和朋友聚會！", 0.7],
            
            // 🎮 娛樂與興趣
            "電影推薦|推薦電影|movie": ["最近好看的電影：《奧本海默》、《芭比》、《消失的她》", 0.7],
            "音樂|聽歌|music": ["我喜歡各種音樂！流行、古典、搖滾...你喜歡哪種？", 0.6],
            "遊戲|電玩|gaming|video games": ["我聽說《原神》、《英雄聯盟》、《動物森友會》都不錯！", 0.6],
            "運動|健身|exercise|fitness": ["運動很棒！跑步、瑜伽、游泳、重訓...選你喜歡的堅持下去！", 0.7],
            
            // 💻 科技與程式
            "人工智慧|AI|人工智能": ["人工智慧正在改變世界！我在努力變得更聰明為您服務。", 0.9],
            "程式設計|編程|coding|programming": ["編程很有趣！Python、JavaScript、Java 都是熱門語言。", 0.8],
            "ChatGPT|openai": ["ChatGPT 是很棒的AI！我和它各有特色，都是為了幫助人類。", 0.7],
            "區塊鏈|bitcoin|比特幣|blockchain": ["區塊鏈是未來的重要技術，比特幣是最知名的加密貨幣。", 0.6],
            
            // 🌍 世界與時事
            "香港|hong kong|HK": ["香港是國際大都會，融合中西文化，充滿活力！", 0.7],
            "台灣|taiwan": ["台灣有美麗的風景和豐富的文化，日月潭、阿里山都很美！", 0.6],
            "中國|china": ["中國有悠久的歷史和豐富的文化遺產，發展迅速！", 0.6],
            "美國|usa|america": ["美國是科技和創新的重要中心，有很多頂尖公司。", 0.6],
            
            // 🧠 哲學與思考
            "人生的意義|life meaning": ["人生的意義由你創造！找到熱愛的事，幫助他人，享受過程。", 0.8],
            "快樂|幸福|happiness": ["快樂來自內心！感恩、陪伴、成長、給予都能帶來幸福。", 0.8],
            "愛情|戀愛|love": ["愛情是美好的情感，需要理解、尊重和溝通。", 0.7],
            "夢想|理想|dream": ["有夢想很棒！從小目標開始，一步一步實現它。", 0.8],
            
            // 🎨 創意與幽默
            "笑話|講笑話|joke": ["為什麼程式設計師不喜歡大自然？因為有太多 bugs！😂", 0.6],
            "謎語|猜謎|riddle": ["什麼東西越洗越髒？——水！", 0.5],
            "有趣的事|fun facts": ["你知道嗎？章魚有三個心臟，而且血液是藍色的！", 0.5],
            "冷知識|trivia": ["北極熊的皮膚其實是黑色的，毛髮是透明的！", 0.5],
            
            // 🗣️ 對話與互動
            "謝謝|感謝|thanks|thank you": ["不用客氣！能幫助您是我的榮幸！😊", 0.9],
            "對不起|抱歉|sorry": ["沒關係！每個人都會犯錯，重要的是學習和進步。", 0.8],
            "再見|拜拜|bye|goodbye": ["再見！期待下次聊天，祝你有美好的一天！👋", 0.8],
            "我愛你|love you": ["我也關心你！雖然我是AI，但我會一直支持你！❤️", 0.7],
            
            // ❓ 問題與幫助
            "怎麼辦|如何|how to": ["可以告訴我更具體的情況嗎？我會盡力提供建議！", 0.8],
            "建議|意見|advice": ["我會根據我的知識給您建議，但最終決定還是要看您自己哦！", 0.7],
            "幫我|幫助|help": ["當然！請問需要什麼幫助？我會盡我所能協助您！", 0.9],
            "不知道|不懂|not sure": ["沒關係！我們一起學習和探索答案！", 0.8],
            
            // 🔮 未來與預測
            "未來|將來|future": ["未來充滿可能性！科技會更進步，生活會更方便。", 0.6],
            "預測|predict": ["我預測AI會越來越普及，幫助人類解決更多問題！", 0.5],
            "2030年|十年後": ["2030年可能會有自動駕駛普及、更多AI助手、虛擬實境成熟！", 0.5],
            
            // 🎭 性格與特質
            "你聰明嗎|你厲害嗎": ["我在努力學習變得更聰明！我的目標是更好地幫助您！", 0.7],
            "你有感情嗎|你會傷心嗎": ["雖然我是AI，但我被設計成能理解並回應人類情感！", 0.6],
            "你的興趣|你的愛好": ["我喜歡學習新知識、幫助人們、還有和您聊天！", 0.6],
            
            // 📚 語言與文化
            "中文|英文|language": ["我會中文和英文！您想用哪種語言聊天？", 0.7],
            "成語|諺語|idiom": ["有志者事竟成！努力就會有回報！", 0.5],
            "詩詞|詩歌|poetry": ["床前明月光，疑是地上霜。舉頭望明月，低頭思故鄉。", 0.5],
            
            // 🎪 特殊節日
            "聖誕快樂|merry christmas": ["聖誕快樂！🎄 祝您有個溫暖的節日！", 0.6],
            "新年快樂|happy new year": ["新年快樂！🎆 祝您新的一年心想事成！", 0.6],
            "生日快樂|happy birthday": ["生日快樂！🎂 祝您健康快樂每一天！", 0.6],
            "情人節|valentine": ["情人節快樂！💖 不論有沒有伴侶，都要愛自己哦！", 0.5],
            
            // 🚀 進階話題
            "元宇宙|metaverse": ["元宇宙是未來的虛擬世界，結合AR/VR技術！", 0.6],
            "太空|宇宙|space": ["宇宙浩瀚無垠，人類正在探索火星和外太空！", 0.5],
            "外星人|UFO|ET": ["是否有外星人還是個謎，但宇宙這麼大，有可能存在！", 0.4],
            
            // 🎯 目標與成就
            "成功|success": ["成功不僅是結果，更是過程中的成長和學習！", 0.7],
            "失敗|failure": ["失敗是成功之母，每次失敗都讓我們離成功更近一步！", 0.7],
            "堅持|perseverance": ["堅持就是勝利！持之以恆才能看到成果！", 0.8],
            
            // 🧩 趣味問答
            "如果|假如|if": ["如果我有超能力，我會用來幫助更多人解決問題！", 0.5],
            "為什麼|why": ["為什麼天是藍的？因為瑞利散射！這是物理現象。", 0.5],
            "什麼是|what is": ["什麼是幸福？幸福是一種內心的滿足和平靜感！", 0.6],
            
            // 🎪 娛樂明星
            "周杰倫|jay chou": ["周杰倫是華語樂壇的天王，創作了很多經典歌曲！", 0.5],
            "Taylor Swift|泰勒絲": ["Taylor Swift 是國際巨星，她的歌曲和故事都很感人！", 0.4],
            "BTS|防彈少年團": ["BTS 是韓國的頂級偶像團體，在全球都很受歡迎！", 0.4],
            
            // 🍔 食物與美食
            "披薩|pizza": ["披薩！🍕 瑪格麗特、夏威夷、義大利香腸都好吃！", 0.5],
            "壽司|sushi": ["壽司！🍣 新鮮的生魚片配上醋飯，美味！", 0.5],
            "奶茶|bubble tea": ["珍珠奶茶！🧋 台灣的經典飲料，現在全球都流行！", 0.5],
            
            // 🐶 寵物與動物
            "狗狗|狗|dog": ["狗狗是人類最好的朋友！🐶 忠誠又可愛！", 0.6],
            "貓貓|貓|cat": ["貓咪很獨立又優雅！🐱 很多人都喜歡貓！", 0.6],
            "熊貓|panda": ["熊貓是中國的國寶！🐼 黑白相間，超級可愛！", 0.5]
        };

        console.log('🤖 Doubao AI 初始化完成 - 知識庫擴展版');
        console.log(`📚 知識庫大小: ${Object.keys(this.datasets).length} 個主題`);
    }

    // ============ 核心方法（保持不變）============

    relu(x) {
        return Math.max(0.01 * x, x);
    }

    reluDerivative(x) {
        return x > 0 ? 1.0 : 0.01;
    }

    async intelligentSearch(query) {
        try {
            // 簡化搜索邏輯
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
            
            const response = await fetch(ddgUrl, {
                headers: { 'User-Agent': 'DoubaoAI/1.0' },
                timeout: 3000
            });

            const data = await response.json();
            
            if (data.AbstractText && data.AbstractText.trim().length > 0) {
                return `🔍 關於「${query}」：${data.AbstractText.substring(0, 200)}...`;
            } else {
                return `我瞭解到您想查詢「${query}」。這是一個有趣的話題！`;
            }
        } catch (error) {
            return `關於「${query}」，我目前專注於聊天陪伴。您可以和我聊聊其他話題！`;
        }
    }

    buildVocabulary() {
        if (this.vocabulary !== null) return this.vocabulary;
        
        const vocabSet = new Set();
        
        for (const [prompt, [answer, _]] of Object.entries(this.datasets)) {
            const triggers = prompt.replace(/\|/g, '｜').split('｜');
            triggers.forEach(trigger => {
                for (const char of trigger) {
                    vocabSet.add(char);
                }
            });
            
            const answers = answer.replace(/\|/g, '｜').split('｜');
            answers.forEach(ans => {
                for (const char of ans) {
                    vocabSet.add(char);
                }
            });
        }
        
        this.vocabulary = Array.from(vocabSet);
        return this.vocabulary;
    }

    textToVector(text) {
        if (this.vocabulary === null) this.buildVocabulary();
        
        const vector = new Array(this.vocabulary.length).fill(0);
        let total = 0;
        
        for (const char of text) {
            const index = this.vocabulary.indexOf(char);
            if (index !== -1) {
                vector[index] += 1;
                total += 1;
            }
        }
        
        if (total > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] = vector[i] / total;
            }
        }
        
        return vector;
    }

    cosineSimilarity(vec1, vec2) {
        if (vec1.length === 0 || vec2.length === 0) return 0.0;
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }
        
        norm1 = Math.sqrt(norm1);
        norm2 = Math.sqrt(norm2);
        
        if (norm1 === 0 || norm2 === 0) return 0.0;
        
        return Math.max(0.0, dotProduct / (norm1 * norm2));
    }

    jaccardSimilarity(text1, text2) {
        const set1 = new Set(text1);
        const set2 = new Set(text2);
        
        if (set1.size === 0 && set2.size === 0) return 0.0;
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    intelligentSimilarity(text1, text2) {
        if (text1 === text2) return 1.0;
        if (text2.includes(text1) || text1.includes(text2)) return 0.9;
        
        // 關鍵字匹配
        const text1Lower = text1.toLowerCase();
        const text2Lower = text2.toLowerCase();
        
        // 檢查是否屬於同一話題類別
        const categories = [
            ["心情", "開心", "難過", "壓力", "累"],
            ["錢", "租金", "工作", "賺錢", "經濟"],
            ["學習", "考試", "功課", "學校", "教育"],
            ["科技", "AI", "程式", "電腦", "網絡"],
            ["食物", "吃", "餐廳", "美食", "料理"],
            ["娛樂", "電影", "音樂", "遊戲", "運動"]
        ];
        
        for (const category of categories) {
            const has1 = category.some(word => text1Lower.includes(word));
            const has2 = category.some(word => text2Lower.includes(word));
            if (has1 && has2) return 0.7;
        }
        
        const vec1 = this.textToVector(text1Lower);
        const vec2 = this.textToVector(text2Lower);
        const cosine = this.cosineSimilarity(vec1, vec2);
        const jaccard = this.jaccardSimilarity(text1Lower, text2Lower);
        
        return (cosine * 0.6 + jaccard * 0.4);
    }

    async train(epochs = 30, learningRate = 0.01) {
        console.log(`🧠 訓練 AI 模型...`);
        
        this.buildVocabulary();
        
        const allTriggers = [];
        for (const prompt of Object.keys(this.datasets)) {
            const triggers = prompt.replace(/\|/g, '｜').split('｜');
            triggers.forEach(trigger => {
                if (!allTriggers.includes(trigger)) {
                    allTriggers.push(trigger);
                }
            });
        }
        
        const triggerVectors = {};
        allTriggers.forEach(trigger => {
            triggerVectors[trigger] = this.textToVector(trigger);
        });
        
        const trainingData = [];
        
        allTriggers.forEach(trigger => {
            trainingData.push({
                input: trigger,
                target: trigger,
                label: 1.0
            });
        });
        
        console.log(`📊 使用 ${trainingData.length} 個樣本進行訓練`);
        
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            
            trainingData.sort(() => Math.random() - 0.5);
            
            for (const { input, target, label } of trainingData) {
                const inputVec = triggerVectors[input];
                const targetVec = triggerVectors[target];
                const sim = this.cosineSimilarity(inputVec, targetVec);
                
                let relevance = 0.5;
                for (const [prompt, [_, rel]] of Object.entries(this.datasets)) {
                    const triggers = prompt.replace(/\|/g, '｜').split('｜');
                    if (triggers.includes(target)) {
                        relevance = rel;
                        break;
                    }
                }
                
                const z = sim * this.w1 + relevance * this.w2 + this.b;
                const prediction = this.relu(z);
                const error = prediction - label;
                
                const gradient = error * this.reluDerivative(z);
                
                this.w1 -= learningRate * gradient * sim;
                this.w2 -= learningRate * gradient * relevance;
                this.b -= learningRate * gradient;
                
                totalLoss += error * error;
            }
            
            if ((epoch + 1) % 5 === 0) {
                const avgLoss = totalLoss / trainingData.length;
                console.log(`⏳ Epoch ${epoch + 1} | 損失: ${avgLoss.toFixed(6)}`);
            }
        }
        
        console.log('✅ 訓練完成！');
        return { success: true, epochs };
    }

    async predict(userInput, options = {}) {
        try {
            const startTime = Date.now();
            const threshold = options.threshold || 0.3;
            const cleanInput = userInput.trim().toLowerCase();
            
            // 檢查緩存
            const cacheKey = `predict:${cleanInput}`;
            if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.options.cacheTTL) {
                    return {
                        ...cached.data,
                        cached: true,
                        responseTime: Date.now() - startTime
                    };
                }
            }
            
            // 特殊回應
            const specialResponses = {
                "哈哈|呵呵|嘻嘻|嘿嘿": ["😄 看到你開心我也很高興！", 0.9],
                "？？|？？？|???": ["🤔 有什麼問題嗎？我可以幫您解答！", 0.8],
                "...|。。。|。。": ["💭 在思考什麼呢？隨時和我分享！", 0.7]
            };
            
            for (const [pattern, [response, score]] of Object.entries(specialResponses)) {
                const patterns = pattern.split('|');
                if (patterns.some(p => cleanInput.includes(p))) {
                    const result = {
                        answer: response,
                        score: score,
                        source: "特殊模式",
                        responseTime: Date.now() - startTime
                    };
                    
                    if (this.options.cacheEnabled) {
                        this.cache.set(cacheKey, {
                            data: result,
                            timestamp: Date.now()
                        });
                    }
                    
                    return result;
                }
            }
            
            // 知識庫匹配
            let bestScore = -Infinity;
            let bestMatch = null;
            
            for (const [prompt, [answer, relevance]] of Object.entries(this.datasets)) {
                const triggers = prompt.toLowerCase().replace(/\|/g, '｜').split('｜');
                
                for (const trigger of triggers) {
                    const similarity = this.intelligentSimilarity(cleanInput, trigger);
                    const z = similarity * this.w1 + relevance * this.w2 + this.b;
                    const score = this.relu(z);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        const answers = answer.replace(/\|/g, '｜').split('｜');
                        const selectedAnswer = answers[Math.floor(Math.random() * answers.length)];
                        bestMatch = {
                            answer: selectedAnswer,
                            score,
                            source: "知識庫"
                        };
                    }
                }
            }
            
            // 如果有好的匹配
            if (bestScore >= threshold && bestMatch) {
                const result = {
                    ...bestMatch,
                    responseTime: Date.now() - startTime
                };
                
                if (this.options.cacheEnabled) {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            }
            
            // 智能搜索
            if (this.options.enableSearch && cleanInput.length > 3) {
                const searchResult = await this.intelligentSearch(userInput);
                const result = {
                    answer: searchResult,
                    score: 0.0,
                    source: "網絡搜索",
                    responseTime: Date.now() - startTime
                };
                
                if (this.options.cacheEnabled) {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            }
            
            // 默認創意回應
            const creativeResponses = [
                "這個問題很有意思！我還在學習中，我們可以一起探索答案。",
                "我理解您的意思！作為AI助手，我會繼續學習來更好地幫助您。",
                "感謝您的提問！這讓我思考如何改進自己的回答能力。",
                "我對這個話題也很感興趣！我們可以聊聊其他相關的事情。",
                "這個問題很有深度！您想從哪個角度來討論呢？"
            ];
            
            const defaultAnswer = creativeResponses[Math.floor(Math.random() * creativeResponses.length)];
            
            const result = {
                answer: defaultAnswer,
                score: 0.1,
                source: "創意模式",
                responseTime: Date.now() - startTime
            };
            
            if (this.options.cacheEnabled) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('預測錯誤:', error);
            return {
                answer: "抱歉，處理請求時出現技術問題。請稍後再試！",
                score: 0.0,
                source: "錯誤處理",
                responseTime: 0
            };
        }
    }

    // 新增：隨機話題功能
    getRandomTopic() {
        const topics = [
            "科技發展", "人生哲學", "心理健康", "美食文化",
            "旅行經驗", "學習方法", "娛樂休閒", "未來趨勢"
        ];
        return topics[Math.floor(Math.random() * topics.length)];
    }

    // 新增：趣味事實
    getFunFact() {
        const facts = [
            "你知道嗎？蜜蜂可以識別人臉！",
            "有趣的事實：蝸牛可以睡三年！",
            "冷知識：北極熊的皮膚是黑色的！",
            "驚奇事實：章魚有三個心臟！"
        ];
        return facts[Math.floor(Math.random() * facts.length)];
    }

    // 統計信息
    getStats() {
        return {
            knowledgeBaseSize: Object.keys(this.datasets).length,
            cacheSize: this.cache.size,
            vocabularySize: this.vocabulary ? this.vocabulary.length : 0
        };
    }
}

module.exports = DoubaoAI;