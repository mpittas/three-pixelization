import { useState, useEffect } from "react";
import MyScene from "./components/Scene";
import "./App.css";

// Define a CSS class for the spinner within a <style> tag or App.css
// For this example, I'll add it directly here for simplicity, but App.css is better.
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .loader-spinner {
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top: 4px solid #fff;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
  }
`;

const models = [
  { name: "Plant", path: "/models/plant.glb", scale: 1 },
  { name: "Silent Ash", path: "/models/silent_ash.glb", scale: 1 },
  {
    name: "Ancient Greek Bakery",
    path: "/models/dae_villages__ancient_greek_bakery.glb",
    scale: 1.1,
  },
  {
    name: "Little Hermit Crab",
    path: "/models/little_hermit_crab.glb",
    scale: 1,
  },
];

function App() {
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const currentModel = models[currentModelIndex];
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(true); // For initial load and subsequent loads

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set loading to true when the model path changes
  useEffect(() => {
    setIsLoading(true);
  }, [currentModel.path]);

  const handleSetCurrentModelIndex = (index: number) => {
    setCurrentModelIndex(index);
  };

  const loadNextModel = () => {
    setCurrentModelIndex((prevIndex) => (prevIndex + 1) % models.length);
  };

  const handleModelLoaded = () => {
    setIsLoading(false);
  };

  return (
    <>
      <style>{globalStyles}</style> {/* Injecting global styles here */}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.6)", // Slightly less opaque
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            color: "white",
            fontSize: "1.2em", // Adjusted font size for message
            backdropFilter: "blur(4px)", // Slightly less blur
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div className="loader-spinner"></div>
          <div>Loading model...</div>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "3%",
          transform: "translateX(-50%)",
          zIndex: 1,
          display: "flex",
          gap: "10px", // Slightly reduced gap
          flexWrap: "wrap",
          justifyContent: "center",
          padding: "10px", // Add some padding around buttons
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Modern font stack
        }}
      >
        {isMobile ? (
          <button
            onClick={loadNextModel}
            style={{
              padding: "12px 25px", // Slightly larger padding
              cursor: "pointer",
              background: "linear-gradient(145deg, #333 0%, #111 100%)", // Darker gradient
              color: "#fff",
              border: "none",
              borderRadius: "30px", // More rounded
              fontWeight: 500, // Adjusted weight
              fontSize: "0.9rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.2)", // Softer, more pronounced shadow
              outline: "none", // Remove default outline
              transition: "all 0.2s ease-in-out",
              transform: "scale(1)", // Base scale
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.25)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
            }}
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.95)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          >
            Load next model
          </button>
        ) : (
          models.map((model, index) => (
            <button
              key={model.path}
              onClick={() => handleSetCurrentModelIndex(index)}
              style={{
                padding: "12px 25px",
                cursor: "pointer",
                background:
                  currentModel.path === model.path
                    ? "linear-gradient(145deg, #444 0%, #222 100%)" // Adjusted active gradient
                    : "#f0f0f0", // Lighter inactive background
                color: currentModel.path === model.path ? "#fff" : "#333",
                border: "1px solid transparent", // Ensure border consistent for layout
                borderColor: currentModel.path === model.path ? "#555" : "#ddd", // Subtle border
                borderRadius: "30px",
                fontWeight: 500,
                fontSize: "0.9rem",
                boxShadow:
                  currentModel.path === model.path
                    ? "0 4px 15px rgba(0,0,0,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.1)",
                outline: "none",
                transition: "all 0.2s ease-in-out",
                transform:
                  currentModel.path === model.path ? "scale(1.05)" : "scale(1)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  currentModel.path === model.path
                    ? "0 6px 20px rgba(0,0,0,0.3)"
                    : "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform =
                  currentModel.path === model.path ? "scale(1.05)" : "scale(1)";
                e.currentTarget.style.boxShadow =
                  currentModel.path === model.path
                    ? "0 4px 15px rgba(0,0,0,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.1)";
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform =
                  currentModel.path === model.path
                    ? "scale(1.0)"
                    : "scale(0.95)")
              }
              onMouseUp={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
            >
              {model.name}
            </button>
          ))
        )}
      </div>
      <MyScene
        currentModelPath={currentModel.path}
        currentModelScale={currentModel.scale}
        onModelLoaded={handleModelLoaded}
      />
    </>
  );
}

export default App;
