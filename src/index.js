// index.js - OpenAI 風格的 API 服務
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const DoubaoAI = require('./doubao');
const path = require('path');

const app = express();

// 中間件
app.use(cors());
app.use(express.json());
app.use("/cdn", express.static(path.join(__dirname, 'cdn')));

// 速率限制（模仿 OpenAI）
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1分鐘
    max: 60, // 60請求/分鐘（免費層級）
    message: {
        error: {
            message: 'Rate limit exceeded. Please try again in 1 minute.',
            type: 'rate_limit_error',
            param: null,
            code: 'rate_limit_exceeded'
        }
    }
});

// OpenAI 風格的路由
app.use('/v1/', limiter);

// 創建 AI 實例
const doubaoAI = new DoubaoAI();

// 中間件：API 密鑰驗證
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            error: {
                message: 'You didn\'t provide an API key.',
                type: 'invalid_request_error',
                param: null,
                code: 'missing_api_key'
            }
        });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // 簡單的密鑰驗證（生產環境應該使用數據庫）
    if (token !== process.env.API_KEY && token !== 'sk-doubao-free') {
        return res.status(401).json({
            error: {
                message: 'Incorrect API key provided.',
                type: 'invalid_request_error',
                param: null,
                code: 'invalid_api_key'
            }
        });
    }
    
    req.apiKey = token;
    next();
};

// ============ OpenAI 兼容的端點 ============

// 🏠 根目錄 - OpenAI 風格
app.get('/', (req, res) => {
    res.json({
        object: 'list',
        data: [
            {
                id: 'doubao-v1',
                object: 'model',
                created: Date.now(),
                owned_by: 'wtechhk'
            }
        ]
    });
});

// 📋 列出模型
app.get('/v1/models', authenticate, (req, res) => {
    res.json({
        object: 'list',
        data: [
            {
                id: 'doubao-v1',
                object: 'model',
                created: 1704067200,
                owned_by: 'doubao',
                permission: [
                    {
                        id: 'modelperm-xxxx',
                        object: 'model_permission',
                        created: 1704067200,
                        allow_create_engine: false,
                        allow_sampling: true,
                        allow_logprobs: true,
                        allow_search_indices: false,
                        allow_view: true,
                        allow_fine_tuning: false,
                        organization: '*',
                        group: null,
                        is_blocking: false
                    }
                ],
                root: 'doubao-v1',
                parent: null
            }
        ]
    });
});

// 🔍 獲取單個模型
app.get('/v1/models/:model', authenticate, (req, res) => {
    const { model } = req.params;
    
    if (model === 'doubao-v1') {
        res.json({
            id: model,
            object: 'model',
            created: 1704067200,
            owned_by: 'wtechhk',
            permission: [
                {
                    id: 'modelperm-xxxx',
                    object: 'model_permission',
                    created: 1704067200,
                    allow_create_engine: false,
                    allow_sampling: true,
                    allow_logprobs: true,
                    allow_search_indices: false,
                    allow_view: true,
                    allow_fine_tuning: false,
                    organization: '*',
                    group: null,
                    is_blocking: false
                }
            ],
            root: model,
            parent: null
        });
    } else {
        res.status(404).json({
            error: {
                message: `The model '${model}' does not exist`,
                type: 'invalid_request_error',
                param: 'model',
                code: 'model_not_found'
            }
        });
    }
});

