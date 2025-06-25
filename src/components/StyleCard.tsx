import React, { useState } from 'react';
import { NovelStyle } from '../types';
import { useThemeStore } from './ThemeSwitcher';

interface StyleCardProps {
  style: NovelStyle;
  onSelect: () => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ style, onSelect }) => {
  const theme = useThemeStore((state) => state.theme);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`${
        theme === 'dark'
          ? 'bg-gray-800'
          : 'bg-white'
      } rounded-lg overflow-hidden shadow-lg transition-transform duration-300 hover:-translate-y-2 cursor-pointer`}
      onClick={onSelect}
    >
      <div className="h-40 md:h-48 overflow-hidden relative">
        {!imageLoaded && !imageError && (
          <div className={`w-full h-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {imageError ? (
          <div className={`w-full h-full flex flex-col items-center justify-center ${
            theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div className={`text-4xl mb-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              🖼️
            </div>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              图片加载失败
            </span>
          </div>
        ) : (
          <img
            src={style.imageUrl}
            alt={style.name}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-end">
          <h3 className="text-lg md:text-xl font-bold text-white p-3 md:p-4">{style.name}</h3>
        </div>
      </div>
      <div className="p-3 md:p-4">
        <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{style.description}</p>
      </div>
    </div>
  );
};

export default StyleCard;