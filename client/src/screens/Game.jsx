import React, { useEffect, useRef } from 'react';

function Game() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Load ZIM.js dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/zimjs/15.3.0/zim.min.js';
    script.async = true;
    
    script.onload = () => {
      // ZIM is now available on the window object
      const { Frame, Rectangle } = window.zim;
      
      // Create the ZIM Frame
      const frame = new Frame({
        canvas: canvasRef.current,
        scaling: "fit",
        width: 800,
        height: 600,
        color: "#EEE",
      });

      frame.on("ready", () => {
        const stage = frame.stage;
        
        // Add a green rectangle using ZIM
        const rect = new Rectangle(150, 150, "green")
          .pos(10, 10)
          .addTo(stage);
          
        // Add a blue circle for variety
        const circle = new window.zim.Circle(75, "blue")
          .pos(200, 200)
          .addTo(stage);
          
        // Add some interactivity
        rect.on("click", () => {
          rect.animate({
            props: { x: Math.random() * 600, y: Math.random() * 400 },
            time: 1000,
            ease: "backOut"
          });
        });
        
        circle.on("click", () => {
          circle.animate({
            props: { scaleX: 1.5, scaleY: 1.5 },
            time: 500,
            ease: "elasticOut",
            rewind: true
          });
        });
        
        stage.update();
      });
    };

    // Add script to head
    document.head.appendChild(script);

    // Cleanup function to remove script when component unmounts
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        backgroundColor: "#ccc",
      }}
    >
      <h2 style={{ marginBottom: "20px", color: "#333" }}>
        ZIM.js with React - Click the shapes!
      </h2>
      <canvas ref={canvasRef} id="canvas" />
    </div>
  );
}

export default Game;
