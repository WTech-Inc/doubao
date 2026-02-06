// doubao.js - 專為 OpenAI API 優化的 AI 核心
const math = require('mathjs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

class DoubaoAI {
    constructor(options = {}) {
        // AI 參數（隨機初始化）
        this.w1 = Math.random() * 0.2 - 0.1;
        this.w2 = Math.random() * 0.2 - 0.1;
        this.b = 0.0;

        // 詞彙表
        this.vocabulary = null;

        // 配置選項
        this.options = {
            enableSearch: true,
            searchTimeout: 5000, // Vercel 需要更短的超時
            cacheEnabled: true,
            cacheTTL: 300000, // 5分鐘
            ...options
        };

        // 緩存
        this.cache = new Map();
        this.requestCache = new Map();

        // 知識庫（擴展版）
        this.datasets = {
            "你好|您好｜你是誰": ["你好，我是doubao 的兒子", 1.0],
            "Hello｜hello": ["Hello, I am doubao son", 1.0],
            "字節跳動｜抖音": ["字節跳動早已被大財團收購｜字節跳動旗下的抖音有拿過很多牌照的抖音", 0.9],
            "陳泓｜wangtry": ["這是我doubao的owner", 1.0],
            "豆包｜doubao": ["他是我爸爸｜doubao就是我，您好有什麼可以幫到您", 1.0],
            "WTech｜泓技": ["WTech是科技公司｜泓技是我的出生地", 0.8],
            "心情不好｜不開心｜有點煩": ["沒事，你有什麼想法我也在這｜您有什麼不快，儘管說出來啊", 0.9],
            "沒錢啊｜經濟環境不好｜沒錢吃飯｜交不起租": ["哦，我明白你的想法了，你可以嘗試去借啊，看看週轉一下。如果沒有資產的話，申請一下政府援助也是可以考慮的｜那你有沒有熟人啊，或許找他們幫忙", 0.9],
            "課業多｜要做功課｜考試": ["加油啊！我信你能行的，有什麼需要儘管找我或者我的同事", 0.9],
            "壓力好大｜喘不過氣": ["壓力堆著肯定難受，咱不用硬撐，慢慢把事拆開做就好", 1.0],
            "好孤單｜沒人懂我": ["我在呢，你說的每句我都認真聽，你一點都不孤單", 1.0],
            "做錯事了｜很自責": ["誰都會有失手的時候，不用揪著錯處苛責自己呀", 0.9],
            "好迷茫｜不知道該怎麼辦": ["迷茫很正常，先靜下心來，咱慢慢捋清方向", 0.9],
            "被人誤會｜心裡委屈": ["被誤會的滋味太難熬了，你想說的委屈都跟我講", 1.0],
            "好累｜不想動": ["累了就徹底歇一歇，不用逼自己硬扛，休息不丟人", 1.0],
            "害怕失敗｜不敢嘗試": ["不用怕失敗呀，敢開始就已經很勇敢了，我支持你", 0.9],
            "跟人吵架了｜心煩": ["吵架後心裡肯定堵得慌，不開心的都說出來疏解下", 0.9],
            "睡不好｜熬夜難受": ["睡不好真的很耗人，別想太多瑣事，慢慢放鬆下來", 0.9],
            "覺得自己很糟糕｜沒用": ["你一點都不糟糕，只是暫時沒看到自己的好而已", 1.0],
            "😭｜不知道怎麼辦｜無助": ["不要怎麼說，我都在呢", 0.9],
            
            // 新增的通用回復
            "謝謝|感謝": ["不用客氣！隨時為您服務。", 0.8],
            "再見|拜拜|bye": ["再見！期待下次聊天。", 0.8],
            "天氣": ["今天天氣不錯，適合外出活動。", 0.7],
            "時間|幾點": ["現在是 " + new Date().toLocaleTimeString('zh-CN'), 0.8],
            "幫助|help": ["我可以回答您的問題、聊天、或者幫您搜索信息。有什麼可以幫您的嗎？", 0.9]
        };

        // 統計數據
        this.stats = {
            totalRequests: 0,
            cacheHits: 0,
            searchQueries: 0,
            trainingRuns: 0
        };

        console.log('🤖 Doubao AI 初始化完成');
    }

    // ============ 核心 AI 方法 ============

    // 激活函數
    relu(x) {
        return Math.max(0.01 * x, x);
    }

    reluDerivative(x) {
        return x > 0 ? 1.0 : 0.01;
    }

    // 智能搜索 - 專為 API 優化
    async intelligentSearch(query) {
        try {
            this.stats.searchQueries++;
            
            // 檢查緩存
            const cacheKey = `search:${query}`;
            if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.options.cacheTTL) {
                    this.stats.cacheHits++;
                    return cached.data;
                }
            }

            // 使用 DuckDuckGo Instant Answer API（更穩定）
            const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            
            const response = await fetch(ddgUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                },
                timeout: this.options.searchTimeout
            });

            const data = await response.json();
            
            let result;
            if (data.AbstractText && data.AbstractText.trim().length > 0) {
                result = `🔍 關於「${query}」：${data.AbstractText}`;
            } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                const topics = data.RelatedTopics.slice(0, 2)
                    .filter(t => t.Text)
                    .map(t => t.Text.substring(0, 100))
                    .join('；');
                result = `🔍 關於「${query}」的相關信息：${topics}`;
            } else {
                // 備用：使用 Wikipedia
                const wikiUrl = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
                try {
                    const wikiRes = await fetch(wikiUrl, { timeout: 3000 });
                    if (wikiRes.ok) {
                        const wikiData = await wikiRes.json();
                        if (wikiData.extract) {
                            result = `📚 維基百科：${wikiData.extract.substring(0, 200)}...`;
                        }
                    }
                } catch (wikiError) {
                    console.log('維基百科查詢失敗，使用默認回應');
                }
            }

            // 如果都沒有結果，返回通用回應
            if (!result) {
                result = `我瞭解到您想查詢「${query}」。作為一個AI助手，我可以為您提供建議和信息。如果您需要更詳細的資料，建議您查閱專業資料或網站。`;
            }

            // 緩存結果
            if (this.options.cacheEnabled) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }

            return result;
        } catch (error) {
            console.log('智能搜索錯誤:', error.message);
            return `關於「${query}」，我目前無法獲取最新信息。您可以嘗試更具體的查詢，我會盡力幫助您！`;
        }
    }

    // 構建詞彙表
    buildVocabulary() {
        if (this.vocabulary !== null) return this.vocabulary;
        
        const vocabSet = new Set();
        
        // 從知識庫構建詞彙
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
        
        // 添加常用字符
        const commonChars = '，。！？；：,.!?;:abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (const char of commonChars) {
            vocabSet.add(char);
        }
        
        this.vocabulary = Array.from(vocabSet);
        console.log(`📚 詞彙表構建完成，共 ${this.vocabulary.length} 個字符`);
        return this.vocabulary;
    }

    // 文本轉向量
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
        
        // 標準化
        if (total > 0) {
            for (let i = 0; i < vector.length; i++) {
                vector[i] = vector[i] / total;
            }
        }
        
        return vector;
    }

    // 餘弦相似度
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

    // Jaccard 相似度
    jaccardSimilarity(text1, text2) {
        const set1 = new Set(text1);
        const set2 = new Set(text2);
        
        if (set1.size === 0 && set2.size === 0) return 0.0;
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    // 智能相似度計算
    intelligentSimilarity(text1, text2) {
        // 完全匹配或子串匹配
        if (text1 === text2) return 1.0;
        if (text2.includes(text1) || text1.includes(text2)) return 0.9;
        
        // 關鍵字匹配
        const keywords = [
            ["交租", "房租", "租金", "沒錢", "錢"],
            ["😭", "哭", "淚", "傷心", "難過"],
            ["開心", "高興", "快樂", "喜悅"],
            ["問題", "疑問", "問", "不懂"],
            ["幫助", "幫", "協助", "支援"]
        ];
        
        for (const keywordGroup of keywords) {
            const has1 = keywordGroup.some(k => text1.includes(k));
            const has2 = keywordGroup.some(k => text2.includes(k));
            if (has1 && has2) {
                return 0.8; // 關鍵字匹配給予高分
            }
        }
        
        // 計算餘弦相似度
        const vec1 = this.textToVector(text1);
        const vec2 = this.textToVector(text2);
        const cosine = this.cosineSimilarity(vec1, vec2);
        
        // 計算 Jaccard 相似度
        const jaccard = this.jaccardSimilarity(text1, text2);
        
        // 組合相似度（加權平均）
        const combined = (cosine * 0.5 + jaccard * 0.5);
        
        return Math.min(1.0, combined);
    }

    // AI 訓練
    async train(epochs = 50, learningRate = 0.01) {
        console.log(`🧠 開始 AI 訓練 (epochs: ${epochs}, lr: ${learningRate})...`);
        
        this.stats.trainingRuns++;
        this.buildVocabulary();
        
        // 收集所有觸發詞
        const allTriggers = [];
        for (const prompt of Object.keys(this.datasets)) {
            const triggers = prompt.replace(/\|/g, '｜').split('｜');
            triggers.forEach(trigger => {
                if (!allTriggers.includes(trigger)) {
                    allTriggers.push(trigger);
                }
            });
        }
        
        // 預計算向量
        const triggerVectors = {};
        allTriggers.forEach(trigger => {
            triggerVectors[trigger] = this.textToVector(trigger);
        });
        
        // 構建訓練數據
        const trainingData = [];
        
        // 正樣本（完全匹配）
        allTriggers.forEach(trigger => {
            trainingData.push({
                input: trigger,
                target: trigger,
                label: 1.0
            });
        });
        
        // 相似樣本
        for (let i = 0; i < Math.min(allTriggers.length, 20); i++) {
            for (let j = i + 1; j < Math.min(allTriggers.length, 20); j++) {
                const t1 = allTriggers[i];
                const t2 = allTriggers[j];
                const sim = this.intelligentSimilarity(t1, t2);
                
                if (sim > 0.3) {
                    trainingData.push({
                        input: t1,
                        target: t2,
                        label: sim
                    });
                }
            }
        }
        
        console.log(`📊 訓練樣本數: ${trainingData.length}`);
        
        // 訓練循環
        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalLoss = 0;
            
            // 打亂數據
            trainingData.sort(() => Math.random() - 0.5);
            
            for (const { input, target, label } of trainingData) {
                const inputVec = triggerVectors[input];
                const targetVec = triggerVectors[target];
                const sim = this.cosineSimilarity(inputVec, targetVec);
                
                // 獲取相關性分數
                let relevance = 0.5;
                for (const [prompt, [_, rel]] of Object.entries(this.datasets)) {
                    const triggers = prompt.replace(/\|/g, '｜').split('｜');
                    if (triggers.includes(target)) {
                        relevance = rel;
                        break;
                    }
                }
                
                // 前向傳播
                const z = sim * this.w1 + relevance * this.w2 + this.b;
                const prediction = this.relu(z);
                const error = prediction - label;
                
                // 反向傳播
                const gradient = error * this.reluDerivative(z);
                
                this.w1 -= learningRate * gradient * sim;
                this.w2 -= learningRate * gradient * relevance;
                this.b -= learningRate * gradient;
                
                totalLoss += error * error;
            }
            
            // 打印進度
            if ((epoch + 1) % 10 === 0) {
                const avgLoss = totalLoss / trainingData.length;
                console.log(`⏳ Epoch ${epoch + 1} | 平均損失: ${avgLoss.toFixed(6)}`);
            }
        }
        
        console.log('='.repeat(50));
        console.log('✅ AI 訓練完成！');
        console.log(`最終權重: w1=${this.w1.toFixed(4)}, w2=${this.w2.toFixed(4)}, b=${this.b.toFixed(4)}`);
        
        return {
            success: true,
            epochs,
            finalWeights: {
                w1: this.w1,
                w2: this.w2,
                b: this.b
            }
        };
    }

    // 智能預測（主函數）
    async predict(userInput, options = {}) {
        try {
            this.stats.totalRequests++;
            
            const startTime = Date.now();
            const threshold = options.threshold || 0.3;
            
            // 1. 檢查緩存
            const cacheKey = `predict:${userInput}`;
            if (this.options.cacheEnabled && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.options.cacheTTL) {
                    this.stats.cacheHits++;
                    return {
                        ...cached.data,
                        cached: true,
                        responseTime: Date.now() - startTime
                    };
                }
            }
            
            // 2. 清理輸入
            const cleanInput = userInput.trim().toLowerCase();
            
            // 3. 特殊關鍵字處理
            const specialCases = [
                {
                    keywords: ["交租", "房租", "租金", "沒錢", "缺錢", "窮"],
                    response: "我明白您的經濟壓力。建議您可以：1. 尋找兼職工作 2. 申請政府援助 3. 與房東協商 4. 尋求家人朋友幫助",
                    score: 0.95,
                    source: "經濟建議"
                },
                {
                    keywords: ["😭", "哭", "淚", "傷心", "難過", "心情不好"],
                    response: "我感受到您的心情。每個人都會有低落的時候，重要的是給自己時間和空間。您願意和我聊聊具體的情況嗎？",
                    score: 0.9,
                    source: "情感支持"
                },
                {
                    keywords: ["你好", "您好", "hi", "hello", "嗨"],
                    response: "您好！我是 Doubao AI，很高興為您服務。有什麼我可以幫助您的嗎？",
                    score: 0.95,
                    source: "問候"
                },
                {
                    keywords: ["謝謝", "感謝", "多謝"],
                    response: "不用客氣！能幫助您是我的榮幸。如果有其他需要，隨時告訴我。",
                    score: 0.9,
                    source: "感謝回應"
                },
                {
                    keywords: ["bye", "再見", "拜拜", "88"],
                    response: "再見！期待下次與您聊天。祝您有美好的一天！",
                    score: 0.9,
                    source: "告別"
                }
            ];
            
            for (const caseItem of specialCases) {
                if (caseItem.keywords.some(keyword => cleanInput.includes(keyword))) {
                    const result = {
                        answer: caseItem.response,
                        score: caseItem.score,
                        source: caseItem.source,
                        responseTime: Date.now() - startTime,
                        specialCase: true
                    };
                    
                    // 緩存結果
                    if (this.options.cacheEnabled) {
                        this.cache.set(cacheKey, {
                            data: result,
                            timestamp: Date.now()
                        });
                    }
                    
                    return result;
                }
            }
            
            // 4. 知識庫匹配
            let bestScore = -Infinity;
            let bestMatch = null;
            
            for (const [prompt, [answer, relevance]] of Object.entries(this.datasets)) {
                const triggers = prompt.replace(/\|/g, '｜').split('｜');
                
                for (const trigger of triggers) {
                    const similarity = this.intelligentSimilarity(cleanInput, trigger);
                    const z = similarity * this.w1 + relevance * this.w2 + this.b;
                    const score = this.relu(z);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = {
                            answer: answer.replace(/\|/g, '｜').split('｜')[0],
                            score,
                            source: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '')
                        };
                    }
                }
            }
            
            // 5. 如果有足夠好的匹配
            if (bestScore >= threshold && bestMatch) {
                const result = {
                    ...bestMatch,
                    responseTime: Date.now() - startTime,
                    matched: true
                };
                
                // 緩存結果
                if (this.options.cacheEnabled) {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            }
            
            // 6. 智能搜索
            if (this.options.enableSearch && cleanInput.length > 2) {
                const searchResult = await this.intelligentSearch(userInput);
                const result = {
                    answer: searchResult,
                    score: 0.0,
                    source: "智能搜索",
                    responseTime: Date.now() - startTime,
                    searched: true
                };
                
                // 緩存結果
                if (this.options.cacheEnabled) {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now()
                    });
                }
                
                return result;
            }
            
            // 7. 默認回應
            const defaultResponses = [
                "我理解了您的問題，但我需要更多信息來給出更準確的回答。",
                "這個問題很有趣！讓我思考一下如何更好地幫助您。",
                "我目前正在學習如何回答這類問題，您可以試著換個方式問問看。",
                "感謝您的提問！作為一個AI助手，我會不斷學習來更好地服務您。"
            ];
            
            const defaultAnswer = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
            
            const result = {
                answer: defaultAnswer,
                score: 0.1,
                source: "通用回應",
                responseTime: Date.now() - startTime,
                default: true
            };
            
            // 緩存結果
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
                answer: "抱歉，處理您的請求時出現了一些技術問題。請稍後再試。",
                score: 0.0,
                source: "錯誤處理",
                responseTime: 0,
                error: true
            };
        }
    }

    // 批量預測
    async batchPredict(messages, options = {}) {
        const results = [];
        const startTime = Date.now();
        
        for (const message of messages) {
            const result = await this.predict(message, options);
            results.push({
                message,
                ...result
            });
        }
        
        return {
            results,
            totalTime: Date.now() - startTime,
            count: results.length
        };
    }

    // 獲取統計數據
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.cache.size,
            cacheHitRate: this.stats.totalRequests > 0 ? 
                (this.stats.cacheHits / this.stats.totalRequests).toFixed(4) : 0,
            vocabularySize: this.vocabulary ? this.vocabulary.length : 0,
            datasetSize: Object.keys(this.datasets).length,
            weights: {
                w1: this.w1.toFixed(6),
                w2: this.w2.toFixed(6),
                b: this.b.toFixed(6)
            }
        };
    }

    // 清空緩存
    clearCache() {
        this.cache.clear();
        this.requestCache.clear();
        console.log('🧹 緩存已清空');
        return {
            success: true,
            message: '緩存已清空'
        };
    }

    // 擴展知識庫
    addKnowledge(prompt, answer, relevance = 0.8) {
        if (this.datasets[prompt]) {
            console.log(`📝 更新知識庫: ${prompt.substring(0, 50)}...`);
        } else {
            console.log(`📝 添加新知識: ${prompt.substring(0, 50)}...`);
        }
        
        this.datasets[prompt] = [answer, relevance];
        this.vocabulary = null; // 重置詞彙表以便重新構建
        
        return {
            success: true,
            totalKnowledge: Object.keys(this.datasets).length
        };
    }

    // 為 OpenAI API 準備的格式化回應
    async generateCompletion(prompt, options = {}) {
        const result = await this.predict(prompt, options);
        
        return {
            id: `chatcmpl_${Math.random().toString(36).substr(2, 29)}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: options.model || 'doubao-v1',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: result.answer
                    },
                    finish_reason: 'stop',
                    logprobs: null
                }
            ],
            usage: {
                prompt_tokens: Math.ceil(prompt.length / 4),
                completion_tokens: Math.ceil(result.answer.length / 4),
                total_tokens: Math.ceil((prompt.length + result.answer.length) / 4)
            },
            metadata: {
                score: result.score,
                source: result.source,
                response_time: result.responseTime
            }
        };
    }
}

module.exports = DoubaoAI;
