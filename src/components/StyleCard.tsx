import React, { useState } from 'react';
import { NovelStyle } from '../types';
import { useThemeStore } from './ThemeSwitcher';
import { ArrowRight, BookOpen, Feather, Crown, Heart, Sword, Sparkles, Zap, Star } from 'lucide-react';

interface StyleCardProps {
  style: NovelStyle;
  onSelect: () => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ style, onSelect }) => {
  const theme = useThemeStore((state) => state.theme);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 获取风格对应的图标
  const getStyleIcon = (styleId: string) => {
    const icons: { [key: string]: string } = {
      'wuxia': '⚔️',
      'scifi': '🚀',
      'fantasy': '🔮',
      'mystery': '🔍',
      'xianxia': '⛰️',
      'ceo_romance': '💼',
      'solo_leveling': '⚡',
      'regent_prince': '👑'
    };
    return icons[styleId] || '📖';
  };

  return (
    <div
      className={`group relative ${
        theme === 'dark'
          ? 'bg-white/5 hover:bg-white/10 border-white/10'
          : 'bg-white/80 hover:bg-white border-gray-200'
      } backdrop-blur-sm border rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer`}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 背景装饰 */}
      <div className={`absolute inset-0 ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10'
          : 'bg-gradient-to-br from-blue-50/50 to-purple-50/50'
      } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

      {/* 图标和标题区域 */}
      <div className="relative p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${
            theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
          } flex items-center justify-center text-xl sm:text-2xl transition-transform duration-300 group-hover:scale-110`}>
            {getStyleIcon(style.id)}
          </div>

          <div className={`p-2 rounded-full ${
            theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
          } opacity-0 group-hover:opacity-100 transition-all duration-300 ${
            isHovered ? 'translate-x-0' : 'translate-x-2'
          }`}>
            <ArrowRight className={`w-3 h-3 sm:w-4 sm:h-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-600'
            }`} />
          </div>
        </div>

        <h3 className={`text-lg sm:text-xl font-bold mb-2 sm:mb-3 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        } group-hover:text-blue-500 transition-colors duration-300`}>
          {style.name}
        </h3>

        <p className={`text-sm leading-relaxed ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        } mb-3 sm:mb-4`}>
          {style.description}
        </p>

        {/* 示例文本预览 */}
        <div className={`text-xs ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        } line-clamp-2 sm:line-clamp-3 opacity-70 group-hover:opacity-100 transition-opacity duration-300 mb-4 sm:mb-0`}>
          {style.sampleText.split('\n')[0].substring(0, 60)}...
        </div>

        {/* 选择按钮 */}
        <div className="mt-4 sm:mt-6">
          <button className={`modern-btn w-full py-2.5 sm:py-3 px-4 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
            theme === 'dark'
              ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 hover:border-blue-400/50'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 hover:border-blue-300'
          } group-hover:shadow-lg group-hover:scale-105`}>
            选择这个风格
          </button>
        </div>
      </div>

      {/* 悬浮效果装饰 */}
      <div className={`absolute top-0 left-0 w-full h-1 ${
        theme === 'dark' ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 'bg-gradient-to-r from-blue-500 to-purple-500'
      } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
    </div>
  );
};

export default StyleCard;