/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Info, ChevronRight, Hand, Brain, LayoutGrid } from 'lucide-react';
import { Card, Suit, Rank, GameState, GameStatus } from './types';
import { createDeck, SUITS, SUIT_COLORS, SUIT_SYMBOLS, isPlayable, shuffle } from './constants';

const CARD_WIDTH = 100;
const CARD_HEIGHT = 140;

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    playerHand: [],
    aiHand: [],
    discardPile: [],
    currentSuit: 'hearts',
    currentRank: 'A',
    turn: 'player',
    status: 'home',
    winner: null,
  });

  const [message, setMessage] = useState<string>("欢迎来到 Elsa 疯狂 8 点！");
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Initialize Game
  const initGame = useCallback(() => {
    const fullDeck = createDeck();
    const pHand = fullDeck.splice(0, 8);
    const aHand = fullDeck.splice(0, 8);
    
    // Ensure first discard is not an 8 for simplicity, or handle it
    let firstDiscard = fullDeck.pop()!;
    while (firstDiscard.rank === '8') {
      fullDeck.unshift(firstDiscard);
      shuffle(fullDeck);
      firstDiscard = fullDeck.pop()!;
    }

    setGameState({
      deck: fullDeck,
      playerHand: pHand,
      aiHand: aHand,
      discardPile: [firstDiscard],
      currentSuit: firstDiscard.suit,
      currentRank: firstDiscard.rank,
      turn: 'player',
      status: 'playing',
      winner: null,
    });
    setMessage("轮到你了！请出相同花色或点数的牌。");
  }, []);

  useEffect(() => {
    if (gameState.status === 'waiting') {
      initGame();
    }
  }, [gameState.status, initGame]);

  // Check for winner
  useEffect(() => {
    if (gameState.status === 'playing' || gameState.status === 'ai_turn') {
      if (gameState.playerHand.length === 0) {
        setGameState(prev => ({ ...prev, status: 'game_over', winner: 'player' }));
        setMessage("恭喜！你赢了！");
      } else if (gameState.aiHand.length === 0) {
        setGameState(prev => ({ ...prev, status: 'game_over', winner: 'ai' }));
        setMessage("AI 赢了！下次好运。");
      }
    }
  }, [gameState.playerHand.length, gameState.aiHand.length, gameState.status]);

  // AI Logic
  useEffect(() => {
    if (gameState.status === 'ai_turn' && gameState.turn === 'ai') {
      const timer = setTimeout(() => {
        const playableCards = gameState.aiHand.filter(c => isPlayable(c, gameState.currentSuit, gameState.currentRank));
        
        if (playableCards.length > 0) {
          // AI Strategy: Play an 8 if it has one, otherwise pick a random playable card
          const eightCard = playableCards.find(c => c.rank === '8');
          const cardToPlay = eightCard || playableCards[Math.floor(Math.random() * playableCards.length)];
          
          playCard(cardToPlay, 'ai');
        } else {
          // AI must draw
          drawCard('ai');
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.turn, gameState.aiHand, gameState.currentSuit, gameState.currentRank]);

  const playCard = (card: Card, actor: 'player' | 'ai') => {
    if (card.rank === '8') {
      if (actor === 'player') {
        setGameState(prev => ({
          ...prev,
          status: 'player_choosing_suit',
          playerHand: prev.playerHand.filter(c => c.id !== card.id),
          discardPile: [...prev.discardPile, card],
        }));
        setMessage("疯狂 8 点！请选择一个新花色。");
      } else {
        // AI chooses suit based on what it has most of
        const suitCounts: Record<Suit, number> = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
        gameState.aiHand.forEach(c => {
          if (c.id !== card.id) suitCounts[c.suit]++;
        });
        const bestSuit = (Object.keys(suitCounts) as Suit[]).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b);
        
        setGameState(prev => ({
          ...prev,
          aiHand: prev.aiHand.filter(c => c.id !== card.id),
          discardPile: [...prev.discardPile, card],
          currentSuit: bestSuit,
          currentRank: card.rank,
          turn: 'player',
          status: 'playing'
        }));
        const suitNames = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
        setMessage(`AI 打出了 8 并选择了 ${suitNames[bestSuit]}！`);
        setLastAction(`AI 打出了 ${suitNames[card.suit]} 8`);
      }
    } else {
      setGameState(prev => ({
        ...prev,
        [actor === 'player' ? 'playerHand' : 'aiHand']: prev[actor === 'player' ? 'playerHand' : 'aiHand'].filter(c => c.id !== card.id),
        discardPile: [...prev.discardPile, card],
        currentSuit: card.suit,
        currentRank: card.rank,
        turn: actor === 'player' ? 'ai' : 'player',
        status: actor === 'player' ? 'ai_turn' : 'playing'
      }));
      
      const suitNames = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
      if (actor === 'player') {
        setMessage("AI 正在思考...");
        setLastAction(`你打出了 ${suitNames[card.suit]} ${card.rank}`);
      } else {
        setMessage("轮到你了！");
        setLastAction(`AI 打出了 ${suitNames[card.suit]} ${card.rank}`);
      }
    }
  };

  const drawCard = (actor: 'player' | 'ai') => {
    if (gameState.deck.length === 0) {
      // If deck is empty, skip turn
      setGameState(prev => ({
        ...prev,
        turn: actor === 'player' ? 'ai' : 'player',
        status: actor === 'player' ? 'ai_turn' : 'playing'
      }));
      setMessage(`牌堆已空！${actor === 'player' ? '你的' : "AI 的"}回合被跳过。`);
      return;
    }

    const newDeck = [...gameState.deck];
    const drawnCard = newDeck.pop()!;

    setGameState(prev => ({
      ...prev,
      deck: newDeck,
      [actor === 'player' ? 'playerHand' : 'aiHand']: [...prev[actor === 'player' ? 'playerHand' : 'aiHand'], drawnCard],
      turn: actor === 'player' ? 'ai' : 'player',
      status: actor === 'player' ? 'ai_turn' : 'playing'
    }));

    if (actor === 'player') {
      setMessage("你摸了一张牌。轮到 AI 了。");
      setLastAction("你摸了一张牌");
    } else {
      setMessage("AI 摸了一张牌。轮到你了。");
      setLastAction("AI 摸了一张牌");
    }
  };

  const handleSuitSelection = (suit: Suit) => {
    setGameState(prev => ({
      ...prev,
      currentSuit: suit,
      turn: 'ai',
      status: 'ai_turn'
    }));
    const suitNames = { hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' };
    setMessage(`你选择了 ${suitNames[suit]}。轮到 AI 了。`);
  };

  const canPlayerDraw = gameState.turn === 'player' && gameState.status === 'playing';

  return (
    <div className="min-h-screen bg-[#35654d] text-white font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center border-b border-white/10 bg-black/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
            <LayoutGrid className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Elsa 疯狂 8 点</h1>
            <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-semibold opacity-80">经典纸牌游戏</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-white/40">剩余牌数</span>
            <span className="font-mono text-sm">{gameState.deck.length} 张</span>
          </div>
          <button 
            onClick={() => setGameState(prev => ({ ...prev, status: 'waiting' }))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="重新开始"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col justify-between py-6 px-4 overflow-hidden relative">
        
        {/* AI Hand Section */}
        <div className="flex flex-col items-center relative pt-4">
          <div className="flex -space-x-12 hover:-space-x-4 transition-all duration-300 mb-8">
            {gameState.aiHand.map((card) => (
              <motion.div
                key={card.id}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-16 h-24 md:w-24 md:h-32 bg-slate-800 rounded-lg border-2 border-slate-700 shadow-xl flex items-center justify-center overflow-hidden shrink-0"
              >
                <img 
                  src="https://picsum.photos/seed/draco-malfoy/200/300" 
                  alt="Draco Malfoy"
                  className="w-full h-full object-cover opacity-80"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            ))}
          </div>
          <div className="absolute bottom-2 bg-black/40 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-white/10 flex items-center gap-2 backdrop-blur-sm">
            <Brain size={12} className="text-emerald-400" />
            AI 对手 ({gameState.aiHand.length})
          </div>
        </div>

        {/* Center Table Section */}
        <div className="flex flex-col items-center justify-center gap-8 my-4">
          <div className="flex flex-row items-center justify-center gap-8 md:gap-24">
            {/* Draw Pile */}
            <div className="relative group">
              <button
                onClick={() => canPlayerDraw && drawCard('player')}
                disabled={!canPlayerDraw}
                className={`w-20 h-28 md:w-28 md:h-40 bg-slate-800 rounded-xl border-2 border-slate-700 shadow-2xl transition-all duration-300 transform ${canPlayerDraw ? 'hover:-translate-y-2 cursor-pointer active:scale-95' : 'opacity-50 cursor-not-allowed'} overflow-hidden`}
              >
                <img 
                  src="https://picsum.photos/seed/draco-malfoy/200/300" 
                  alt="Draco Malfoy"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl md:text-2xl font-bold text-white/40 drop-shadow-lg">摸牌</span>
                </div>
                {/* Stack effect */}
                <div className="absolute -bottom-1 -right-1 w-full h-full bg-slate-800 rounded-xl border-2 border-slate-700 -z-10" />
              </button>
              <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-white/40">
                摸牌堆
              </div>
            </div>

            {/* Discard Pile */}
            <div className="relative">
              <AnimatePresence mode="popLayout">
                {gameState.discardPile.slice(-1).map((card) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    className="w-20 h-28 md:w-28 md:h-40 bg-white rounded-xl border-2 border-white/20 shadow-2xl flex flex-col p-2 text-slate-900"
                  >
                    <div className={`text-lg md:text-xl font-bold leading-none ${SUIT_COLORS[card.suit]}`}>
                      {card.rank}
                    </div>
                    <div className={`text-base md:text-lg ${SUIT_COLORS[card.suit]}`}>
                      {SUIT_SYMBOLS[card.suit]}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <span className={`text-4xl md:text-5xl ${SUIT_COLORS[card.suit]}`}>
                        {SUIT_SYMBOLS[card.suit]}
                      </span>
                    </div>
                    <div className={`text-lg md:text-xl font-bold leading-none self-end rotate-180 ${SUIT_COLORS[card.suit]}`}>
                      {card.rank}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-white/40">
                弃牌堆
              </div>
            </div>
          </div>

          {/* Current Suit Indicator */}
          <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
            <span className="text-[10px] uppercase tracking-widest text-white/60">当前花色:</span>
            <span className={`text-lg md:text-xl font-bold ${SUIT_COLORS[gameState.currentSuit]}`}>
              {SUIT_SYMBOLS[gameState.currentSuit]} {{ hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' }[gameState.currentSuit]}
            </span>
          </div>
        </div>

        {/* Player Hand Section */}
        <div className="flex flex-col items-center relative pb-4">
          <div className="absolute -top-8 bg-black/40 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest border border-white/10 flex items-center gap-2 backdrop-blur-sm z-10">
            <Hand size={12} className="text-blue-400" />
            你的手牌 ({gameState.playerHand.length})
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-5xl overflow-y-auto max-h-[30vh] p-2">
            {gameState.playerHand.map((card) => {
              const playable = gameState.turn === 'player' && gameState.status === 'playing' && isPlayable(card, gameState.currentSuit, gameState.currentRank);
              return (
                <motion.button
                  key={card.id}
                  layout
                  onClick={() => playable && playCard(card, 'player')}
                  disabled={!playable}
                  whileHover={playable ? { y: -10, scale: 1.05 } : {}}
                  className={`w-16 h-24 md:w-24 md:h-32 bg-white rounded-lg border-2 shadow-xl flex flex-col p-1.5 text-slate-900 transition-all duration-200 shrink-0 ${playable ? 'cursor-pointer border-emerald-400 ring-4 ring-emerald-400/20' : 'opacity-60 grayscale-[0.5] border-transparent'}`}
                >
                  <div className={`text-xs md:text-sm font-bold leading-none ${SUIT_COLORS[card.suit]}`}>
                    {card.rank}
                  </div>
                  <div className={`text-[10px] md:text-xs ${SUIT_COLORS[card.suit]}`}>
                    {SUIT_SYMBOLS[card.suit]}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className={`text-2xl md:text-3xl ${SUIT_COLORS[card.suit]}`}>
                      {SUIT_SYMBOLS[card.suit]}
                    </span>
                  </div>
                  <div className={`text-xs md:text-sm font-bold leading-none self-end rotate-180 ${SUIT_COLORS[card.suit]}`}>
                    {card.rank}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="p-4 bg-black/40 backdrop-blur-md border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full animate-pulse ${gameState.turn === 'player' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          <p className="text-sm font-medium tracking-wide text-white/90">
            {message}
          </p>
        </div>
        
        {lastAction && (
          <div className="px-4 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-0.5">最后动作</p>
            <p className="text-xs font-mono text-emerald-400">{lastAction}</p>
          </div>
        )}
      </footer>

      {/* Overlays */}
      <AnimatePresence>
        {/* Home Screen Overlay */}
        {gameState.status === 'home' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#35654d] p-4"
          >
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
            </div>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-2xl w-full text-center z-10"
            >
              <motion.div 
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block mb-8"
              >
                <div className="flex -space-x-8">
                  <div className="w-24 h-36 bg-white rounded-xl border-2 border-white/20 shadow-2xl flex flex-col p-2 text-slate-900 -rotate-12">
                    <div className="text-xl font-bold leading-none text-red-500">8</div>
                    <div className="text-lg text-red-500">♥</div>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-5xl text-red-500">♥</span>
                    </div>
                  </div>
                  <div className="w-24 h-36 bg-slate-800 rounded-xl border-2 border-slate-700 shadow-2xl flex flex-col overflow-hidden z-20 scale-110">
                    <img 
                      src="https://picsum.photos/seed/draco-malfoy/200/300" 
                      alt="Draco Malfoy"
                      className="w-full h-full object-cover opacity-90"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="w-24 h-36 bg-white rounded-xl border-2 border-white/20 shadow-2xl flex flex-col p-2 text-slate-900 rotate-12 z-10">
                    <div className="text-xl font-bold leading-none text-slate-800">8</div>
                    <div className="text-lg text-slate-800">♠</div>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-5xl text-slate-800">♠</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 text-white drop-shadow-2xl">
                疯狂 <span className="text-emerald-400">8</span> 点
              </h1>
              <p className="text-xl text-emerald-100/60 mb-12 max-w-lg mx-auto font-medium">
                经典的纸牌策略游戏。最先出完手中所有牌的人获胜！
              </p>

              <div className="flex flex-col gap-4 items-center">
                <button
                  onClick={() => setGameState(prev => ({ ...prev, status: 'waiting' }))}
                  className="group relative px-12 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center gap-4"
                >
                  <LayoutGrid size={28} />
                  开始游戏
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="mt-8 grid grid-cols-3 gap-8 text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">
                  <div className="flex flex-col gap-2">
                    <span className="text-emerald-400 text-lg">8</span>
                    万能牌
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-emerald-400 text-lg">AI</span>
                    智能对手
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-emerald-400 text-lg">52</span>
                    张标准牌
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Suit Picker Modal */}
        {gameState.status === 'player_choosing_suit' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-center mb-2">疯狂 8 点！</h2>
              <p className="text-white/60 text-center mb-8 text-sm">选择一个新花色以继续游戏。</p>
              
              <div className="grid grid-cols-2 gap-4">
                {SUITS.map((suit) => (
                  <button
                    key={suit}
                    onClick={() => handleSuitSelection(suit)}
                    className="group relative flex flex-col items-center gap-2 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-emerald-500/50 transition-all duration-300"
                  >
                    <span className={`text-4xl transition-transform group-hover:scale-125 ${SUIT_COLORS[suit]}`}>
                      {SUIT_SYMBOLS[suit]}
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold opacity-60 group-hover:opacity-100">
                      {{ hearts: '红心', diamonds: '方块', clubs: '梅花', spades: '黑桃' }[suit]}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Game Over Modal */}
        {gameState.status === 'game_over' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="bg-slate-900 border-2 border-emerald-500/30 rounded-[2rem] p-12 max-w-lg w-full shadow-[0_0_50px_rgba(16,185,129,0.1)] text-center relative overflow-hidden"
            >
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              
              <div className="mb-6 inline-flex p-4 bg-emerald-500/10 rounded-full">
                <Trophy size={48} className={gameState.winner === 'player' ? 'text-yellow-400' : 'text-slate-400'} />
              </div>
              
              <h2 className="text-4xl font-black tracking-tight mb-4">
                {gameState.winner === 'player' ? '胜利！' : '失败'}
              </h2>
              
              <p className="text-white/60 mb-10 text-lg">
                {gameState.winner === 'player' 
                  ? "你成功出完了所有牌，战胜了 AI！" 
                  : "AI 这次更快。想再试一次吗？"}
              </p>
              
              <button
                onClick={() => setGameState(prev => ({ ...prev, status: 'waiting' }))}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <RotateCcw size={20} />
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')]" />
      </div>
    </div>
  );
}
