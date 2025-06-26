import { HistoryItem, StoryChoice, EnhancedContinuationResponse, ThinkingHistoryItem } from '../types';

// Polyfill for AbortSignal.timeout for older Android browsers
const createTimeoutSignal = (timeout: number): AbortSignal => {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeout);
  }

  // Fallback for older browsers
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
};

// Enhanced fetch wrapper for better Android browser compatibility
const enhancedFetch = async (url: string, options: RequestInit): Promise<Response> => {
  try {
    // Check network connectivity first
    if (!navigator.onLine) {
      throw new Error('网络连接不可用，请检查网络设置');
    }

    const response = await fetch(url, options);
    return response;
  } catch (error: any) {
    // Handle specific Android browser issues
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接或稍后重试');
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败，请检查网络设置或稍后重试');
    } else if (error.message.includes('CORS')) {
      throw new Error('跨域请求被阻止，请联系开发者');
    } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
      throw new Error('安全连接失败，请检查网络设置');
    }

    // Re-throw the original error if it's not a known issue
    throw error;
  }
};

// Model configurations
interface ModelConfig {
  name: string;
  endpoint: string;
  temperature: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  thinking?: {
    enabled: boolean;
    steps: number;
    depth: number;
  };
}

const models: Record<string, ModelConfig> = {
  creative: {
    name: import.meta.env.VITE_AI_CREATIVE_MODEL_NAME,
    endpoint: import.meta.env.VITE_AI_CREATIVE_MODEL_ENDPOINT ,
    temperature: 0.8,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.3,
    presencePenalty: 0.3,
    thinking: {
      enabled: false,
      steps: 3,
      depth: 2
    }
  },
  precise: {
    name: import.meta.env.VITE_AI_PRECISE_MODEL_NAME,
    endpoint: import.meta.env.VITE_AI_PRECISE_MODEL_ENDPOINT ,
    temperature: 0.3,
    maxTokens: 2000,
    topP: 0.8,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    thinking: {
      enabled: false,
      steps: 4,
      depth: 3
    }
  },
  balanced: {
    name: import.meta.env.VITE_AI_BALANCED_MODEL_NAME,
    endpoint: import.meta.env.VITE_AI_BALANCED_MODEL_ENDPOINT ,
    temperature: 0.5,
    maxTokens: 2000,
    topP: 0.85,
    frequencyPenalty: 0.2,
    presencePenalty: 0.2,
    thinking: {
      enabled: false,
      steps: 3,
      depth: 2
    }
  }
};

const defaultModel: ModelConfig = models.creative;
const API_KEY = import.meta.env.VITE_AI_API_KEY;

if (!API_KEY) {
  throw new Error('AI API key not found in environment variables');
}

const generateThinkingSteps = (prompt: string, config: ModelConfig['thinking']) => {
  if (!config?.enabled) return prompt;

  const steps = Array(config.steps).fill(0).map((_, i) => {
    const depth = Array(config.depth).fill(0).map((_, j) => {
      return `思考层级 ${j + 1}: 分析当前情节发展的可能性和影响`;
    }).join('\n');
    return `步骤 ${i + 1}:\n${depth}`;
  }).join('\n\n');

  return `${steps}\n\n${prompt}`;
};

interface StoryResponse {
  story: string;
  choices: StoryChoice[];
}

