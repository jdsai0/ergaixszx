import React, { useState, useEffect } from 'react';
import { NovelStyle, ThinkingHistoryItem, StoryChoice, HistoryItem, NovelHistory } from './types';
import { novelStyles } from './data/novelStyles'; // Keep 3 satisfied, update 5
import { generateInitialStoryAndChoices, generateInitialStructure, continueStoryAndGenerateChoices, handleAiError } from './services/aiService';
import { useNovelStore } from './store/novelStore';
import HistoryScreen from './components/HistoryScreen';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'style' | 'novel' | 'history'>('style');
  const [selectedStyle, setSelectedStyle] = useState<NovelStyle | null>(null);
  const [storyContent, setStoryContent] = useState<string>('');
  const [currentChoices, setCurrentChoices] = useState<StoryChoice[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [structureOutline, setStructureOutline] = useState<string | null>(null);
  const [structureThinkingHistory, setStructureThinkingHistory] = useState<ThinkingHistoryItem[]>([]);
  const [preferenceThinkingHistory, setPreferenceThinkingHistory] = useState<ThinkingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const { addHistory, updateHistory } = useNovelStore();
  // Debug: Check environment variables (development only)
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Environment Variables Check:');
      console.log('VITE_AI_API_KEY:', import.meta.env.VITE_AI_API_KEY ? 'SET' : 'NOT SET');
      console.log('Model configured:', import.meta.env.VITE_AI_CREATIVE_MODEL_NAME ? 'YES' : 'NO');
    }
  }, []);

  // 滚动监听，实现标题栏的显示/隐藏
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 只在小说阅读页面启用滚动隐藏
      if (currentScreen !== 'novel') {
        setIsHeaderVisible(true);
        return;
      }

      // 滚动距离小于 100px 时始终显示标题栏
      if (currentScrollY < 100) {
        setIsHeaderVisible(true);
      } else {
        // 向下滚动隐藏，向上滚动显示
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsHeaderVisible(false);
        } else if (currentScrollY < lastScrollY) {
          setIsHeaderVisible(true);
        }
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, currentScreen]);

  // 浏览器历史管理 - 移动端返回优化
  useEffect(() => {
    const handlePopState = () => {
      // 根据当前页面状态决定返回行为
      if (currentScreen === 'novel') {
        // 从小说页面返回到风格选择页面
        setCurrentScreen('style');
        setCurrentHistoryId(null);
      } else if (currentScreen === 'history') {
        // 从历史记录页面返回到风格选择页面
        setCurrentScreen('style');
      }
      // 如果已经在风格选择页面，则允许正常退出
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentScreen]);

  // 网络状态监听 - 安卓浏览器优化
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 统一的页面切换函数，管理浏览器历史
  const navigateToScreen = (screen: 'style' | 'novel' | 'history') => {
    setCurrentScreen(screen);

    // 如果不是返回到风格选择页面，则添加历史记录
    if (screen !== 'style') {
      window.history.pushState({ screen }, '', window.location.href);
    }
  };

  const handleStyleSelect = async (style: NovelStyle) => {
    // 检查网络连接
    if (!isOnline) {
      setError('网络连接不可用，请检查网络设置后重试');
      return;
    }

    setSelectedStyle(style);
    setError(null);
    setStoryContent('');
    setCurrentChoices([]);
    setHistory([]);
    setCurrentHistoryId(null);

    // 立即跳转到小说界面并显示加载状态
    navigateToScreen('novel');
    setIsLoading(true);

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
      const historyId = crypto.randomUUID();
      const newHistory = {
        id: historyId,
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
      setCurrentHistoryId(historyId);

      setStoryContent(story);
      setCurrentChoices(choices);
      setHistory([{ role: 'assistant', content: story }]);
    } catch (err) {
      const errorMessage = handleAiError(err as Error);
      setError(errorMessage);
      // 保持在小说界面显示错误，不返回风格选择界面
    } finally {
      setIsLoading(false);
    }
  };

  const handleChoiceSelected = async (choice: StoryChoice) => {
    if (isLoading) return;

    // 检查网络连接
    if (!isOnline) {
      setError('网络连接不可用，请检查网络设置后重试');
      return;
    }

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
      let updatedStructureThinkingHistory = structureThinkingHistory;
      let updatedPreferenceThinkingHistory = preferenceThinkingHistory;

      if (structureThinking) {
        updatedStructureThinkingHistory = [...structureThinkingHistory];
        updatedStructureThinkingHistory.push({
          position: choiceCount,
          content: structureThinking
        });
        setStructureThinkingHistory(updatedStructureThinkingHistory);
      }

      if (preferenceThinking) {
        updatedPreferenceThinkingHistory = [...preferenceThinkingHistory];
        updatedPreferenceThinkingHistory.push({
          position: choiceCount,
          content: preferenceThinking
        });
        setPreferenceThinkingHistory(updatedPreferenceThinkingHistory);
      }

      // 更新历史记录
      if (currentHistoryId && selectedStyle) {
        updateHistory(currentHistoryId, {
          content: finalContent,
          choices,
          history: finalHistory,
          structureThinkingHistory: updatedStructureThinkingHistory,
          preferenceThinkingHistory: updatedPreferenceThinkingHistory,
          lastUpdated: Date.now()
        });
      }

    } catch (err) {
      const errorMessage = handleAiError(err as Error);
      setError(errorMessage);
      setCurrentChoices(currentChoices);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadHistory = (history: NovelHistory) => {
    setSelectedStyle(history.style);
    setStoryContent(history.content);
    setCurrentChoices(history.choices);
    setHistory(history.history);
    setStructureOutline(history.structureOutline || null);
    setStructureThinkingHistory(history.structureThinkingHistory || []);
    setPreferenceThinkingHistory(history.preferenceThinkingHistory || []);
    setCurrentHistoryId(history.id);
    navigateToScreen('novel');
    setError(null);
  };

  return (
    <>
      {/* 网络状态指示器 - 仅在离线时显示 */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-[60] text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span>网络连接不可用，请检查网络设置</span>
          </div>
        </div>
      )}

      {currentScreen === 'history' ? (
        <HistoryScreen
          onBackToStyle={() => navigateToScreen('style')}
          onLoadHistory={handleLoadHistory}
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
          {/* 背景装饰元素 - 温和风格 */}
          <div className="absolute inset-0 overflow-hidden mobile-float-hidden md:block">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-40 left-1/2 w-80 h-80 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float" style={{animationDelay: '4s'}}></div>
          </div>

          <div className="relative z-10">
        {currentScreen === 'style' && (
          <>
            <div className="text-center mb-8 md:mb-12 pt-4 md:pt-8 animate-fade-in-up mobile-reduced-motion px-2 relative">
              {/* 历史记录按钮 - 右上角 */}
              <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
                <button
                  onClick={() => {
                    console.log('历史记录按钮被点击');
                    navigateToScreen('history');
                  }}
                  className="glass-effect text-blue-200 hover:text-white rounded-lg md:rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 border border-blue-500/30 hover:border-purple-400/50 mobile-touch p-2 md:p-3 relative z-10"
                  title="查看历史记录"
                >
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl mobile-title font-bold text-white mb-2 md:mb-4 drop-shadow-2xl">
                共笔天下
              </h1>
              <p className="text-lg md:text-xl lg:text-2xl mobile-subtitle text-blue-100 mb-2 md:mb-3 font-light">
                AI 交互式小说生成器
              </p>
              <div className="w-16 md:w-24 h-1 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 mx-auto rounded-full"></div>
            </div>

            <div className="max-w-7xl mx-auto px-1 md:px-2">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-4 md:mb-6 text-center animate-fade-in-up mobile-reduced-motion" style={{animationDelay: '0.2s'}}>
                选择您喜欢的小说风格
              </h2>

              {error && (
                <div className="glass-effect-dark border border-red-400/30 text-red-200 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl mb-4 md:mb-6 max-w-2xl mx-auto backdrop-blur-sm animate-fade-in-up mobile-error mobile-reduced-motion">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-sm md:text-base">{error}</span>
                  </div>
                </div>
              )}

              <div className="card-grid px-0 md:px-1 mobile-grid">
                {novelStyles.map((style, index) => (
                  <div
                    key={style.id}
                    className="group glass-effect rounded-xl md:rounded-2xl overflow-hidden card-hover animate-fade-in-up mobile-card mobile-reduced-motion mobile-touch h-full flex flex-col"
                    style={{animationDelay: `${index * 0.1}s`}}
                  >
                    {/* 图片区域 */}
                    <div className="relative h-32 sm:h-36 overflow-hidden bg-gray-900 rounded-lg mx-1 mt-1">
                      {style.imageUrl ? (
                        <img
                          src={style.imageUrl}
                          alt={style.name}
                          className="w-full h-full object-cover rounded-lg"
                          onLoad={() => console.log('✅ Image loaded:', style.name)}
                          onError={() => console.error('❌ Image error:', style.name)}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center rounded-lg">
                          <div className="text-white text-2xl">📖</div>
                        </div>
                      )}


                    </div>

                    <div className="p-1 md:p-2 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 md:w-3 h-2 md:h-3 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
                        <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-purple-200 transition-colors">
                          {style.name}
                        </h3>
                      </div>

                      <p className="text-blue-100 mb-2 text-sm leading-relaxed flex-shrink-0">
                        {style.description}
                      </p>

                      <div className="mb-2 flex-grow">
                        <p className="text-xs md:text-sm font-semibold text-blue-200 mb-1 flex items-center gap-1 md:gap-2">
                          <span className="w-1 h-1 bg-purple-400 rounded-full"></span>
                          示例片段
                        </p>
                        <div className="bg-black/20 rounded-lg p-1.5 border border-blue-500/20 flex-grow overflow-y-auto max-h-32">
                          <p className="text-xs text-blue-100 italic leading-tight whitespace-pre-line sample-text">
                            {style.sampleText.replace(/\n\n+/g, '\n\n')}
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={isLoading}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStyleSelect(style);
                        }}
                        className="btn-primary w-full group-hover:shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mobile-btn mobile-touch mt-auto flex-shrink-0"
                      >
                        <span className="relative z-10">
                          {isLoading ? '生成中...' : '选择这个风格'}
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {currentScreen === 'novel' && selectedStyle && (
          <>
            {/* 固定在顶部的标题栏 - 支持滑动隐藏 */}
            <div className={`fixed left-0 right-0 glass-effect-dark z-50 border-b border-slate-500/20 backdrop-blur-xl mobile-header transition-transform duration-300 ease-in-out ${
              isHeaderVisible ? 'top-0 translate-y-0' : '-top-full -translate-y-full'
            }`}>
              <div className="max-w-4xl mx-auto px-4 md:px-6 py-3 md:py-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"></div>
                    <h1 className="text-lg md:text-xl font-bold text-white">
                      {selectedStyle.name} 风格小说
                    </h1>
                  </div>
                  <button
                    onClick={() => {
                      navigateToScreen('style');
                      setCurrentHistoryId(null);
                    }}
                    className="px-4 md:px-6 py-2 glass-effect text-blue-200 hover:text-white rounded-lg md:rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/25 border border-blue-500/30 hover:border-purple-400/50 mobile-touch text-sm md:text-base"
                  >
                    返回选择
                  </button>
                </div>
              </div>
            </div>

            {/* 主要内容区域，添加顶部间距以避免被固定标题栏遮挡 */}
            <div className={`max-w-4xl mx-auto px-4 md:px-6 mobile-content mobile-scroll ${
              !isOnline ? 'pt-28 md:pt-32' : 'pt-20 md:pt-24'
            }`}>
              <div className="glass-effect rounded-xl md:rounded-2xl p-4 md:p-8 animate-fade-in-up mobile-reduced-motion">
                <div className="prose max-w-none mb-6 md:mb-8">
                  <div className="bg-black/10 backdrop-blur-sm rounded-lg md:rounded-xl p-4 md:p-6 border border-slate-500/20 mobile-story">
                    <p className="text-white leading-relaxed whitespace-pre-wrap text-base md:text-lg">
                      {storyContent}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="glass-effect-dark border border-red-400/30 text-red-200 px-4 md:px-6 py-3 md:py-4 rounded-lg md:rounded-xl mb-6 md:mb-8 backdrop-blur-sm mobile-error">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse flex-shrink-0"></div>
                        <span className="text-sm md:text-base break-words">{error}</span>
                      </div>
                      {storyContent === '' ? (
                        <button
                          onClick={() => handleStyleSelect(selectedStyle!)}
                          className="px-3 md:px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 text-sm font-medium mobile-touch flex-shrink-0"
                          disabled={isLoading}
                        >
                          重试
                        </button>
                      ) : (
                        <button
                          onClick={() => setError(null)}
                          className="px-3 md:px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-300 text-sm font-medium mobile-touch flex-shrink-0"
                        >
                          关闭
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {isLoading ? (
                  <div className="text-center py-8 md:py-12 mobile-loading">
                    <div className="relative">
                      <div className="inline-block animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-4 border-purple-300 border-t-purple-600"></div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-20 animate-pulse"></div>
                    </div>
                    <p className="mt-3 md:mt-4 text-purple-100 text-base md:text-lg font-medium">故事正在生成...</p>
                  </div>
                ) : (
                  currentChoices.length > 0 && (
                    <div className="space-y-3 md:space-y-4">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                        <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse"></div>
                        选择你的行动
                      </h3>
                      {currentChoices.map((choice, index) => (
                        <button
                          key={choice.id}
                          className="w-full text-left p-3 md:p-4 glass-effect rounded-lg md:rounded-xl transition-all duration-300 border border-blue-500/20 hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 group animate-fade-in-up mobile-choice mobile-reduced-motion mobile-touch"
                          style={{animationDelay: `${index * 0.1}s`}}
                          onClick={() => handleChoiceSelected(choice)}
                        >
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-1 h-1 bg-purple-400 rounded-full group-hover:w-2 group-hover:h-2 transition-all duration-300 flex-shrink-0"></div>
                            <span className="text-blue-100 group-hover:text-white transition-colors duration-300 font-medium text-sm md:text-base leading-relaxed">
                              {choice.text}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;