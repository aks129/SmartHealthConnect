// Import React and ReactDOM using a more traditional approach
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

// Simple test component
const TestApp = () => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#0070f3' }}>Healthcare Records App</h1>
      <p>This is a simple test to see if React is rendering correctly.</p>
      <button 
        style={{ 
          background: '#0070f3', 
          color: 'white', 
          border: 'none', 
          padding: '10px 20px', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Test Button
      </button>
    </div>
  );
};

// Use older ReactDOM render method which might be more compatible
ReactDOM.render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>,
  document.getElementById("root")
);
