import React from 'react'; // Keep React import
import { NovelStyle } from '../types';
import StyleCard from './StyleCard';
import LoadingIndicator from './LoadingIndicator';
import * as Dialog from '@radix-ui/react-dialog';
import { Clock, X } from 'lucide-react'; // Removed LogIn import
import { useNovelStore } from '../store/novelStore';
import { useThemeStore } from './ThemeSwitcher';
// Removed useAuthStore import
import ThemeSwitcher from './ThemeSwitcher';
// Removed AuthModal import

interface StyleSelectionScreenProps {
  styles: NovelStyle[];
  onSelectStyle: (style: NovelStyle) => void; // Keep onSelectStyle, but it won't call AuthModal
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
  // Removed user from useAuthStore
  // Removed showAuthModal state

  // Simplified onSelectStyle call in history mapping (line 80) - no need to check user
  const handleHistorySelect = (style: NovelStyle) => {
      onSelectStyle(style); // Directly call onSelectStyle
  };


  return (
    <div className="container mx-auto px-4 py-6 md:py-12 max-w-6xl">
      <div className="text-center mb-6 md:mb-12 relative">
        <div className="absolute right-0 top-0 flex items-center gap-4">
          {/* History Dialog - Always visible now */}
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button
                className={`p-2 ${
                  theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                } rounded-full transition-colors flex items-center gap-2`}
                aria-label="阅读历史"
              >
                <Clock className="w-5 h-5" />
                <span>历史记录</span>
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
                        // Use the simplified handler
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
          {/* Removed conditional rendering for login button */}
          <ThemeSwitcher />
        </div>

        <h1 className={`text-3xl md:text-5xl font-bold mb-3 md:mb-4 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>共笔天下</h1>
        <p className={`text-lg md:text-xl ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        } max-w-2xl mx-auto`}>
          选择一种小说风格，开始你的交互式阅读之旅。每个选择都将引领故事走向不同的方向。
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 md:p-4 mb-4 md:mb-6 text-red-200 max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center mt-8 md:mt-16">
          <LoadingIndicator text="正在准备您的小说..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4 md:mt-8">
          {styles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              onSelect={() => onSelectStyle(style)} // Direct call, no auth check needed
            />
          ))}
        </div>
      )}

      {/* Removed AuthModal rendering */}
    </div>
  );
};

export default StyleSelectionScreen;