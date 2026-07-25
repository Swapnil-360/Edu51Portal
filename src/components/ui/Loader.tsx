import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="loader-square"></div>
        <div className="loader-square"></div>
        <div className="loader-square"></div>
      </div>
      <style>{`
        .loader-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          padding: 2rem 0;
        }
        .loader {
          display: flex;
          gap: 8px;
          justify-content: center;
          align-items: center;
          height: 60px;
        }
        .loader-square {
          width: 22px;
          height: 22px;
          background-color: rgb(0, 247, 255);
          border-radius: 4px;
          box-shadow: 0 0 12px rgba(4, 136, 252, 0.8);
          animation: scaleBounce 1.2s infinite ease-in-out;
          position: relative;
        }
        .loader-square::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 247, 255, 0.5);
          border-radius: 50%;
          opacity: 0;
          transform: scale(1);
          animation: splash 1.2s infinite ease-in-out;
        }
        .loader-square:nth-child(1) {
          animation-delay: -0.4s;
        }
        .loader-square:nth-child(2) {
          animation-delay: -0.2s;
        }
        .loader-square:nth-child(3) {
          animation-delay: 0s;
        }
        @keyframes scaleBounce {
          0%, 80%, 100% {
            transform: scale(0.5);
            opacity: 0.6;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
        @keyframes splash {
          0% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0;
            transform: scale(2);
          }
          100% {
            opacity: 0;
            transform: scale(2.5);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;