// Helper function to clean foreign language characters that might interfere with JSON parsing
const cleanForeignCharacters = (text: string): string => {
  // Replace common foreign characters that appear in AI responses with safe equivalents
  const replacements: { [key: string]: string } = {
    // Korean characters
    '최대한': '尽可能',
    '숨쉬다': '躲藏',
    // Russian characters
    'двинуться': '移动',
    'вырваться': '突破',
    'использовать': '使用',
    'максимально': '最大程度地',
    'спрятаться': '隐藏',
    'попытаться': '尝试',
    // English words that commonly appear in AI responses
    'stay': '停留',
    'barely': '勉强',
    'hardly': '几乎不',
    'suddenly': '突然',
    'quickly': '快速地',
    'slowly': '缓慢地',
    'carefully': '小心地',
    'quietly': '安静地',
    'immediately': '立即',
    'finally': '最终',
    'perhaps': '也许',
    'maybe': '可能',
    'definitely': '肯定地',
    'probably': '可能',
    'certainly': '当然',
    'obviously': '显然',
    'actually': '实际上',
    'really': '真的',
    'truly': '真正地',
    'exactly': '确切地',
    'completely': '完全地',
    'absolutely': '绝对地',
    'perfectly': '完美地',
    'entirely': '完全地',
    'totally': '完全地',
    'extremely': '极其',
    'incredibly': '难以置信地',
    'amazingly': '令人惊讶地',
    'surprisingly': '令人惊讶地',
    'unfortunately': '不幸地',
    'fortunately': '幸运地',
    'naturally': '自然地',
    'normally': '通常',
    'usually': '通常',
    'generally': '一般来说',
    'specifically': '具体地',
    'particularly': '特别地',
    'especially': '尤其是',
    'basically': '基本上',
    'essentially': '本质上',
    'fundamentally': '根本上',
    'originally': '最初',
    'initially': '最初',
    'eventually': '最终',
    'ultimately': '最终',
    'consequently': '因此',
    'therefore': '因此',
    'however': '然而',
    'nevertheless': '然而',
    'nonetheless': '尽管如此',
    'meanwhile': '与此同时',
    'furthermore': '此外',
    'moreover': '而且',
    'additionally': '另外',
    'alternatively': '或者',
    'otherwise': '否则',
    'instead': '相反',
    'rather': '而是',
    'quite': '相当',
    'very': '非常',
    'pretty': '相当',
    'fairly': '相当',
    'somewhat': '有些',
    'slightly': '稍微',
    'mostly': '主要是',
    'mainly': '主要是',
    'primarily': '主要是',
    'largely': '很大程度上',
    'partly': '部分地',
    'partially': '部分地'
  };

  let cleaned = text;

  // Apply specific replacements first
  for (const [foreign, chinese] of Object.entries(replacements)) {
    cleaned = cleaned.replace(new RegExp(foreign, 'gi'), chinese);
  }

  // Handle standalone English words that might appear in Chinese text
  // Replace common English words with Chinese equivalents
  const englishWords = [
    'stay', 'barely', 'hardly', 'suddenly', 'quickly', 'slowly', 'carefully', 'quietly',
    'immediately', 'finally', 'perhaps', 'maybe', 'definitely', 'probably', 'certainly',
    'obviously', 'actually', 'really', 'truly', 'exactly', 'completely', 'absolutely',
    'perfectly', 'entirely', 'totally', 'extremely', 'incredibly', 'amazingly',
    'surprisingly', 'unfortunately', 'fortunately', 'naturally', 'normally', 'usually',
    'generally', 'specifically', 'particularly', 'especially', 'basically', 'essentially',
    'fundamentally', 'originally', 'initially', 'eventually', 'ultimately', 'consequently',
    'therefore', 'however', 'nevertheless', 'nonetheless', 'meanwhile', 'furthermore',
    'moreover', 'additionally', 'alternatively', 'otherwise', 'instead', 'rather',
    'quite', 'very', 'pretty', 'fairly', 'somewhat', 'slightly', 'mostly', 'mainly',
    'primarily', 'largely', 'partly', 'partially'
  ];

  const englishPattern = new RegExp(`\\b(${englishWords.join('|')})\\b`, 'gi');
  cleaned = cleaned.replace(englishPattern, (match) => {
    const word = match.toLowerCase();
    return replacements[word] || match;
  });

  // Remove any remaining non-standard characters that might break JSON
  // Keep Chinese characters, ASCII, common punctuation, and whitespace
  // More aggressive removal of foreign characters
  cleaned = cleaned.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\u0020-\u007E\u00A0-\u00FF\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F\s\n\r\t]/g, '');

  // Additional cleanup for specific problematic characters that might slip through
  // Remove Thai, Bengali, Russian, and other non-Chinese characters
  cleaned = cleaned.replace(/[\u0E00-\u0E7F]/g, ''); // Thai
  cleaned = cleaned.replace(/[\u0980-\u09FF]/g, ''); // Bengali
  cleaned = cleaned.replace(/[\u0400-\u04FF]/g, ''); // Cyrillic (Russian)
  cleaned = cleaned.replace(/[\u0590-\u05FF]/g, ''); // Hebrew
  cleaned = cleaned.replace(/[\u0600-\u06FF]/g, ''); // Arabic
  cleaned = cleaned.replace(/[\u3040-\u309F]/g, ''); // Hiragana
  cleaned = cleaned.replace(/[\u30A0-\u30FF]/g, ''); // Katakana
  cleaned = cleaned.replace(/[\uAC00-\uD7AF]/g, ''); // Korean

  return cleaned;
};