// 💬 聊天補全 (Chat Completions) - 主要端點
app.post('/v1/chat/completions', authenticate, async (req, res) => {
    try {
        const {
            model = 'doubao-v1',
            messages,
            temperature = 0.7,
            max_tokens = 1000,
            stream = false,
            ...otherParams
        } = req.body;

        // 驗證參數
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: {
                    message: 'messages is required',
                    type: 'invalid_request_error',
                    param: 'messages',
                    code: null
                }
            });
        }

        // 提取最後一條用戶消息
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
            return res.status(400).json({
                error: {
                    message: 'At least one user message is required',
                    type: 'invalid_request_error',
                    param: 'messages',
                    code: null
                }
            });
        }

        const userMessage = lastUserMessage.content;
        
        // 獲取上下文（歷史消息）
        const context = messages
            .slice(0, -1)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');

        const fullMessage = context ? `${context}\nuser: ${userMessage}` : userMessage;

        // 獲取 AI 回應
        const startTime = Date.now();
        const result = await doubaoAI.predict(fullMessage);
        const responseTime = Date.now() - startTime;

        // 創建回應對象
        const completionId = `chatcmpl-${uuidv4().replace(/-/g, '')}`;
        
        const response = {
            id: completionId,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: result.answer,
                        function_call: null,
                        tool_calls: null
                    },
                    finish_reason: 'stop',
                    logprobs: null
                }
            ],
            usage: {
                prompt_tokens: Math.ceil(fullMessage.length / 4),
                completion_tokens: Math.ceil(result.answer.length / 4),
                total_tokens: Math.ceil((fullMessage.length + result.answer.length) / 4)
            },
            system_fingerprint: `fp_${uuidv4().substring(0, 16)}`
        };

        // 如果是流式響應
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // 分割消息為 chunks
            const chunks = result.answer.match(/.{1,20}/g) || [result.answer];
            
            // 發送流
            const sendStream = async () => {
                // 發送開始事件
                res.write(`data: ${JSON.stringify({
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [{
                        index: 0,
                        delta: { role: 'assistant' },
                        finish_reason: null,
                        logprobs: null
                    }]
                })}\n\n`);

                // 發送內容 chunks
                for (let i = 0; i < chunks.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    res.write(`data: ${JSON.stringify({
                        id: completionId,
                        object: 'chat.completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: model,
                        choices: [{
                            index: 0,
                            delta: { content: chunks[i] },
                            finish_reason: null,
                            logprobs: null
                        }]
                    })}\n\n`);
                }

                // 發送結束事件
                res.write(`data: ${JSON.stringify({
                    id: completionId,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: model,
                    choices: [{
                        index: 0,
                        delta: {},
                        finish_reason: 'stop',
                        logprobs: null
                    }]
                })}\n\n`);

                res.write('data: [DONE]\n\n');
                res.end();
            };

            sendStream().catch(console.error);
        } else {
            res.json(response);
        }
    } catch (error) {
        console.error('Chat completion error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                param: null,
                code: 'internal_error'
            }
        });
    }
});

// 📝 補全 (Completions) - 舊版 API
app.post('/v1/completions', authenticate, async (req, res) => {
    try {
        const {
            model = 'doubao-v1',
            prompt,
            max_tokens = 1000,
            temperature = 0.7,
            stream = false,
            ...otherParams
        } = req.body;

        if (!prompt) {
            return res.status(400).json({
                error: {
                    message: 'prompt is required',
                    type: 'invalid_request_error',
                    param: 'prompt',
                    code: null
                }
            });
        }

        const result = await doubaoAI.predict(prompt);
        const completionId = `cmpl-${uuidv4().replace(/-/g, '')}`;

        const response = {
            id: completionId,
            object: 'text_completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [
                {
                    text: result.answer,
                    index: 0,
                    logprobs: null,
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: Math.ceil(prompt.length / 4),
                completion_tokens: Math.ceil(result.answer.length / 4),
                total_tokens: Math.ceil((prompt.length + result.answer.length) / 4)
            }
        };

        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            const chunks = result.answer.match(/.{1,20}/g) || [result.answer];
            
            const sendStream = async () => {
                for (let i = 0; i < chunks.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    res.write(`data: ${JSON.stringify({
                        id: completionId,
                        object: 'text_completion.chunk',
                        created: Math.floor(Date.now() / 1000),
                        model: model,
                        choices: [{
                            text: chunks[i],
                            index: 0,
                            logprobs: null,
                            finish_reason: null
                        }]
                    })}\n\n`);
                }
                
                res.write('data: [DONE]\n\n');
                res.end();
            };
            
            sendStream().catch(console.error);
        } else {
            res.json(response);
        }
    } catch (error) {
        console.error('Completion error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                param: null,
                code: 'internal_error'
            }
        });
    }
});

