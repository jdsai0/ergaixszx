import React from 'react';
import { NovelStyle } from '../types';
import StyleCard from './StyleCardWithImage';
import LoadingIndicator from './LoadingIndicator';
import * as Dialog from '@radix-ui/react-dialog';
import { Clock, X } from 'lucide-react';
import { useNovelStore } from '../store/novelStore';
import { useThemeStore } from './ThemeSwitcher';
import ThemeSwitcher from './ThemeSwitcher';

interface StyleSelectionScreenProps {
  styles: NovelStyle[];
  onSelectStyle: (style: NovelStyle) => void;
  isLoading: boolean;
  error: string | null;
}

const StyleSelectionScreen: React.FC<StyleSelectionScreenProps> = ({
  styles,
  onSelectStyle,
  isLoading,
  error
}) => {
  const histories = useNovelStore((state) => state.histories);
  const theme = useThemeStore((state) => state.theme);

  const handleHistorySelect = (style: NovelStyle) => {
    onSelectStyle(style);
  };

  return (
    <div className={`min-h-screen ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
        : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
    }`}>
      {/* Header with controls */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-white/10 border-b border-white/20">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${
              theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
            } flex items-center justify-center animate-icon-bounce`}>
              <span className="text-white font-bold text-sm">共</span>
            </div>
            <span className={`font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            } hidden sm:inline`}>共笔天下</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* History Dialog */}
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button
                  className={`px-3 py-2 sm:px-4 ${
                    theme === 'dark'
                      ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                      : 'bg-white/80 hover:bg-white text-gray-700 border-gray-200'
                  } border rounded-lg transition-all duration-200 flex items-center gap-2 backdrop-blur-sm text-sm sm:text-base`}
                  aria-label="阅读历史"
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">历史记录</span>
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                <Dialog.Content className={`fixed right-0 top-0 h-full w-full max-w-md ${
                  theme === 'dark' ? 'bg-gray-900' : 'bg-white'
                } p-6 shadow-xl animate-slide-in-right`}>
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className={`text-xl font-semibold ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                    }`}>阅读历史</Dialog.Title>
                    <Dialog.Close asChild>
                      <button className={`p-2 ${
                        theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      } rounded-full`} aria-label="关闭">
                        <X className={`w-5 h-5 ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`} />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="space-y-4">
                    {histories.length === 0 ? (
                      <p className={`text-center py-8 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>暂无阅读历史</p>
                    ) : (
                      histories.map((history) => (
                        <button
                          key={history.id}
                          onClick={() => handleHistorySelect(history.style)}
                          className={`w-full text-left p-4 ${
                            theme === 'dark'
                              ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                          } rounded-lg transition-colors`}
                        >
                          <h3 className="font-medium mb-2">{history.style.name}</h3>
                          <p className={`text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          } line-clamp-2`}>{history.content}</p>
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          } mt-2`}>
                            {new Date(history.lastUpdated).toLocaleString()}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>

            <ThemeSwitcher />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero section */}
        <div className="text-center mb-8 md:mb-16">
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 animate-fade-in-up ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            共笔天下
          </h1>
          <div className={`w-24 h-1 ${
            theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-gradient-to-r from-blue-500 to-purple-500'
          } mx-auto mb-6 animate-gradient-flow`}></div>
          <p className={`text-lg md:text-xl lg:text-2xl ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          } max-w-3xl mx-auto leading-relaxed animate-fade-in-up`} style={{animationDelay: '0.2s'}}>
            AI交互式小说生成器
          </p>
          <p className={`text-base md:text-lg ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          } max-w-2xl mx-auto mt-4 animate-fade-in-up`} style={{animationDelay: '0.4s'}}>
            选择您喜欢的小说风格
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-8 text-red-200 max-w-2xl mx-auto backdrop-blur-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center mt-16">
            <LoadingIndicator text="正在准备您的小说..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {styles.map((style, index) => (
              <div
                key={style.id}
                className={`animate-card-entrance card-delay-${Math.min(index + 1, 8)}`}
              >
                <StyleCard
                  style={style}
                  onSelect={() => onSelectStyle(style)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StyleSelectionScreen;