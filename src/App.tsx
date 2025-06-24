import React, { useState } from 'react';
import { NovelStyle, ThinkingHistoryItem, StoryChoice, HistoryItem } from './types';
import { novelStyles } from './data/novelStyles';
import { generateInitialStoryAndChoices, generateInitialStructure, continueStoryAndGenerateChoices, handleAiError } from './services/aiService';
import { useNovelStore } from './store/novelStore';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'style' | 'novel'>('style');
  const [selectedStyle, setSelectedStyle] = useState<NovelStyle | null>(null);
  const [storyContent, setStoryContent] = useState<string>('');
  const [currentChoices, setCurrentChoices] = useState<StoryChoice[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [structureOutline, setStructureOutline] = useState<string | null>(null);
  const [structureThinkingHistory, setStructureThinkingHistory] = useState<ThinkingHistoryItem[]>([]);
  const [preferenceThinkingHistory, setPreferenceThinkingHistory] = useState<ThinkingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { addHistory } = useNovelStore();
  // Debug: Check environment variables
  React.useEffect(() => {
    console.log('Environment Variables Check:');
    console.log('VITE_AI_API_KEY:', import.meta.env.VITE_AI_API_KEY ? 'SET' : 'NOT SET');
    console.log('VITE_AI_CREATIVE_MODEL_NAME:', import.meta.env.VITE_AI_CREATIVE_MODEL_NAME);
    console.log('VITE_AI_CREATIVE_MODEL_ENDPOINT:', import.meta.env.VITE_AI_CREATIVE_MODEL_ENDPOINT);
  }, []);

  const handleStyleSelect = async (style: NovelStyle) => {
    setSelectedStyle(style);
    setIsLoading(true);
    setError(null);

    try {
      // Generate initial story and structure
      const { story, choices } = await generateInitialStoryAndChoices(
        style.prompt,
        'creative'
      );
      const initialOutline = await generateInitialStructure(style.prompt, 'balanced');
      setStructureOutline(initialOutline);

      // Reset thinking history
      setStructureThinkingHistory([]);
      setPreferenceThinkingHistory([]);

      // Create new history entry
      const newHistory = {
        id: crypto.randomUUID(),
        style,
        lastUpdated: Date.now(),
        content: story,
        choices,
        history: [{ role: 'assistant' as const, content: story }],
        structureOutline: initialOutline,
        structureThinkingHistory: [],
        preferenceThinkingHistory: []
      };

      // Add history to the local store
      addHistory(newHistory);

      setStoryContent(story);
      setCurrentChoices(choices);
      setHistory([{ role: 'assistant', content: story }]);
      setCurrentScreen('novel');
    } catch (err) {
      const errorMessage = handleAiError(err as Error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoiceSelected = async (choice: StoryChoice) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const userChoice = `> 你选择了：${choice.text}`;
    const updatedHistory: HistoryItem[] = [
      ...history,
      { role: 'user', content: userChoice }
    ];
    setHistory(updatedHistory);

    const updatedContent = `${storyContent}\n\n${userChoice}\n\n`;
    setStoryContent(updatedContent);

    try {
      // 计算用户选择次数
      const choiceCount = history.filter(item => item.role === 'user').length;

      const response = await continueStoryAndGenerateChoices(
        updatedHistory,
        'creative',
        structureOutline,
        choiceCount,
        structureThinkingHistory,
        preferenceThinkingHistory
      );

      const { storyContinuation, choices, structureThinking, preferenceThinking } = response;

      const finalContent = `${updatedContent}${storyContinuation}`;
      const finalHistory: HistoryItem[] = [
        ...updatedHistory,
        { role: 'assistant', content: storyContinuation }
      ];

      setStoryContent(finalContent);
      setCurrentChoices(choices);
      setHistory(finalHistory);

      // 更新思考历史
      if (structureThinking) {
        const updatedStructureThinkingHistory = [...structureThinkingHistory];
        updatedStructureThinkingHistory.push({
          position: choiceCount,
          content: structureThinking
        });
        setStructureThinkingHistory(updatedStructureThinkingHistory);
      }

      if (preferenceThinking) {
        const updatedPreferenceThinkingHistory = [...preferenceThinkingHistory];
        updatedPreferenceThinkingHistory.push({
          position: choiceCount,
          content: preferenceThinking
        });
        setPreferenceThinkingHistory(updatedPreferenceThinkingHistory);
      }

    } catch (err) {
      const errorMessage = handleAiError(err as Error);
      setError(errorMessage);
      setCurrentChoices(currentChoices);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {currentScreen === 'style' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">
                执笔马良 - AI 交互式小说生成器
              </h1>

            </div>

            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                选择您喜欢的小说风格
              </h2>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {novelStyles.map((style) => (
                  <div key={style.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-800 mb-3">{style.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{style.description}</p>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">示例片段:</p>
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded italic">
                        {style.sampleText.substring(0, 100)}...
                      </p>
                    </div>

                    <button
                      onClick={() => handleStyleSelect(style)}
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? '生成中...' : '选择这个风格'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {currentScreen === 'novel' && selectedStyle && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">
                  {selectedStyle.name} 风格小说
                </h1>
                <button
                  onClick={() => setCurrentScreen('style')}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  返回选择
                </button>
              </div>

              <div className="prose max-w-none mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {storyContent}
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">故事正在继续...</p>
                </div>
              ) : (
                currentChoices.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800">选择你的行动：</h3>
                    {currentChoices.map((choice) => (
                      <button
                        key={choice.id}
                        className="w-full text-left p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        onClick={() => handleChoiceSelected(choice)}
                      >
                        {choice.text}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;