// 🔧 編輯 (Edits) - 類似 GPT-3 編輯
app.post('/v1/edits', authenticate, async (req, res) => {
    try {
        const { model = 'doubao-v1', input, instruction, ...otherParams } = req.body;

        if (!instruction) {
            return res.status(400).json({
                error: {
                    message: 'instruction is required',
                    type: 'invalid_request_error',
                    param: 'instruction',
                    code: null
                }
            });
        }

        const prompt = input ? `${input}\n\nInstruction: ${instruction}` : instruction;
        const result = await doubaoAI.predict(prompt);

        res.json({
            object: 'edit',
            created: Math.floor(Date.now() / 1000),
            choices: [
                {
                    text: result.answer,
                    index: 0
                }
            ],
            usage: {
                prompt_tokens: Math.ceil(prompt.length / 4),
                completion_tokens: Math.ceil(result.answer.length / 4),
                total_tokens: Math.ceil((prompt.length + result.answer.length) / 4)
            }
        });
    } catch (error) {
        console.error('Edit error:', error);
        res.status(500).json({
            error: {
                message: 'Internal server error',
                type: 'server_error',
                param: null,
                code: 'internal_error'
            }
        });
    }
});

// 🎨 生成圖片（模擬）
app.post('/v1/images/generations', authenticate, (req, res) => {
    const { prompt, n = 1, size = '1024x1024' } = req.body;

    if (!prompt) {
        return res.status(400).json({
            error: {
                message: 'prompt is required',
                type: 'invalid_request_error',
                param: 'prompt',
                code: null
            }
        });
    }

    // 模擬圖片生成
    const images = [];
    for (let i = 0; i < n; i++) {
        const imageId = uuidv4();
        images.push({
            url: `https://api.doubao.ai/v1/images/${imageId}`,
            revised_prompt: `Generated image for: ${prompt}`
        });
    }

    res.json({
        created: Math.floor(Date.now() / 1000),
        data: images
    });
});

// 🎤 語音轉文字（模擬）
app.post('/v1/audio/transcriptions', authenticate, (req, res) => {
    res.json({
        text: "這是一個模擬的語音轉文字結果。請上傳真實的音頻文件進行轉錄。",
        task: "transcribe",
        language: "zh",
        duration: 5.0,
        segments: []
    });
});

// 📊 使用量統計（簡化版）
app.get('/v1/usage', authenticate, (req, res) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    res.json({
        object: 'list',
        data: [
            {
                aggregation_timestamp: Math.floor(firstDay.getTime() / 1000),
                n_requests: 150,
                operation: 'chat.completion',
                n_context_tokens_total: 50000,
                n_generated_tokens_total: 75000
            }
        ],
        total_usage: {
            total_tokens: 125000,
            total_requests: 150
        }
    });
});

// 📧 批量處理（模擬）
app.post('/v1/batches', authenticate, (req, res) => {
    const batchId = `batch_${uuidv4().replace(/-/g, '')}`;
    
    res.json({
        id: batchId,
        object: 'batch',
        endpoint: '/v1/chat/completions',
        errors: null,
        input_file_id: `file-${uuidv4()}`,
        completion_window: '24h',
        status: 'validating',
        output_file_id: null,
        error_file_id: null,
        created_at: Math.floor(Date.now() / 1000),
        in_progress_at: null,
        expires_at: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000),
        finalizing_at: null,
        completed_at: null,
        failed_at: null,
        expired_at: null,
        cancelling_at: null,
        cancelled_at: null,
        request_counts: {
            total: 0,
            completed: 0,
            failed: 0
        },
        metadata: {}
    });
});

// 🏥 健康檢查
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'Doubao OpenAI API',
        version: '1.0.0'
    });
});

// 📚 OpenAI 風格錯誤處理
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: `Invalid URL (${req.method} ${req.path})`,
            type: 'invalid_request_error',
            param: null,
            code: 'invalid_url'
        }
    });
});

app.use((err, req, res, next) => {
    console.error('API error:', err);
    res.status(500).json({
        error: {
            message: 'Internal server error',
            type: 'server_error',
            param: null,
            code: 'internal_error'
        }
    });
});

// 啟動服務器（本地開發）
if (require.main === module) {
    const PORT = process.env.PORT || 3003;
    app.listen(PORT, () => {
        console.log(`🤖 Doubao OpenAI API 運行在 http://localhost:${PORT}`);
        console.log(`🔑 測試 API Key: sk-doubao-free`);
        console.log(`📚 端點: http://localhost:${PORT}/v1/chat/completions`);
        console.log(`🔧 cURL 示例:`);
        console.log(`curl http://localhost:${PORT}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk-doubao-free" \\
  -d '{
    "model": "doubao-v1",
    "messages": [{"role": "user", "content": "你好"}]
  }'`);
    });
}

module.exports = app;
