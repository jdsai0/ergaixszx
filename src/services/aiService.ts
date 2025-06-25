import { HistoryItem, StoryChoice, EnhancedContinuationResponse, ThinkingHistoryItem } from '../types';

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

const safeJsonParse = (text: string) => {
  let cleaned = text.trim();

  // Remove Markdown code fences like ```json ... ```
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Remove non-Chinese characters that might have been accidentally inserted
  // Keep Chinese characters, ASCII characters, common punctuation, Chinese quotes, and JSON structure characters
  cleaned = cleaned.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\u0020-\u007E\u00A0-\u00FF\u3000-\u303F\uFF00-\uFFEF\u2000-\u206F\s]/g, '');

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
    console.error('Raw Response:', text);
    console.error('Cleaned Response:', cleaned);

    // Try one more aggressive fix
    let lastAttempt = cleaned;

    // Fix unescaped quotes in string values
    lastAttempt = fixUnescapedQuotes(lastAttempt);

    // Remove trailing commas more aggressively
    lastAttempt = lastAttempt.replace(/,(\s*[}\]])/g, '$1');

    // Try to fix missing quotes around keys
    lastAttempt = lastAttempt.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    try {
      console.log('Attempting final parse with fixed quotes:', lastAttempt);
      return JSON.parse(lastAttempt);
    } catch (finalError) {
      console.error('Final JSON Parse Attempt Failed:', finalError);
      console.error('Final Attempt String:', lastAttempt);
      throw new Error(`Invalid JSON response from AI service: ${(error as Error).message}`);
    }
  }
};

// Helper function to fix unescaped quotes in JSON string values
const fixUnescapedQuotes = (jsonString: string): string => {
  try {
    // More robust approach: parse character by character to fix quotes in string values
    let result = '';
    let inString = false;
    let escapeNext = false;
    let stringDelimiter = '';

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      const prevChar = i > 0 ? jsonString[i - 1] : '';

      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        if (!inString) {
          // Starting a string
          inString = true;
          stringDelimiter = '"';
          result += char;
        } else if (inString && stringDelimiter === '"') {
          // Check if this is the end of the string by looking ahead
          // If the next non-whitespace character is : or , or } or ], it's likely the end
          let nextNonSpace = '';
          for (let j = i + 1; j < jsonString.length; j++) {
            if (!/\s/.test(jsonString[j])) {
              nextNonSpace = jsonString[j];
              break;
            }
          }

          if (nextNonSpace === ':' || nextNonSpace === ',' || nextNonSpace === '}' || nextNonSpace === ']') {
            // This is the end of the string
            inString = false;
            stringDelimiter = '';
            result += char;
          } else {
            // This is a quote inside the string, escape it
            result += '\\"';
          }
        } else {
          result += char;
        }
      } else {
        result += char;
      }
    }

    return result;
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
            content: '你的唯一输出必须是单个、完整且语法绝对正确的 JSON 对象。禁止在 JSON 对象之外添加任何其他内容。**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语等。所有内容必须100%使用简体中文汉字和中文标点符号。** 特别注意：1) 所有字符串值必须用双引号包围 2) 不能有尾随逗号 3) 所有特殊字符必须正确转义 4) JSON对象必须完整且格式正确。'
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

      const response = await fetch(modelConfig.endpoint, {
        method: 'POST',
        headers: { // Use original headers for the actual request
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody)
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
            content: '你的唯一输出必须是单个、完整且语法绝对正确的 JSON 对象。禁止在 JSON 对象之外添加任何其他内容。**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语等。所有内容必须100%使用简体中文汉字和中文标点符号。** 特别注意：1) 所有字符串值必须用双引号包围 2) 不能有尾随逗号 3) 所有特殊字符必须正确转义 4) JSON对象必须完整且格式正确。'
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

      const response = await fetch(modelConfig.endpoint, {
        method: 'POST',
        headers: { // Use original headers for the actual request
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody)
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
0.  **语言要求（最重要）**：**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文字母、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语、泰语等任何外语。所有内容必须100%使用简体中文汉字和中文标点符号。对话内容必须使用中文引号（"对话内容"），绝不使用英文引号。如果需要表达"或者"、"了解"、"探索"等含义，必须使用"或者"、"了解"、"探索"等纯中文词汇，绝不允许夹杂任何外语单词。**
1.  **高度连贯性**：续写内容**必须**紧密衔接之前的故事情节和用户做出的最新选择。保持人物性格、动机、故事背景和整体基调的一致性。**允许在叙事需要时进行合理的场景切换或时间跳跃，但必须过渡自然，服务于故事整体逻辑，** 绝不允许出现逻辑断裂或与前文矛盾之处。
2.  **服务故事主线**：续写部分**必须**有效地推动核心情节发展，或深化人物形象，或揭示重要信息。避免无关的旁枝末节或仅仅为了填充字数的无效描写（牢记"故事优先"原则）。
3.  **保持吸引力 ("好看")**：
    *   在连贯的基础上，继续营造悬念、加剧冲突或探索新的情节可能性，维持读者的阅读兴趣。
    *   运用生动具体的描写（视觉、听觉等感官细节），保持故事的画面感和真实感。
    *   语言风格应与故事已有部分保持一致，力求精准、流畅。
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
            content: '你的唯一输出必须是单个、完整且语法绝对正确的 JSON 对象。禁止在 JSON 对象之外添加任何其他内容。请注意生成的内容不要有```json这种表示markdown的格式表示, 直接返回对象即可。**绝对禁令：严禁在任何地方使用非中文字符！包括但不限于：英文、俄语、印地语、阿拉伯语、孟加拉语、日语、韩语等。所有内容必须100%使用简体中文汉字和中文标点符号。** 特别注意：1) 所有字符串值必须用双引号包围 2) 不能有尾随逗号 3) 所有特殊字符必须正确转义 4) JSON对象必须完整且格式正确。'
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

      const response = await fetch(modelConfig.endpoint, {
        method: 'POST',
        headers: { // Use original headers for the actual request
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody)
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

  if (error.message.includes('API error: 429')) {
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

  return defaultMessage;
};