export const styles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes confetti {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  @keyframes pulse-subtle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.1); }
    50% { box-shadow: 0 0 40px rgba(255,255,255,0.2); }
  }
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(-15px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-out {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-15px); }
  }
  @keyframes pop-in {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-fade-in {
    animation: fade-in 0.4s ease-out both;
  }
  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }
  .animate-slide-up {
    animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .animate-slide-in {
    animation: slide-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }
  .animate-slide-out {
    animation: slide-out 0.25s ease-in forwards;
  }
  .animate-pop-in {
    animation: pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    opacity: 0;
    transform: scale(0.8);
  }
  .animate-confetti {
    animation: confetti 2s ease-out forwards;
  }
  .animate-pulse-subtle {
    animation: pulse-subtle 2s ease-in-out infinite;
  }
  .animate-bounce-subtle {
    animation: bounce-subtle 1s ease-in-out infinite;
  }
  .animate-glow {
    animation: glow 2s ease-in-out infinite;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;