const safeJsonParse = (text: string) => {
  let cleaned = text.trim();

  // Remove Markdown code fences like ```json ... ```
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Clean up foreign language characters that might interfere with JSON parsing
  // Instead of removing them completely, replace them with safe equivalents
  cleaned = cleanForeignCharacters(cleaned);

  // Normalize English curly quotes that occasionally appear in AI output
  // Keep Chinese quotes (""") for dialogue, only replace English curly quotes
  cleaned = cleaned.replace(/[“”]/g, '"');

  // Fix common JSON formatting issues
  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');

  // Extract the first JSON object if extra text surrounds it
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    const jsonSubstring = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch (parseError) {
      console.warn('Failed to parse extracted JSON substring:', parseError);
      // Try to fix more issues in the substring
      let fixedSubstring = jsonSubstring;

      // Fix unescaped quotes in string values - this is the main issue
      fixedSubstring = fixUnescapedQuotes(fixedSubstring);

      // Remove trailing commas more aggressively
      fixedSubstring = fixedSubstring.replace(/,(\s*[}\]])/g, '$1');

      // Try to fix missing quotes around keys
      fixedSubstring = fixedSubstring.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

      try {
        return JSON.parse(fixedSubstring);
      } catch (_) {
        // fall through to try full cleaned string below
      }
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('JSON Parse Error:', error);
    console.error('Raw Response:', text.substring(0, 500) + '...');
    console.error('Cleaned Response:', cleaned.substring(0, 500) + '...');

    // Try one more aggressive fix
    let lastAttempt = cleaned;

    // Fix unescaped quotes in string values
    lastAttempt = fixUnescapedQuotes(lastAttempt);

    // Remove trailing commas more aggressively
    lastAttempt = lastAttempt.replace(/,(\s*[}\]])/g, '$1');

    // Try to fix missing quotes around keys
    lastAttempt = lastAttempt.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    try {
      console.log('Attempting final parse with fixed quotes');
      return JSON.parse(lastAttempt);
    } catch (finalError) {
      console.error('Final JSON Parse Attempt Failed:', finalError);
      console.error('Final Attempt String (first 500 chars):', lastAttempt.substring(0, 500) + '...');
      throw new Error(`Invalid JSON response from AI service: ${(error as Error).message}`);
    }
  }
};

// Helper function to fix unescaped quotes in JSON string values
const fixUnescapedQuotes = (jsonString: string): string => {
  try {
    // First, handle Chinese quotes that might interfere with JSON parsing
    // Replace Chinese quotes with regular quotes, but be careful not to break JSON structure
    let result = jsonString;

    // Replace Chinese quotes (""") with regular quotes only inside string content
    // We need to be more careful here to avoid breaking the JSON structure
    result = result.replace(/"/g, '"').replace(/"/g, '"');

    // More robust approach: parse character by character to fix quotes in string values
    let finalResult = '';
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];

      if (escapeNext) {
        finalResult += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        finalResult += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        if (!inString) {
          // Starting a string
          inString = true;
          finalResult += char;
        } else {
          // We're in a string, check if this is the end
          // Look ahead to see if this is likely the end of the string
          let nextNonSpace = '';
          for (let j = i + 1; j < result.length; j++) {
            if (!/\s/.test(result[j])) {
              nextNonSpace = result[j];
              break;
            }
          }

          if (nextNonSpace === ':' || nextNonSpace === ',' || nextNonSpace === '}' || nextNonSpace === ']') {
            // This is the end of the string
            inString = false;
            finalResult += char;
          } else {
            // This is a quote inside the string, escape it
            finalResult += '\\"';
          }
        }
      } else {
        finalResult += char;
      }
    }

    return finalResult;
  } catch (error) {
    console.warn('Error in fixUnescapedQuotes, returning original:', error);
    return jsonString;
  }
};

