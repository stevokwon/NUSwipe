import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import JobSwipePage from './frontend/Jobswipepage.jsx';
import LoginPage from './pages/LoginPage.jsx';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/jobs" element={<JobSwipePage />} />
      </Routes>
    </Router>
  );
}
