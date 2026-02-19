import axios from "axios";

function App() {

  const handleClick = async () => {
    try {
      await axios.post("http://localhost:5000/api/test");
      await axios.post("http://localhost:8000/ai/test");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <button
        onClick={handleClick}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700"
      >
        Click Me
      </button>
    </div>
  );
}

export default App;
