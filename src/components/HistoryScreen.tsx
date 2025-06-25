import React, { useState } from 'react';
import { NovelHistory, NovelStyle } from '../types';
import { useNovelStore } from '../store/novelStore';

interface HistoryScreenProps {
  onBackToStyle: () => void;
  onLoadHistory: (history: NovelHistory) => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBackToStyle, onLoadHistory }) => {
  const { histories, clearHistories } = useNovelStore();
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes <= 0 ? '刚刚' : `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}小时前`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getContentPreview = (content: string) => {
    // 移除用户选择的内容，只显示故事内容
    const cleanContent = content.replace(/> 你选择了：[^\n]+\n\n/g, '');
    return cleanContent.length > 100 ? cleanContent.substring(0, 100) + '...' : cleanContent;
  };

  const handleClearHistories = () => {
    clearHistories();
    setShowConfirmClear(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 animate-gradient relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden mobile-float-hidden md:block">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* 固定在顶部的标题栏 */}
      <div className="fixed top-0 left-0 right-0 glass-effect-dark z-50 border-b border-slate-500/20 backdrop-blur-xl mobile-header">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
              <h1 className="text-lg md:text-xl font-bold text-white">
                历史记录
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              {histories.length > 0 && (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="px-3 md:px-4 py-2 glass-effect text-red-200 hover:text-red-100 rounded-lg md:rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 border border-red-500/30 hover:border-red-400/50 mobile-touch text-sm md:text-base"
                >
                  清空历史
                </button>
              )}
              <button
                onClick={onBackToStyle}
                className="px-4 md:px-6 py-2 glass-effect text-slate-200 hover:text-white rounded-lg md:rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 border border-slate-500/30 hover:border-blue-400/50 mobile-touch text-sm md:text-base"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="relative z-10 pt-20 md:pt-24 px-4 md:px-6 pb-8">
        <div className="max-w-6xl mx-auto">
          {histories.length === 0 ? (
            <div className="text-center py-16 md:py-24">
              <div className="glass-effect rounded-xl md:rounded-2xl p-8 md:p-12 max-w-md mx-auto">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4">暂无历史记录</h3>
                <p className="text-slate-300 mb-6">开始创作您的第一个故事吧！</p>
                <button
                  onClick={onBackToStyle}
                  className="btn-primary px-6 py-3 rounded-xl font-semibold"
                >
                  开始创作
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {histories.map((history, index) => (
                <div
                  key={history.id}
                  className="group glass-effect rounded-xl md:rounded-2xl overflow-hidden card-hover cursor-pointer animate-fade-in-up mobile-card mobile-reduced-motion mobile-touch"
                  style={{animationDelay: `${index * 0.1}s`}}
                  onClick={() => onLoadHistory(history)}
                >
                  <div className="p-4 md:p-6 h-full flex flex-col">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                      <div className="w-2 md:w-3 h-2 md:h-3 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse"></div>
                      <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-blue-200 transition-colors">
                        {history.style.name}
                      </h3>
                    </div>

                    <div className="mb-3 md:mb-4">
                      <p className="text-xs md:text-sm text-slate-300 mb-2">
                        {formatDate(history.lastUpdated)}
                      </p>
                      <div className="bg-black/20 rounded-lg p-2 md:p-3 border border-slate-500/20">
                        <p className="text-xs text-slate-100 leading-relaxed line-clamp-3 md:line-clamp-4">
                          {getContentPreview(history.content)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                        <span>选择次数: {history.history.filter(h => h.role === 'user').length}</span>
                        <span>字数: {history.content.length}</span>
                      </div>
                      <button className="btn-primary w-full group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 mobile-btn mobile-touch text-sm py-2">
                        继续阅读
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 确认清空对话框 */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-effect-dark rounded-xl md:rounded-2xl p-6 md:p-8 max-w-md w-full border border-red-500/30">
            <h3 className="text-xl font-bold text-white mb-4">确认清空历史记录</h3>
            <p className="text-slate-300 mb-6">此操作将删除所有历史记录，且无法恢复。确定要继续吗？</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 glass-effect text-slate-200 hover:text-white rounded-lg transition-all duration-300 border border-slate-500/30 hover:border-slate-400/50"
              >
                取消
              </button>
              <button
                onClick={handleClearHistories}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-300"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryScreen;
