import React from 'react';
import { NovelStyle } from '../types';
import { useThemeStore } from './ThemeSwitcher';

interface StyleCardProps {
  style: NovelStyle;
  onSelect: () => void;
}

const StyleCard: React.FC<StyleCardProps> = ({ style, onSelect }) => {
  const theme = useThemeStore((state) => state.theme);

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
        <img
          src={style.imageUrl}
          alt={style.name}
          className="w-full h-full object-cover"
        />
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