import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AdminResources from "./pages/AdminResources";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<AdminResources />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;