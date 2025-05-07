import { useState } from "react";
import MyScene from "./components/Scene";
import "./App.css";

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
  {
    name: "Portal Traveling",
    path: "/models/portal_traveling.glb",
    scale: 1.2,
  },
];

function App() {
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const currentModel = models[currentModelIndex];

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "3%",
          transform: "translateX(-50%)",
          zIndex: 1,
          display: "flex",
          gap: "12px",
        }}
      >
        {models.map((model, index) => (
          <button
            key={model.path}
            onClick={() => setCurrentModelIndex(index)}
            style={{
              padding: "10px 22px",
              cursor: "pointer",
              background:
                currentModel.path === model.path
                  ? "linear-gradient(90deg, #222 0%, #000 100%)"
                  : "#FFF",
              color: currentModel.path === model.path ? "#fff" : "#222",
              border: "none",
              borderRadius: "999px",
              fontWeight: 600,
              fontSize: "0.875rem",
              boxShadow:
                currentModel.path === model.path
                  ? "0 2px 12px rgba(0,0,0,0.18)"
                  : "0 1px 4px rgba(0,0,0,0.06)",
              outline:
                currentModel.path === model.path ? "2px solid #000" : "none",
              transition: "all 0.18s cubic-bezier(.4,2,.6,1)",
              transform:
                currentModel.path === model.path ? "scale(1.07)" : "scale(1)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.09)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.transform =
                currentModel.path === model.path ? "scale(1.07)" : "scale(1)")
            }
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.98)")
            }
            onMouseUp={(e) =>
              (e.currentTarget.style.transform =
                currentModel.path === model.path
                  ? "scale(1.07)"
                  : "scale(1.09)")
            }
          >
            {model.name}
          </button>
        ))}
      </div>
      <MyScene
        currentModelPath={currentModel.path}
        currentModelScale={currentModel.scale}
      />
    </>
  );
}

export default App;