// 新增：生成初始结构大纲
export const generateInitialStructure = async (
  stylePrompt: string,
  modelType: keyof typeof models = 'balanced'
): Promise<string> => {
  try {
    const modelConfig = models[modelType] || defaultModel;
    const basePrompt = `
**！！！绝对强制输出格式！！！**
你的唯一输出**必须**是单个、完整且语法绝对正确的 JSON 对象。**禁止**在 JSON 对象之外添加任何字符、解释、注释、代码标记（如 \`\`\`json）或任何形式的元评论。任何偏离此格式的输出都将被视为完全失败。

**JSON 结构（必须严格遵守）**：
{
  "outline": "大纲内容。段落之间必须使用且仅使用 \\n\\n 分隔。"
}

**JSON 格式细节（强制）**：
1.  **引号**：所有 JSON 键和字符串值**必须**使用双引号 (").
2.  **转义**：字符串值内部的所有特殊字符（如 "、换行符等）**必须**正确转义（例如：\\", \\n）。
3.  **完整性**：确保 JSON 对象完整，无截断、无语法错误（如多余逗号）。
4.   **无额外包装（关键点）**：最终的输出必须是纯粹的、原始的 JSON 字符串本身，绝对不能包含 Markdown 的代码块标记或其他任何解释性文本。响应应直接以 { 开始，并以 } 结束。

**任务**: 根据以下风格提示，生成一个简洁的小说初始结构大纲。
**风格提示**: ${stylePrompt}
**要求**: 
1. 大纲应包含主要章节、关键转折点或大致的结局方向。
2. 输出**必须**是纯文本格式的大纲内容，**不要包含任何** 嵌套JSON、Markdown 标记或其他元注释。
3. 大纲内容应控制在 200-300 字左右。
4. 将你创作的大纲填充到上述 JSON 结构的 "outline" 字段中。

**输出示例内容（仅供参考，你需要创建原创内容并放入JSON结构中）**: 
第一章：主角的平凡生活与隐藏的危机。
第二章：危机爆发，主角被迫踏上旅程。
第三章：遭遇关键盟友或导师，获得初步成长。
第四章：面临重大挑战与第一个转折点。
第五章：深入险境，揭露部分真相。
第六章：最终决战与结局（开放式/封闭式）。
`;

    return await retryWithBackoff(async () => {
      // --- Start Logging ---
      const requestBody = {
        model: modelConfig.name,
        messages: [
          {
            role: 'system',
            content: '你的唯一输出必须是单个、完整且语法绝对正确的 JSON 对象。禁止在 JSON 对象之外添加任何其他内容。**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文字母(如stay、very、really等)、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语等。所有内容必须100%使用简体中文汉字和中文标点符号。如果想表达"停留"的意思，必须使用"停留"而不是"stay"；如果想表达"非常"的意思，必须使用"非常"而不是"very"。** 特别注意：1) 所有字符串值必须用英文双引号(")包围，绝不使用中文引号(""") 2) 字符串内容中的对话可以使用中文引号，但必须正确转义 3) 不能有尾随逗号 4) 所有特殊字符必须正确转义 5) JSON对象必须完整且格式正确。'
          },
          { role: 'user', content: basePrompt }
        ],
        temperature: modelConfig.temperature,
        max_tokens: 500,
        // response_format: { type: "json_object" } // Gemini may not support this parameter
      };
      // --- Development Logging Only ---
      if (import.meta.env.DEV) {
        console.log(`[${new Date().toISOString()}] AI Request (generateInitialStructure)`);
        console.log(`  Status: Sending request...`);
      }

      const response = await enhancedFetch(modelConfig.endpoint, {
        method: 'POST',
        headers: { // Enhanced headers for better Android browser compatibility
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (compatible; NovelApp/1.0)'
        },
        body: JSON.stringify(requestBody),
        // Add timeout and other options for better compatibility
        signal: createTimeoutSignal(60000), // 60 second timeout
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        // Log error response body if possible
        try {
          const errorBody = await response.text();
          console.error(`[${new Date().toISOString()}] AI Request Failed (generateInitialStructure). Status: ${response.status}. Body: ${errorBody}`);
        } catch (e) {
          console.error(`[${new Date().toISOString()}] AI Request Failed (generateInitialStructure). Status: ${response.status}. Could not read error body:`, e); // Fix: Use 'e'
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (import.meta.env.DEV) {
        console.log('AI Response received (Initial Structure)');
      }

      if (!data.choices?.[0]?.message?.content) {
        if (import.meta.env.DEV) {
          console.error('AI Response missing content:', data);
        }
        throw new Error('AI response structure unexpected or content missing');
      }

      const result = safeJsonParse(data.choices[0].message.content);

      if (!result.outline) {
        throw new Error('AI response missing outline field');
      }

      return result.outline.trim();
    });
  } catch (error) {
    console.error('Error generating initial structure:', error);
    throw error;
  }
};

// Add retry mechanism with exponential backoff
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 4,
  baseDelay: number = 1500
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Log attempt number (development only)
      if (import.meta.env.DEV) {
        console.log(`[${new Date().toISOString()}] Retry Attempt ${attempt + 1}/${maxRetries}...`);
      }
      return await operation();
    } catch (error: unknown) {
      lastError = error as Error;
      console.error(`[${new Date().toISOString()}] Retry Attempt ${attempt + 1} failed:`, lastError);

      // Retry on 429 (rate limit), 503 errors, other transient server errors, or JSON parsing errors
      const statusCodeMatch = lastError.message.match(/API error: (\d{3})/);
      const isRateLimitError = statusCodeMatch && statusCodeMatch[1] === '429';
      const isServerError = statusCodeMatch && ['500', '502', '503', '504'].includes(statusCodeMatch[1]);
      const isJsonError = lastError.message.includes('Invalid JSON response');
      const shouldRetry = isRateLimitError || isServerError || isJsonError;

      if (!shouldRetry) {
         console.log(`[${new Date().toISOString()}] Error is not retryable (${lastError.message}). Throwing.`);
        throw lastError;
      }

      if (attempt === maxRetries - 1) {
         console.log(`[${new Date().toISOString()}] Max retries reached. Throwing last error.`);
        throw lastError;
      }

      // Use shorter delay for rate limit errors (429)
      let delay = baseDelay * Math.pow(2, attempt);
      if (isRateLimitError) {
        delay = Math.max(delay, 2000 + (attempt * 1000)); // Progressive delay: 2s, 3s, 4s, 5s, 6s, 7s
      }
      console.log(`[${new Date().toISOString()}] Retrying after ${delay}ms delay...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should theoretically not be reached due to the throw in the loop, but needed for TS
  throw lastError || new Error("Retry mechanism failed unexpectedly");
};

export const generateInitialStoryAndChoices = async (
  stylePrompt: string,
  modelType: keyof typeof models = 'creative'
): Promise<StoryResponse> => {
  try {
    const modelConfig = models[modelType] || defaultModel;
    const basePrompt = `
    **内容生成任务**：
    根据以下「风格提示」和「内容与风格要求」，生成故事开篇和选项，并填充到 JSON 结构的对应字段中, 请注意生成的内容不要有\`\`\`json这种表示markdown的格式表示, 直接返回对象即可。

    **风格提示**：${stylePrompt}

    **内容与风格要求**：
    0.  **语言与格式要求（最重要）**：
        *   **绝对禁令**：严禁使用任何非中文字符！包括但不限于：英文字母(如stay、very、really、suddenly、quickly、carefully等)、泰语字符(如ยัง)、孟加拉语字符(如কয়েক)、俄语字符(如скрыться)、阿拉伯语、日语、韩语等任何外语字符。必须100%使用简体中文汉字和中文标点符号。如果想表达"停留"，必须使用"停留"而不是"stay"；如果想表达"突然"，必须使用"突然"而不是"suddenly"；如果想表达"隐藏"，必须使用"隐藏"而不是"скрыться"。
        *   **对话格式**：所有人物对话必须使用中文引号格式："人物说的话"，绝不使用其他引号形式。
    1.  **引人入胜的开篇**：
        *   **制造悬念与冲突**：开篇需迅速建立悬念、引入核心冲突或提出一个引人好奇的问题，抓住读者注意力。
        *   **鲜活的感官描写**：运用具体的视觉、听觉、嗅觉、触觉等细节，营造氛围，让读者身临其境（"展示，而非告知"）。
        *   **确立基调**：故事开篇的语言风格、节奏和情感色彩必须与「风格提示」高度一致。
        *   **避免陈词滥调**：在情节构思、人物设定和语言表达上力求新颖，避开常见的套路和俗语。
    2.  **故事长度**：开篇故事长度控制在 400 至 500 字之间。
    3.  **后续选项**：
        *   提供**三个**清晰、具体且有区分度的后续发展选项。
        *   每个选项应能将故事引向不同的方向，激发读者的选择欲。
        *   选项文本应简洁明了，准确描述选择后的可能发展。
      
     **！！！绝对强制输出格式！！！**
      你的唯一输出**必须**是单个、完整且语法绝对正确的 JSON 对象。**禁止**在 JSON 对象之外添加任何字符、解释、注释、代码标记（如 \`\`\`json）或任何形式的元评论。任何偏离此格式的输出都将被视为完全失败。
      
      **JSON 结构（必须严格遵守）**：
      {
        "story": "故事开篇内容。段落之间必须使用且仅使用 \\n\\n 分隔。",
        "choices": [
          { "id": "choice1", "text": "第一个选项描述" },
          { "id": "choice2", "text": "第二个选项描述" },
          { "id": "choice3", "text": "第三个选项描述" }
        ]
      }
      
      **JSON 格式细节（强制）**：
      1.  **引号**：所有 JSON 键和字符串值**必须**使用双引号 (").
      2.  **转义**：字符串值内部的所有特殊字符（如 "、换行符等）**必须**正确转义（例如：\\", \\n）。
      3.  **完整性**：确保 JSON 对象完整，无截断、无语法错误（如多余逗号）。     
      4.   **无额外包装（关键点）**：最终的输出必须是纯粹的、原始的 JSON 字符串本身，绝对不能包含 Markdown 的代码块标记或其他任何解释性文本。响应应直接以 { 开始，并以 } 结束。
`;

    const prompt = generateThinkingSteps(basePrompt, modelConfig.thinking);

    return await retryWithBackoff(async () => {
       // --- Start Logging ---
       const requestBody = {
        model: modelConfig.name,
        messages: [
          {
            role: 'system',
            content: '你的唯一输出必须是单个、完整且语法绝对正确的 JSON 对象。禁止在 JSON 对象之外添加任何其他内容。**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文字母(如stay、very、really、suddenly等)、泰语字符(如ยัง)、孟加拉语字符(如কয়েক)、俄语字符(如скрыться)、阿拉伯语、印地语、日语、韩语等任何外语字符。所有内容必须100%使用简体中文汉字和中文标点符号。如果想表达"停留"的意思，必须使用"停留"而不是"stay"；如果想表达"突然"的意思，必须使用"突然"而不是"suddenly"；如果想表达"隐藏"的意思，必须使用"隐藏"而不是"скрыться"。对话内容必须使用中文引号："人物说的话"。** 特别注意：1) 所有字符串值必须用英文双引号(")包围，绝不使用中文引号(""") 2) 字符串内容中的对话可以使用中文引号，但必须正确转义 3) 不能有尾随逗号 4) 所有特殊字符必须正确转义 5) JSON对象必须完整且格式正确。'
          },
          { role: 'user', content: prompt }
        ],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        top_p: modelConfig.topP,
        frequency_penalty: modelConfig.frequencyPenalty,
        presence_penalty: modelConfig.presencePenalty,
        // response_format: { type: "json_object" } // Gemini may not support this parameter
      };
      // --- Development Logging Only ---
      if (import.meta.env.DEV) {
        console.log(`[${new Date().toISOString()}] AI Request (generateInitialStoryAndChoices)`);
        console.log(`  Status: Sending request...`);
      }

      const response = await enhancedFetch(modelConfig.endpoint, {
        method: 'POST',
        headers: { // Enhanced headers for better Android browser compatibility
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (compatible; NovelApp/1.0)'
        },
        body: JSON.stringify(requestBody),
        // Add timeout and other options for better compatibility
        signal: createTimeoutSignal(60000), // 60 second timeout
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
         // Log error response body if possible
        try {
          const errorBody = await response.text();
          console.error(`[${new Date().toISOString()}] AI Request Failed (generateInitialStoryAndChoices). Status: ${response.status}. Body: ${errorBody}`);
        } catch (e) {
          console.error(`[${new Date().toISOString()}] AI Request Failed (generateInitialStoryAndChoices). Status: ${response.status}. Could not read error body:`, e); // Fix: Use 'e'
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (import.meta.env.DEV) {
        console.log('AI Response received (Initial Story)');
      }

      if (!data.choices?.[0]?.message?.content) {
        if (import.meta.env.DEV) {
          console.error('AI Response missing content:', data);
        }
        throw new Error('AI response structure unexpected or content missing');
      }

      const result = safeJsonParse(data.choices[0].message.content) as StoryResponse;

      if (!result.story || !Array.isArray(result.choices) || result.choices.length !== 3) {
        throw new Error('AI response missing required fields or has incorrect format');
      }

      return result;
    });
  } catch (error) {
    console.error('Error generating initial story:', error);
    throw error;
  }
};

export const continueStoryAndGenerateChoices = async (
  history: HistoryItem[],
  modelType: keyof typeof models = 'creative',
  currentStructureOutline: string | null = null,
  choiceCount: number = 0,
  structureThinkingHistory: ThinkingHistoryItem[] = [],
  preferenceThinkingHistory: ThinkingHistoryItem[] = []
): Promise<EnhancedContinuationResponse> => {
  try {
    const modelConfig = models[modelType] || defaultModel;
    // 从环境变量读取结构思考的阈值，如未设置则默认为 5
    const thresholdN = Number(import.meta.env.VITE_STRUCTURE_THINKING_THRESHOLD) || 5;
    const needStructureThinking = choiceCount > 0 && choiceCount % thresholdN === 0;

    let basePrompt = `
**！！！绝对强制输出格式！！！**
你的唯一输出**必须**是单个、完整且语法绝对正确的 JSON 对象。**禁止**在 JSON 对象之外添加任何字符、解释、注释、代码标记（如 \`\`\`json）或任何形式的元评论。任何偏离此格式的输出都将被视为完全失败。

**JSON 结构（必须严格遵守）**：`;

    // 根据是否需要结构思考确定JSON结构
    if (needStructureThinking) {
      basePrompt += `
{
  "storyContinuation": "续写的故事内容。段落之间必须使用且仅使用 \\n\\n 分隔。",
  "choices": [
    { "id": "choice1", "text": "第一个选项描述" },
    { "id": "choice2", "text": "第二个选项描述" },
    { "id": "choice3", "text": "第三个选项描述" }
  ],
  "structureThinking": "对后续小说结构的思考和规划，包括如何根据用户的选择调整当前故事结构",
  "preferenceThinking": "对用户偏好的分析和推断，根据历史选择推测用户喜好并规划如何利用这些偏好来设计后续情节或选项"
}`;
    } else {
      basePrompt += `
{
  "storyContinuation": "续写的故事内容。段落之间必须使用且仅使用 \\n\\n 分隔。",
  "choices": [
    { "id": "choice1", "text": "第一个选项描述" },
    { "id": "choice2", "text": "第二个选项描述" },
    { "id": "choice3", "text": "第三个选项描述" }
  ]
}`;
    }

    basePrompt += `

**JSON 格式细节（强制）**：
1.  **引号**：所有 JSON 键和字符串值**必须**使用双引号 (").
2.  **转义**：字符串值内部的所有特殊字符（如 "、换行符等）**必须**正确转义（例如：\\", \\n）。
3.  **完整性**：确保 JSON 对象完整，无截断、无语法错误（如多余逗号）。
4.   **无额外包装（关键点）**：最终的输出必须是纯粹的、原始的 JSON 字符串本身，绝对不能包含 Markdown 的代码块标记或其他任何解释性文本。响应应直接以 { 开始，并以 } 结束。

**内容生成任务**：
根据用户提供的对话历史（包含之前的故事片段和用户的最新选择）和以下「故事续写要求」，创作故事续写和选项，并填充到上述 JSON 结构的对应字段中。
`;

    // 如果有结构大纲，添加到 prompt 中
    if (currentStructureOutline) {
      basePrompt += `\n**当前故事结构大纲 (${needStructureThinking ? '供参考与更新' : '供参考'})**:
${currentStructureOutline}\n\n`;
    }

    // 如果有结构思考历史，添加到 prompt 中
    if (structureThinkingHistory && structureThinkingHistory.length > 0) {
      basePrompt += `\n**历史结构思考 (仅供参考)**:\n`;
      structureThinkingHistory.forEach(item => {
        basePrompt += `[选择${item.position}次后] ${item.content}\n\n`;
      });
    }

    // 如果有用户偏好分析历史，添加到 prompt 中
    if (preferenceThinkingHistory && preferenceThinkingHistory.length > 0) {
      basePrompt += `\n**历史用户偏好分析 (仅供参考)**:\n`;
      preferenceThinkingHistory.forEach(item => {
        basePrompt += `[选择${item.position}次后] ${item.content}\n\n`;
      });
    }

    basePrompt += `
**故事续写要求**：
0.  **语言要求（最重要）**：**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文字母(如stay、very、really、suddenly、quickly、carefully、quietly、immediately、finally等)、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语、泰语等任何外语。所有内容必须100%使用简体中文汉字和中文标点符号。对话内容必须使用中文引号（"对话内容"），绝不使用英文引号。如果需要表达"停留"，必须使用"停留"而不是"stay"；如果需要表达"突然"，必须使用"突然"而不是"suddenly"；如果需要表达"小心地"，必须使用"小心地"而不是"carefully"。绝不允许夹杂任何外语单词。**
1.  **高度连贯性**：续写内容**必须**紧密衔接之前的故事情节和用户做出的最新选择。保持人物性格、动机、故事背景和整体基调的一致性。**允许在叙事需要时进行合理的场景切换或时间跳跃，但必须过渡自然，服务于故事整体逻辑，** 绝不允许出现逻辑断裂或与前文矛盾之处。
2.  **服务故事主线**：续写部分**必须**有效地推动核心情节发展，或深化人物形象，或揭示重要信息。避免无关的旁枝末节或仅仅为了填充字数的无效描写（牢记"故事优先"原则）。
3.  **保持吸引力 ("好看")**：
    *   在连贯的基础上，继续营造悬念、加剧冲突或探索新的情节可能性，维持读者的阅读兴趣。
    *   运用生动具体的描写（视觉、听觉等感官细节），保持故事的画面感和真实感。
    *   语言风格应与故事已有部分保持一致，力求精准、流畅。
    *   **对话格式要求**：所有人物对话必须使用中文引号格式："人物说的话"，绝不使用其他引号形式。
4.  **后续选项质量与多样性**：
    *   提出的**三个**选项必须是基于当前故事点的合理延伸，**可以包含直接情节推进、角色具体行动或决定、探索不同地点/视角、或引入新的变数**。
    *   选项之间应有明显区分，各自导向不同的、有意义的情节发展方向。
    *   **至少包含一个**提供显著变化、转折或探索不同可能性的选项，以增加故事的丰富度和不可预测性。
    *   **所有选项必须**与当前故事背景和人物状态保持逻辑关联，**不得完全脱离故事**，并具有潜在的叙事价值。
    *   选项描述需简洁、清晰，能准确预示选择后的故事走向。
5.  **字数控制**：续写的故事内容长度严格控制在 300 至 500 字之间。
`;

    // 如果是第5、10、15...次选择，添加额外思考要求
    if (needStructureThinking) {
      basePrompt += `
**额外思考要求（因为这是第${choiceCount}次选择）**：
1. **结构思考**：分析故事当前的发展状态，对后续结构进行深入思考。考虑当前情节如何发展，需要注意哪些主题和矛盾，如何推动故事向高潮迈进。
2. **用户偏好分析**：基于用户之前的${choiceCount}次选择，推断用户的偏好和兴趣点。考虑用户是更偏向冒险、对话、情感描写还是其他方面，并思考如何在后续选项和内容中融入这些偏好。
`;
    }

    const systemPrompt = generateThinkingSteps(basePrompt, modelConfig.thinking);

    return await retryWithBackoff(async () => {
      // --- Start Logging ---
      const requestBody = {
        model: modelConfig.name,
        messages: [
          {
            role: 'system',
            content: '你的唯一输出必须是单个、完整且语法绝对正确的 JSON 对象。禁止在 JSON 对象之外添加任何其他内容。请注意生成的内容不要有```json这种表示markdown的格式表示, 直接返回对象即可。**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文字母(如stay、very、really、suddenly、quickly等)、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语等。所有内容必须100%使用简体中文汉字和中文标点符号。如果想表达"停留"，必须使用"停留"而不是"stay"；如果想表达"突然"，必须使用"突然"而不是"suddenly"。** 特别注意：1) 所有字符串值必须用英文双引号(")包围，绝不使用中文引号(""") 2) 字符串内容中的对话可以使用中文引号，但必须正确转义 3) 不能有尾随逗号 4) 所有特殊字符必须正确转义 5) JSON对象必须完整且格式正确。'
          },
          ...history,
          { role: 'user', content: systemPrompt }
        ],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxTokens,
        top_p: modelConfig.topP,
        frequency_penalty: modelConfig.frequencyPenalty,
        presence_penalty: modelConfig.presencePenalty,
        // response_format: { type: "json_object" } // Gemini may not support this parameter
      };
      // --- Development Logging Only ---
      if (import.meta.env.DEV) {
        console.log(`[${new Date().toISOString()}] AI Request (continueStoryAndGenerateChoices)`);
        console.log(`  Status: Sending request...`);
      }

      const response = await enhancedFetch(modelConfig.endpoint, {
        method: 'POST',
        headers: { // Enhanced headers for better Android browser compatibility
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (compatible; NovelApp/1.0)'
        },
        body: JSON.stringify(requestBody),
        // Add timeout and other options for better compatibility
        signal: createTimeoutSignal(60000), // 60 second timeout
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
         // Log error response body if possible
        try {
          const errorBody = await response.text();
          console.error(`[${new Date().toISOString()}] AI Request Failed (continueStoryAndGenerateChoices). Status: ${response.status}. Body: ${errorBody}`);
        } catch (e) {
          console.error(`[${new Date().toISOString()}] AI Request Failed (continueStoryAndGenerateChoices). Status: ${response.status}. Could not read error body:`, e); // Fix: Use 'e'
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (import.meta.env.DEV) {
        console.log('AI Response received (Continuation)');
      }

      if (!data.choices?.[0]?.message?.content) {
        if (import.meta.env.DEV) {
          console.error('AI Response missing content:', data);
        }
        throw new Error('AI response structure unexpected or content missing');
      }

      const result = safeJsonParse(data.choices[0].message.content);

      if (!result.storyContinuation || !Array.isArray(result.choices) || result.choices.length !== 3) {
        throw new Error('AI response missing required fields or has incorrect format');
      }

      return {
        storyContinuation: result.storyContinuation,
        choices: result.choices,
        structureThinking: result.structureThinking,
        preferenceThinking: result.preferenceThinking
      };
    });
  } catch (error) {
    console.error('Error continuing story:', error);
    throw error;
  }
};

export const handleAiError = (error: Error, defaultMessage: string = 'AI服务暂时不可用，请稍后再试'): string => {
  console.error('AI Service Error:', error);

  // Network and connectivity errors (common on Android browsers)
  if (error.message.includes('网络连接不可用')) {
    return '网络连接不可用，请检查网络设置后重试';
  } else if (error.message.includes('请求超时')) {
    return '网络请求超时，请检查网络连接或稍后重试';
  } else if (error.message.includes('网络连接失败')) {
    return '网络连接失败，请检查网络设置或稍后重试';
  } else if (error.message.includes('跨域请求被阻止')) {
    return '网络请求被阻止，请尝试刷新页面或联系开发者';
  } else if (error.message.includes('安全连接失败')) {
    return '安全连接失败，请检查网络设置或尝试使用其他网络';
  }

  // API specific errors
  else if (error.message.includes('API error: 429')) {
    return '请求次数过多，请稍后再试';
  } else if (error.message.includes('API error: 503')) {
    return 'AI服务暂时不可用，系统正在尝试重新连接，请稍候...';
  } else if (error.message.includes('API error: 5')) { // Catch 5xx errors
    return 'AI服务器暂时不可用，请稍后再试';
  } else if (error.message.includes('Invalid JSON response')) {
    return 'AI返回的格式有误，请重试';
  } else if (error.message.includes('解析错误:')) { // Assuming this is a custom error message prefix
    return `${error.message}，请重试`;
  } else if (error.message.includes('API error: 403')) {
    return 'AI服务授权失败，请检查API密钥是否正确';
  } else if (error.message.includes('API error: 400')) { // Add specific message for 400
    return '请求参数错误，请检查输入或联系开发者';
  } else if (error.message.includes('missing required fields')) {
    return 'AI返回的内容格式不完整，请重试';
  }

  // Browser compatibility errors
  else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    return '网络请求失败，请检查网络连接或刷新页面重试';
  } else if (error.name === 'AbortError') {
    return '请求被中断，请重试';
  }

  return defaultMessage;
};